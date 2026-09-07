from __future__ import annotations

import os
import re
import subprocess
import tempfile
import time
import uuid
from pathlib import Path
from typing import Annotated, Any

from fastapi import File, HTTPException, Request, UploadFile
from pydantic import BaseModel, Field

from .app import SAFE_STT_ERROR, SUPPORTED_AUDIO
from .model_router_resilient_app import (
    AUTO_MODEL_ID,
    _failure_snapshot,
    _model_catalog,
    _ensure_model_loaded,
    app,
    write_trace,
)


class UiTraceEvent(BaseModel):
    event: str = Field(min_length=1, max_length=120)
    source: str = Field(default="browser", max_length=80)
    data: dict[str, Any] = Field(default_factory=dict)


def _safe_trace_data(value: Any, key: str = "") -> Any:
    """Keep UI trace metadata useful without accepting secrets or manuscript text."""
    if re.search(r"token|key|secret|password|authorization|prompt|manuscript|text", key, re.I):
        return "[REDACTED]"
    if isinstance(value, str):
        return value[:300]
    if isinstance(value, bool) or value is None or isinstance(value, (int, float)):
        return value
    if isinstance(value, list):
        return [_safe_trace_data(item) for item in value[:20]]
    if isinstance(value, dict):
        return {str(k)[:80]: _safe_trace_data(v, str(k)) for k, v in list(value.items())[:30]}
    return str(value)[:300]


# Replace endpoints that need stronger observability / long-form behavior.
app.router.routes[:] = [
    route
    for route in app.router.routes
    if not (
        (
            getattr(route, "path", None) == "/api/models/switch"
            and "POST" in getattr(route, "methods", set())
        )
        or (
            getattr(route, "path", None) == "/api/stt/transcribe"
            and "POST" in getattr(route, "methods", set())
        )
    )
]


@app.post("/api/models/switch")
async def observed_switch_model(request: Request) -> dict[str, str]:
    request_id = request.headers.get("x-request-id", "").strip()[:80] or uuid.uuid4().hex
    try:
        payload = await request.json()
    except ValueError as error:
        raise HTTPException(status_code=422, detail="Ожидался JSON-запрос.") from error

    model_key = str(payload.get("model", "")).strip()
    if not model_key or model_key == AUTO_MODEL_ID:
        raise HTTPException(status_code=422, detail="Для ручного переключения укажите конкретную модель.")

    catalog = await _model_catalog()
    available = [str(item["key"]) for item in catalog]
    if model_key not in available:
        write_trace(
            "llm.switch.error",
            request_id=request_id,
            target_model=model_key[:160],
            category="model-not-found",
            detail="Выбранная модель отсутствует в LM Studio.",
        )
        raise HTTPException(status_code=409, detail="Выбранная модель отсутствует в LM Studio.")

    loaded_before = [
        str(item["key"])
        for item in catalog
        if item.get("loaded_instances")
    ]
    write_trace(
        "llm.switch.request",
        request_id=request_id,
        target_model=model_key[:160],
        loaded_before=loaded_before[:20],
    )

    try:
        runtime = await _ensure_model_loaded(model_key, request_id)
    except HTTPException as error:
        write_trace(
            "llm.switch.error",
            request_id=request_id,
            target_model=model_key[:160],
            category="load-failed",
            status_code=error.status_code,
            detail=str(error.detail)[:300],
        )
        raise
    except Exception as error:
        write_trace(
            "llm.switch.error",
            request_id=request_id,
            target_model=model_key[:160],
            category=type(error).__name__,
            detail=str(error)[:300],
        )
        raise

    write_trace(
        "llm.switch.ready",
        request_id=request_id,
        target_model=model_key[:160],
        instance_id=runtime["instance_id"][:160],
        runtime_state=runtime["state"],
    )
    return {
        "status": "ready",
        "model": model_key,
        "instance_id": runtime["instance_id"],
        "state": runtime["state"],
    }


def _story_audio_limit_bytes() -> int:
    try:
        configured = int(os.getenv("BOOKCRAFT_MAX_STORY_AUDIO_MB", "500"))
    except ValueError:
        configured = 500
    return max(25, min(configured, 2048)) * 1024 * 1024


def _story_stt_timeout_seconds() -> int:
    try:
        configured = int(os.getenv("BOOKCRAFT_STT_TIMEOUT_SECONDS", "7200"))
    except ValueError:
        configured = 7200
    return max(300, min(configured, 21600))


