from __future__ import annotations

import base64
import json
import random
import shutil
import tempfile
import time
import uuid
from pathlib import Path

import httpx
import pyttsx3
from fastapi import FastAPI, File, Form, HTTPException, UploadFile, Request
from father.runtime.core.trace import (
    get_trace_id,
    new_trace_id,
    set_trace_id,
    text_fingerprint,
    trace_event,
)
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from father.runtime.providers import gigachat

from father.runtime.core.registry import FatherRegistry


ROOT = Path(__file__).resolve().parents[4]

OUTPUT_ROOT = ROOT / "runtime-data" / "outputs"
IMAGE_DIR = OUTPUT_ROOT / "images"
AUDIO_DIR = OUTPUT_ROOT / "audio"

IMAGE_DIR.mkdir(parents=True, exist_ok=True)
AUDIO_DIR.mkdir(parents=True, exist_ok=True)

OLLAMA_URL = "http://127.0.0.1:11434"
COMFYUI_URL = "http://127.0.0.1:8188"

DEFAULT_LLM = "qwen3-vl:8b-instruct-q4_K_M"

MAX_VISION_IMAGE_BYTES = 10 * 1024 * 1024

DEFAULT_CHECKPOINT = (
    "realvisxlV50_v50LightningBakedvae.safetensors"
)


app = FastAPI(
    title="FATHER Runtime API",
    version="0.1.0",
)


# DEV configuration.
# Later we will restrict this to the site's exact origin.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.mount(
    "/artifacts",
    StaticFiles(directory=str(OUTPUT_ROOT)),
    name="artifacts",
)


class ChatRequest(BaseModel):
    message: str
    agent: str = "alina"



class StreamChatRequest(BaseModel):
    agent: str = "alina"
    message: str
    provider: str = "auto"
    profile: str = "fast"

class SpeakRequest(BaseModel):
    text: str


class ImageRequest(BaseModel):
    prompt: str
    negative_prompt: str = (
        "low quality, blurry, distorted, artifacts"
    )
    width: int = 1024
    height: int = 1024
    checkpoint: str = DEFAULT_CHECKPOINT


def service_alive(url: str) -> bool:
    try:
        response = httpx.get(
            url,
            timeout=2.0,
        )
        return response.status_code < 500
    except Exception:
        return False



@app.middleware("http")
async def father_trace_middleware(
    request: Request,
    call_next,
):
    trace_id = new_trace_id(
        request.headers.get(
            "X-Trace-ID"
        )
    )

    set_trace_id(trace_id)

    started = time.perf_counter()

    trace_event(
        "http.request.start",
        "start",
        trace_id=trace_id,
        method=request.method,
        path=request.url.path,
    )

    try:
        response = await call_next(
            request
        )

    except Exception as exc:
        duration_ms = round(
            (
                time.perf_counter()
                - started
            )
            * 1000,
            2,
        )

        trace_event(
            "http.request.error",
            "error",
            trace_id=trace_id,
            method=request.method,
            path=request.url.path,
            duration_ms=duration_ms,
            error_type=type(exc).__name__,
            error=str(exc),
        )

        raise

    duration_ms = round(
        (
            time.perf_counter()
            - started
        )
        * 1000,
        2,
    )

    response.headers[
        "X-Trace-ID"
    ] = trace_id

    trace_event(
        "http.request.end",
        (
            "ok"
            if response.status_code < 400
            else "error"
        ),
        trace_id=trace_id,
        method=request.method,
        path=request.url.path,
        http_status=response.status_code,
        duration_ms=duration_ms,
    )

    return response


@app.get("/")
def root():
    return {
        "name": "FATHER Runtime",
        "version": "0.1.0",
        "status": "ready",
    }






def contains_cyrillic(text: str) -> bool:
    return any(
        "\u0400" <= char <= "\u04FF"
        for char in text
    )


def contains_cjk(text: str) -> bool:
    return any(
        "\u4E00" <= char <= "\u9FFF"
        for char in text
    )


def language_instruction(text: str) -> str:
    if contains_cyrillic(text):
        return (
            "The user's message is in Russian. "
            "Reply ONLY in Russian using Cyrillic. "
            "Do not answer in Chinese or English unless "
            "the user explicitly asks for another language."
        )

    return (
        "Reply in the same language as the user's message."
    )


@app.get("/api/father/runtime-info")
def runtime_info():
    return {
        "status": "ready",
        "assistant": "ALINA",
        "platform": "FATHER AI",
        "runtime": "FATHER Runtime",
        "provider": "ollama",
        "model": DEFAULT_LLM,
        "mode": "local",
    }


