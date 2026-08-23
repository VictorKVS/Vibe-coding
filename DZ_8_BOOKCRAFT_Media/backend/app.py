from __future__ import annotations

import base64
import json
import os
import re
import subprocess
import tempfile
from pathlib import Path
from typing import Annotated

import httpx
from fastapi import FastAPI, File, Form, Header, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI(title="BOOK.CRAFT Media Gateway", version="0.1.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://127.0.0.1:5173", "http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

SAFE_STT_ERROR = (
    "Не удалось распознать голосовой запрос. "
    "Попробуйте ещё раз или отправьте запрос текстом."
)
SUPPORTED_AUDIO = {
    "audio/mpeg", "audio/mp3", "audio/wav", "audio/x-wav",
    "audio/ogg", "audio/webm", "audio/mp4", "audio/x-m4a",
}
MAX_AUDIO_BYTES = 25 * 1024 * 1024


class ArtRequest(BaseModel):
    prompt: str
    model: str = "GigaChat"
    filename: str = "bookcraft-illustration.jpg"


class ArtResponse(BaseModel):
    image_data_url: str
    mime_type: str
    filename: str
    prompt: str


class Health(BaseModel):
    status: str
    stt: str
    model_roots: list[str]


def model_roots() -> list[Path]:
    configured = os.getenv("BOOKCRAFT_MODEL_ROOTS", "")
    candidates = [Path(item.strip()) for item in configured.split(os.pathsep) if item.strip()]
    if not candidates:
        user = Path.home()
        candidates = [
            user / ".lmstudio" / "models",
            user / ".cache" / "lm-studio" / "models",
            user / ".cache" / "huggingface" / "hub",
        ]
    return candidates


def scan_local_models() -> list[dict[str, object]]:
    models: list[dict[str, object]] = []
    for root in model_roots():
        if not root.is_dir():
            continue
        for path in root.rglob("*.gguf"):
            try:
                size = path.stat().st_size
            except OSError:
                continue
            models.append({
                "id": str(path),
                "name": path.stem,
                "format": "GGUF",
                "size_gb": round(size / 1024**3, 2),
                "root": str(root),
            })
    return sorted(models, key=lambda item: str(item["name"]).lower())


def transcribe_with_whisper_cpp(audio_path: Path) -> str:
    executable = os.getenv("WHISPER_CPP_EXE", "").strip()
    model = os.getenv("WHISPER_MODEL_PATH", "").strip()
    if not executable or not model:
        raise RuntimeError("Local STT is not configured")

    output_base = audio_path.with_suffix("")
    command = [
        executable,
        "-m", model,
        "-f", str(audio_path),
        "-l", "ru",
        "-otxt",
        "-of", str(output_base),
    ]
    completed = subprocess.run(
        command,
        capture_output=True,
        text=True,
        timeout=300,
        check=False,
    )
    transcript_file = Path(f"{output_base}.txt")
    if completed.returncode != 0 or not transcript_file.is_file():
        raise RuntimeError("whisper.cpp failed")
    return transcript_file.read_text(encoding="utf-8").strip()


@app.get("/api/health", response_model=Health)
def health() -> Health:
    stt_ready = bool(os.getenv("WHISPER_CPP_EXE") and os.getenv("WHISPER_MODEL_PATH"))
    return Health(
        status="ok",
        stt="ready" if stt_ready else "configuration-required",
        model_roots=[str(path) for path in model_roots()],
    )


@app.get("/api/models")
def list_models() -> dict[str, object]:
    models = scan_local_models()
    return {"count": len(models), "models": models}


@app.post("/api/chat")
async def chat(
    session_id: Annotated[str, Form()],
    user_message: Annotated[str, Form()] = "",
    history: Annotated[str, Form()] = "[]",
    image: Annotated[UploadFile | None, File()] = None,
    audio: Annotated[UploadFile | None, File()] = None,
) -> dict[str, object]:
    message = user_message.strip()
    transcription: str | None = None

    try:
        parsed_history = json.loads(history)
    except json.JSONDecodeError as error:
        raise HTTPException(status_code=422, detail="Поле history должно содержать JSON.") from error

    if not isinstance(parsed_history, list):
        raise HTTPException(status_code=422, detail="Поле history должно содержать список.")

    if not message and audio is not None:
        if audio.content_type and audio.content_type not in SUPPORTED_AUDIO:
            raise HTTPException(status_code=415, detail="Этот формат аудио не поддерживается.")

        suffix = Path(audio.filename or "voice.webm").suffix or ".webm"
        data = await audio.read(MAX_AUDIO_BYTES + 1)
        if len(data) > MAX_AUDIO_BYTES:
            raise HTTPException(status_code=413, detail="Аудиофайл больше 25 МБ.")

        try:
            with tempfile.TemporaryDirectory(prefix="bookcraft-stt-") as directory:
                audio_path = Path(directory) / f"voice{suffix}"
                audio_path.write_bytes(data)
                transcription = transcribe_with_whisper_cpp(audio_path)
        except (OSError, RuntimeError, subprocess.SubprocessError):
            raise HTTPException(status_code=422, detail=SAFE_STT_ERROR)

        if not transcription.strip():
            raise HTTPException(status_code=422, detail=SAFE_STT_ERROR)
        message = transcription.strip()

    if not message:
        raise HTTPException(
            status_code=422,
            detail="Введите текст или прикрепите голосовой запрос.",
        )

    # Единая точка продолжения: сюда подключается существующий BOOK.CRAFT
    # Model Gateway. Текст и расшифровка обрабатываются одинаково.
    return {
        "session_id": session_id,
        "user_message": message,
        "transcription": transcription,
        "history_items": len(parsed_history),
        "image_attached": image is not None,
        "status": "accepted",
    }


def _extract_gigachat_image_id(message: str) -> str | None:
    match = re.search(r'<img[^>]+src=["\']([^"\']+)["\']', message, flags=re.IGNORECASE)
    return match.group(1) if match else None


def _gigachat_verify_setting() -> bool | str:
    ca_bundle = os.getenv("GIGACHAT_CA_BUNDLE", "").strip()
    return ca_bundle if ca_bundle else True


@app.post("/api/art/generate", response_model=ArtResponse)
async def generate_art(
    payload: ArtRequest,
    authorization: Annotated[str | None, Header()] = None,
) -> ArtResponse:
    prompt = payload.prompt.strip()
    if not prompt:
        raise HTTPException(status_code=422, detail="Арт-промпт не должен быть пустым.")

    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(
            status_code=401,
            detail="Вставьте временный access token GigaChat.",
        )

    access_token = authorization.split(" ", 1)[1].strip()
    if not access_token:
        raise HTTPException(status_code=401, detail="Access token GigaChat пуст.")

    headers = {
        "Authorization": f"Bearer {access_token}",
        "Accept": "application/json",
    }
    request_body = {
        "model": payload.model,
        "messages": [
            {
                "role": "system",
                "content": (
                    "Ты художник-иллюстратор BOOK.CRAFT. Создай один выразительный "
                    "кинематографичный кадр строго по описанию, без текста и водяных знаков."
                ),
            },
            {"role": "user", "content": f"Нарисуй иллюстрацию: {prompt}"},
        ],
        "function_call": "auto",
    }

    timeout = httpx.Timeout(210.0, connect=30.0)
    try:
        async with httpx.AsyncClient(
            base_url="https://api.giga.chat",
            timeout=timeout,
            verify=_gigachat_verify_setting(),
            follow_redirects=True,
        ) as client:
            completion = await client.post(
                "/v1/chat/completions",
                headers={**headers, "Content-Type": "application/json"},
                json=request_body,
            )
            if completion.status_code == 401:
                raise HTTPException(
                    status_code=401,
                    detail="Access token GigaChat недействителен или истёк.",
                )
            if completion.status_code == 429:
                raise HTTPException(
                    status_code=429,
                    detail="Лимит GigaChat временно исчерпан. Повторите позже.",
                )
            if not completion.is_success:
                raise HTTPException(
                    status_code=502,
                    detail=f"GigaChat Image вернул ошибку {completion.status_code}.",
                )

            result = completion.json()
            message = result.get("choices", [{}])[0].get("message", {}).get("content", "")
            image_id = _extract_gigachat_image_id(message)
            if not image_id:
                raise HTTPException(
                    status_code=502,
                    detail="GigaChat не вернул идентификатор изображения.",
                )

            image_response = await client.get(
                f"/v1/files/{image_id}/content",
                headers={**headers, "Accept": "image/jpeg"},
            )
            if not image_response.is_success:
                raise HTTPException(
                    status_code=502,
                    detail=f"Не удалось скачать изображение ({image_response.status_code}).",
                )
    except HTTPException:
        raise
    except httpx.TimeoutException as error:
        raise HTTPException(
            status_code=504,
            detail="GigaChat создаёт изображение слишком долго. Повторите запрос.",
        ) from error
    except httpx.HTTPError as error:
        raise HTTPException(
            status_code=502,
            detail="Не удалось установить защищённое соединение с GigaChat.",
        ) from error

    mime_type = image_response.headers.get("content-type", "image/jpeg").split(";")[0]
    encoded = base64.b64encode(image_response.content).decode("ascii")
    safe_name = Path(payload.filename).name or "bookcraft-illustration.jpg"
    return ArtResponse(
        image_data_url=f"data:{mime_type};base64,{encoded}",
        mime_type=mime_type,
        filename=safe_name,
        prompt=prompt,
    )