def _transcribe_long_audio(audio_path: Path) -> str:
    """Use the proven whisper.cpp baseline, but allow long story recordings."""
    executable = os.getenv("WHISPER_CPP_EXE", "").strip()
    model = os.getenv("WHISPER_MODEL_PATH", "").strip()
    if not executable or not model:
        raise RuntimeError("Local STT is not configured")
    if not Path(executable).is_file():
        raise RuntimeError("Whisper executable not found")
    if not Path(model).is_file():
        raise RuntimeError("Whisper model not found")

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
        encoding="utf-8",
        errors="replace",
        timeout=_story_stt_timeout_seconds(),
        check=False,
    )
    transcript_file = Path(f"{output_base}.txt")
    if completed.returncode != 0 or not transcript_file.is_file():
        raise RuntimeError("whisper.cpp failed")
    return transcript_file.read_text(encoding="utf-8").strip()


@app.post("/api/stt/transcribe")
async def observed_long_audio_transcription(
    request: Request,
    audio: Annotated[UploadFile, File()],
) -> dict[str, object]:
    """Transcribe short dictation or a long MP3 story without loading it all into RAM."""
    request_id = request.headers.get("x-request-id", "").strip()[:80] or uuid.uuid4().hex
    if audio.content_type and audio.content_type not in SUPPORTED_AUDIO:
        raise HTTPException(status_code=415, detail="Поддерживаются MP3, WAV, M4A, OGG и WebM.")

    suffix = Path(audio.filename or "voice.webm").suffix.lower() or ".webm"
    max_bytes = _story_audio_limit_bytes()
    max_mb = max_bytes // (1024 * 1024)
    started = time.perf_counter()
    total_bytes = 0

    try:
        with tempfile.TemporaryDirectory(prefix="bookcraft-stt-") as directory:
            audio_path = Path(directory) / f"voice{suffix}"
            with audio_path.open("wb") as output:
                while True:
                    chunk = await audio.read(1024 * 1024)
                    if not chunk:
                        break
                    total_bytes += len(chunk)
                    if total_bytes > max_bytes:
                        raise HTTPException(
                            status_code=413,
                            detail=f"Аудиофайл больше {max_mb} МБ. Увеличьте BOOKCRAFT_MAX_STORY_AUDIO_MB при необходимости.",
                        )
                    output.write(chunk)

            if total_bytes == 0:
                raise HTTPException(status_code=422, detail="Аудиофайл пуст.")

            write_trace(
                "stt.transcribe.start",
                request_id=request_id,
                content_type=audio.content_type or "unknown",
                size_bytes=total_bytes,
                long_form=total_bytes > 25 * 1024 * 1024,
                max_story_audio_mb=max_mb,
            )
            transcript = _transcribe_long_audio(audio_path).strip()
    except HTTPException:
        raise
    except subprocess.TimeoutExpired as error:
        write_trace(
            "stt.transcribe.error",
            request_id=request_id,
            category="timeout",
            size_bytes=total_bytes,
        )
        raise HTTPException(
            status_code=504,
            detail="Распознавание длинного аудио превысило лимит времени. Можно увеличить BOOKCRAFT_STT_TIMEOUT_SECONDS.",
        ) from error
    except (OSError, RuntimeError, subprocess.SubprocessError) as error:
        write_trace(
            "stt.transcribe.error",
            request_id=request_id,
            category=type(error).__name__,
            size_bytes=total_bytes,
        )
        raise HTTPException(status_code=422, detail=SAFE_STT_ERROR) from error

    if not transcript:
        raise HTTPException(status_code=422, detail=SAFE_STT_ERROR)

    duration_ms = round((time.perf_counter() - started) * 1000)
    write_trace(
        "stt.transcribe.finish",
        request_id=request_id,
        duration_ms=duration_ms,
        transcript_length=len(transcript),
        size_bytes=total_bytes,
        long_form=total_bytes > 25 * 1024 * 1024,
    )
    return {
        "transcription": transcript,
        "duration_ms": duration_ms,
        "size_bytes": total_bytes,
        "long_form": total_bytes > 25 * 1024 * 1024,
    }


@app.post("/api/trace/ui-event")
async def browser_trace_event(payload: UiTraceEvent, request: Request) -> dict[str, str]:
    request_id = request.headers.get("x-request-id", "").strip()[:80] or uuid.uuid4().hex
    event_name = re.sub(r"[^a-zA-Z0-9_.-]", "-", payload.event.strip())[:120]
    safe_data = _safe_trace_data(payload.data)
    write_trace(
        f"ui.{event_name}",
        request_id=request_id,
        source=payload.source[:80],
        **(safe_data if isinstance(safe_data, dict) else {"value": safe_data}),
    )
    return {"status": "recorded", "request_id": request_id}


@app.get("/api/observability/state")
async def observability_state() -> dict[str, object]:
    catalog = await _model_catalog()
    return {
        "loaded_models": [
            {
                "id": str(item["key"]),
                "display_name": str(item.get("display_name") or item["key"]),
                "instances": [
                    str(instance.get("id"))
                    for instance in item.get("loaded_instances", [])
                    if isinstance(instance, dict) and instance.get("id")
                ],
            }
            for item in catalog
            if item.get("loaded_instances")
        ],
        "quarantined_models": _failure_snapshot(),
    }