@app.get("/api/father/health")
def health():
    registry = FatherRegistry()

    try:
        import faster_whisper  # noqa
        stt_ready = True
    except Exception:
        stt_ready = False

    try:
        import pyttsx3  # noqa
        tts_ready = True
    except Exception:
        tts_ready = False

    return {
        "father": "ready",
        "gpu": "configured",
        "services": {
            "llm": {
                "status": (
                    "ready"
                    if service_alive(
                        f"{OLLAMA_URL}/api/tags"
                    )
                    else "stopped"
                ),
                "provider": "ollama",
                "model": DEFAULT_LLM,
            },
            "stt": {
                "status": (
                    "ready"
                    if stt_ready
                    else "not_installed"
                ),
                "provider": "faster-whisper",
                "model": "small",
            },
            "tts": {
                "status": (
                    "ready"
                    if tts_ready
                    else "not_installed"
                ),
                "provider": "pyttsx3",
            },
            "image": {
                "status": (
                    "ready"
                    if service_alive(
                        f"{COMFYUI_URL}/system_stats"
                    )
                    else "stopped"
                ),
                "provider": "comfyui",
                "checkpoint": DEFAULT_CHECKPOINT,
            },
        },
        "registered_models": list(
            registry.models.get(
                "models",
                {}
            ).keys()
        ),
    }


@app.get("/api/father/zoo")
def zoo():
    result = {
        "ollama": [],
        "comfyui": [],
    }

    try:
        response = httpx.get(
            f"{OLLAMA_URL}/api/tags",
            timeout=5,
        )
        response.raise_for_status()

        result["ollama"] = [
            model.get("name")
            for model in response.json().get(
                "models",
                []
            )
        ]

    except Exception as exc:
        result["ollama_error"] = str(exc)

    try:
        response = httpx.get(
            f"{COMFYUI_URL}/object_info/"
            "CheckpointLoaderSimple",
            timeout=5,
        )
        response.raise_for_status()

        data = response.json()

        ckpt = (
            data
            .get("CheckpointLoaderSimple", {})
            .get("input", {})
            .get("required", {})
            .get("ckpt_name", [])
        )

        if ckpt and isinstance(ckpt[0], list):
            result["comfyui"] = ckpt[0]

    except Exception as exc:
        result["comfyui_error"] = str(exc)

    return result


@app.post("/api/father/chat")
def chat(request: ChatRequest):
    russian_request = contains_cyrillic(
        request.message
    )

    language_rule = language_instruction(
        request.message
    )

    system_prompt = (
        "You are ALINA, the assistant interface "
        "of the local FATHER AI platform. "
        f"{language_rule} "
        "Do not invent model names, runtime versions, "
        "providers, or infrastructure details. "
        "Technical runtime metadata is supplied "
        "authoritatively by FATHER Runtime."
    )

    payload = {
        "model": DEFAULT_LLM,
        "stream": False,
        "messages": [
            {
                "role": "system",
                "content": system_prompt,
            },
            {
                "role": "user",
                "content": request.message,
            },
        ],
    }

    try:
        response = httpx.post(
            f"{OLLAMA_URL}/api/chat",
            json=payload,
            timeout=180,
        )

        response.raise_for_status()

        data = response.json()

        answer = (
            data
            .get("message", {})
            .get("content", "")
        )

        language_retry = False

        if russian_request and contains_cjk(answer):
            language_retry = True

            retry_payload = {
                "model": DEFAULT_LLM,
                "stream": False,
                "messages": [
                    {
                        "role": "system",
                        "content": (
                            "You are ALINA inside FATHER AI. "
                            "STRICT LANGUAGE REQUIREMENT: "
                            "The user wrote in Russian. "
                            "Reply ONLY in Russian Cyrillic. "
                            "Do not use Chinese characters. "
                            "Do not identify or guess the "
                            "underlying model or runtime."
                        ),
                    },
                    {
                        "role": "user",
                        "content": request.message,
                    },
                ],
            }

            retry_response = httpx.post(
                f"{OLLAMA_URL}/api/chat",
                json=retry_payload,
                timeout=180,
            )

            retry_response.raise_for_status()

            retry_data = retry_response.json()

            retry_answer = (
                retry_data
                .get("message", {})
                .get("content", "")
            )

            if retry_answer:
                answer = retry_answer

        if russian_request and contains_cjk(answer):
            raise HTTPException(
                status_code=502,
                detail=(
                    "Language guard rejected the model "
                    "response after one retry."
                ),
            )

        return {
            "status": "completed",
            "agent": request.agent,
            "provider": "ollama",
            "runtime": "FATHER Runtime",
            "mode": "local",
            "model": DEFAULT_LLM,
            "language_guard": {
                "russian_request": russian_request,
                "retry": language_retry,
            },
            "answer": answer,
        }

    except HTTPException:
        raise

    except Exception as exc:
        raise HTTPException(
            status_code=503,
            detail=f"Ollama error: {exc}",
        )




