from __future__ import annotations

import random
import shutil
import tempfile
import time
import uuid
from pathlib import Path

import httpx
import pyttsx3
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

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


@app.get("/")
def root():
    return {
        "name": "FATHER Runtime",
        "version": "0.1.0",
        "status": "ready",
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

    payload = {
        "model": DEFAULT_LLM,
        "stream": False,
        "messages": [
            {
                "role": "system",
                "content": (
                    "You are ALINA running inside "
                    "the local FATHER AI platform. "
                    "Answer in the user's language."
                ),
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

        return {
            "status": "completed",
            "agent": request.agent,
            "model": DEFAULT_LLM,
            "answer": (
                data
                .get("message", {})
                .get("content", "")
            ),
        }

    except Exception as exc:
        raise HTTPException(
            status_code=503,
            detail=f"Ollama error: {exc}",
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

    except Exception as exc:
        raise HTTPException(
            status_code=503,
            detail=f"ComfyUI submit error: {exc}",
        )

    deadline = time.time() + 240

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
                    break

        except Exception:
            pass

        time.sleep(1)

    if not image_info:
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

        return {
            "status": "completed",
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