@app.post("/api/father/chat-stream")
def chat_stream(request: StreamChatRequest):
    language_rule = language_instruction(
        request.message
    )

    system_prompt = (
        "You are ALINA, the assistant interface "
        "of the FATHER AI platform. "
        f"{language_rule} "
        "Do not invent model names, runtime versions, "
        "providers, or infrastructure details. "
        "Technical metadata is controlled by "
        "FATHER Runtime."
    )

    def emit(payload):
        return (
            json.dumps(
                payload,
                ensure_ascii=False,
            )
            + "\n"
        )

    def generator():
        started = time.perf_counter()
        first_token_at = None
        provider_used = None
        model_used = None
        fallback = False

        requested_provider = (
            request.provider or "auto"
        ).lower()

        profile = (
            request.profile
            if request.profile in {"fast", "pro"}
            else "fast"
        )

        # ----------------------------------------------------
        # GigaChat first
        # ----------------------------------------------------

        if (
            requested_provider
            in {"auto", "gigachat"}
            and gigachat.is_configured()
        ):
            provider_used = "gigachat"
            model_used = (
                gigachat.model_for_profile(
                    profile
                )
            )

            yield emit({
                "type": "meta",
                "provider": provider_used,
                "model": model_used,
                "profile": profile,
                "mode": "cloud",
            })

            try:
                for token in gigachat.stream_chat(
                    request.message,
                    system_prompt,
                    profile=profile,
                ):
                    if first_token_at is None:
                        first_token_at = (
                            time.perf_counter()
                        )

                    yield emit({
                        "type": "token",
                        "content": token,
                    })

                finished = time.perf_counter()

                yield emit({
                    "type": "done",
                    "provider": provider_used,
                    "model": model_used,
                    "profile": profile,
                    "mode": "cloud",
                    "fallback": False,
                    "ttft_ms": (
                        round(
                            (
                                first_token_at
                                - started
                            )
                            * 1000
                        )
                        if first_token_at
                        else None
                    ),
                    "total_ms": round(
                        (finished - started)
                        * 1000
                    ),
                })

                return

            except Exception as exc:
                if requested_provider == "gigachat":
                    yield emit({
                        "type": "error",
                        "provider": "gigachat",
                        "message": str(exc),
                    })
                    return

                fallback = True

                yield emit({
                    "type": "fallback",
                    "from": "gigachat",
                    "to": "ollama",
                    "reason": str(exc),
                })

        # ----------------------------------------------------
        # Local Ollama fallback
        # ----------------------------------------------------

        provider_used = "ollama"
        model_used = DEFAULT_LLM

        yield emit({
            "type": "meta",
            "provider": provider_used,
            "model": model_used,
            "profile": "local",
            "mode": "local",
        })

        payload = {
            "model": DEFAULT_LLM,
            "stream": True,
            "messages": [
                {
                    "role": "system",
                    "content": system_prompt,
                },
                {
                    "role": "user",
                    "content": request.message,
                },
            ],
        }

        try:
            with httpx.stream(
                "POST",
                f"{OLLAMA_URL}/api/chat",
                json=payload,
                timeout=180,
            ) as response:

                response.raise_for_status()

                for line in response.iter_lines():
                    if not line:
                        continue

                    try:
                        data = json.loads(line)
                    except json.JSONDecodeError:
                        continue

                    token = (
                        data
                        .get("message", {})
                        .get("content", "")
                    )

                    if not token:
                        continue

                    if first_token_at is None:
                        first_token_at = (
                            time.perf_counter()
                        )

                    yield emit({
                        "type": "token",
                        "content": token,
                    })

            finished = time.perf_counter()

            yield emit({
                "type": "done",
                "provider": provider_used,
                "model": model_used,
                "profile": "local",
                "mode": "local",
                "fallback": fallback,
                "ttft_ms": (
                    round(
                        (
                            first_token_at
                            - started
                        )
                        * 1000
                    )
                    if first_token_at
                    else None
                ),
                "total_ms": round(
                    (finished - started)
                    * 1000
                ),
            })

        except Exception as exc:
            yield emit({
                "type": "error",
                "provider": "ollama",
                "message": str(exc),
            })

    return StreamingResponse(
        generator(),
        media_type=(
            "application/x-ndjson; "
            "charset=utf-8"
        ),
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )


@app.post("/api/father/analyze-image")
async def analyze_image(
    image: UploadFile = File(...),
    prompt: str = Form(
        "Analyze the image in detail. "
        "Describe visible objects, readable text, "
        "structure, anomalies, and important details. "
        "Do not invent details that are not visible."
    ),
):
    content_type = image.content_type or ""

    if not content_type.startswith("image/"):
        raise HTTPException(
            status_code=400,
            detail="Uploaded file is not an image.",
        )

    raw = await image.read()

    if not raw:
        raise HTTPException(
            status_code=400,
            detail="Uploaded image is empty.",
        )

    if len(raw) > MAX_VISION_IMAGE_BYTES:
        raise HTTPException(
            status_code=413,
            detail="Image is larger than 10 MB.",
        )

    encoded = base64.b64encode(raw).decode("ascii")

    payload = {
        "model": DEFAULT_LLM,
        "stream": False,
        "messages": [
            {
                "role": "system",
                "content": (
                    "You are ALINA Vision running inside "
                    "the local FATHER AI platform. "
                    "Analyze the supplied image carefully. "
                    "Answer in the user's language. "
                    "Do not invent details that are not visible."
                ),
            },
            {
                "role": "user",
                "content": prompt,
                "images": [encoded],
            },
        ],
    }

    try:
        response = httpx.post(
            f"{OLLAMA_URL}/api/chat",
            json=payload,
            timeout=180,
        )

        response.raise_for_status()

        data = response.json()

        answer = (
            data
            .get("message", {})
            .get("content", "")
        )

        return {
            "status": "completed",
            "agent": "alina-vision",
            "provider": "ollama",
            "model": DEFAULT_LLM,
            "answer": answer,
        }

    except Exception as exc:
        raise HTTPException(
            status_code=503,
            detail=f"Vision model error: {exc}",
        )


@app.post("/api/father/speak")
def speak(request: SpeakRequest):

    filename = (
        f"alina-{uuid.uuid4().hex}.wav"
    )

    path = AUDIO_DIR / filename

    try:
        engine = pyttsx3.init()

        engine.save_to_file(
            request.text,
            str(path),
        )

        engine.runAndWait()
        engine.stop()

        return {
            "status": "completed",
            "provider": "pyttsx3",
            "url": (
                f"/artifacts/audio/{filename}"
            ),
        }

    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"TTS error: {exc}",
        )


_whisper_model = None


def get_whisper():
    global _whisper_model

    if _whisper_model is None:
        from faster_whisper import WhisperModel

        _whisper_model = WhisperModel(
            "small",
            device="cpu",
            compute_type="int8",
        )

    return _whisper_model


@app.post("/api/father/transcribe")
async def transcribe(
    audio: UploadFile = File(...),
):

    suffix = (
        Path(audio.filename or "audio.wav").suffix
        or ".wav"
    )

    tmp_path = None

    try:
        with tempfile.NamedTemporaryFile(
            delete=False,
            suffix=suffix,
        ) as tmp:

            shutil.copyfileobj(
                audio.file,
                tmp,
            )

            tmp_path = Path(tmp.name)

        model = get_whisper()

        segments, info = model.transcribe(
            str(tmp_path),
            language="ru",
            vad_filter=True,
        )

        text = " ".join(
            segment.text.strip()
            for segment in segments
        ).strip()

        return {
            "status": "completed",
            "provider": "faster-whisper",
            "model": "small",
            "text": text,
            "language": info.language,
        }

    finally:
        if (
            tmp_path is not None
            and tmp_path.exists()
        ):
            tmp_path.unlink(
                missing_ok=True
            )


def comfy_workflow(request: ImageRequest):

    lightning = (
        "lightning"
        in request.checkpoint.lower()
    )

    steps = 8 if lightning else 20
    cfg = 2.0 if lightning else 7.0

    return {
        "4": {
            "class_type": "CheckpointLoaderSimple",
            "inputs": {
                "ckpt_name": request.checkpoint,
            },
        },

        "5": {
            "class_type": "EmptyLatentImage",
            "inputs": {
                "width": request.width,
                "height": request.height,
                "batch_size": 1,
            },
        },

        "6": {
            "class_type": "CLIPTextEncode",
            "inputs": {
                "text": request.prompt,
                "clip": ["4", 1],
            },
        },

        "7": {
            "class_type": "CLIPTextEncode",
            "inputs": {
                "text": request.negative_prompt,
                "clip": ["4", 1],
            },
        },

        "3": {
            "class_type": "KSampler",
            "inputs": {
                "seed": random.randint(
                    1,
                    2**63 - 1,
                ),
                "steps": steps,
                "cfg": cfg,
                "sampler_name": "euler",
                "scheduler": "normal",
                "denoise": 1.0,
                "model": ["4", 0],
                "positive": ["6", 0],
                "negative": ["7", 0],
                "latent_image": ["5", 0],
            },
        },

        "8": {
            "class_type": "VAEDecode",
            "inputs": {
                "samples": ["3", 0],
                "vae": ["4", 2],
            },
        },

        "9": {
            "class_type": "SaveImage",
            "inputs": {
                "filename_prefix": "FATHER",
                "images": ["8", 0],
            },
        },
    }


@app.post("/api/father/image")
def generate_image(request: ImageRequest):

    trace_event(
        "image.request",
        "start",
        prompt_chars=len(request.prompt),
        prompt_sha256=text_fingerprint(request.prompt),
        width=request.width,
        height=request.height,
        checkpoint=request.checkpoint,
    )

    try:
        response = httpx.post(
            f"{COMFYUI_URL}/prompt",
            json={
                "prompt": comfy_workflow(
                    request
                ),
                "client_id": "father-runtime",
            },
            timeout=15,
        )

        response.raise_for_status()

        prompt_id = response.json()[
            "prompt_id"
        ]

        trace_event(
            "comfy.submit",
            "ok",
            prompt_id=prompt_id,
            checkpoint=request.checkpoint,
        )

    except Exception as exc:
        trace_event(
            "comfy.submit.error",
            "error",
            error_type=type(exc).__name__,
            error=str(exc),
        )

        raise HTTPException(
            status_code=503,
            detail=f"ComfyUI submit error: {exc}",
        )

    deadline = time.time() + 600

    image_info = None

    while time.time() < deadline:

        try:
            history = httpx.get(
                f"{COMFYUI_URL}/history/"
                f"{prompt_id}",
                timeout=10,
            )

            history.raise_for_status()

            item = (
                history.json()
                .get(prompt_id)
            )

            if item:
                outputs = item.get(
                    "outputs",
                    {}
                )

                images = (
                    outputs
                    .get("9", {})
                    .get("images", [])
                )

                if images:
                    image_info = images[0]

                    trace_event(
                        "comfy.history.ready",
                        "ok",
                        prompt_id=prompt_id,
                        comfy_filename=(
                            image_info.get(
                                "filename"
                            )
                        ),
                    )

                    break

        except Exception:
            pass

        time.sleep(1)

    if not image_info:
        trace_event(
            "comfy.history.timeout",
            "error",
            prompt_id=prompt_id,
        )

        raise HTTPException(
            status_code=504,
            detail="ComfyUI generation timeout",
        )

    try:
        image_response = httpx.get(
            f"{COMFYUI_URL}/view",
            params={
                "filename": (
                    image_info["filename"]
                ),
                "subfolder": (
                    image_info.get(
                        "subfolder",
                        "",
                    )
                ),
                "type": image_info.get(
                    "type",
                    "output",
                ),
            },
            timeout=30,
        )

        image_response.raise_for_status()

        filename = (
            f"father-{uuid.uuid4().hex}.png"
        )

        output = IMAGE_DIR / filename

        output.write_bytes(
            image_response.content
        )


        trace_event(
            "artifact.saved",
            "ok",
            prompt_id=prompt_id,
            artifact_file=filename,
            artifact_bytes=len(
                image_response.content
            ),
            artifact_url=(
                f"/artifacts/images/{filename}"
            ),
        )

        trace_event(
            "image.completed",
            "ok",
            prompt_id=prompt_id,
            checkpoint=request.checkpoint,
            artifact_file=filename,
        )

        return {
            "status": "completed",
            "trace_id": get_trace_id(),
            "provider": "comfyui",
            "checkpoint": request.checkpoint,
            "prompt_id": prompt_id,
            "url": (
                f"/artifacts/images/{filename}"
            ),
        }

    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail=f"Image retrieval error: {exc}",
        )
