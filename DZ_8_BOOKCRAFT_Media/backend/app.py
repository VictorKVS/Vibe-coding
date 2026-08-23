from __future__ import annotations

import base64
import json
import os
import re
import subprocess
import tempfile
import time
import uuid
from datetime import UTC, datetime
from pathlib import Path
from typing import Annotated

import httpx
from fastapi import FastAPI, File, Form, Header, HTTPException, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
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


LM_STUDIO_BASE_URL = os.getenv("BOOKCRAFT_LLM_BASE_URL", "http://127.0.0.1:1234").rstrip("/")
TRACE_ROOT = Path(os.getenv("BOOKCRAFT_TRACE_ROOT", Path(__file__).resolve().parents[1] / ".runtime" / "traces"))
RUN_ID = os.getenv("BOOKCRAFT_RUN_ID", f"gateway-{uuid.uuid4().hex[:12]}")


def write_trace(event: str, *, request_id: str | None = None, **data: object) -> None:
    """Append metadata-only trace events. Prompts, manuscripts and secrets are never accepted."""
    TRACE_ROOT.mkdir(parents=True, exist_ok=True)
    record = {
        "timestamp": datetime.now(UTC).isoformat(),
        "run_id": RUN_ID,
        "request_id": request_id,
        "component": "media-gateway",
        "event": event,
        **data,
    }
    trace_file = TRACE_ROOT / f"gateway-{datetime.now(UTC):%Y%m%d}.jsonl"
    with trace_file.open("a", encoding="utf-8") as stream:
        stream.write(json.dumps(record, ensure_ascii=False, separators=(",", ":")) + "\n")


@app.middleware("http")
async def trace_http_request(request: Request, call_next):
    request_id = request.headers.get("x-request-id", "").strip()[:80] or uuid.uuid4().hex
    started = time.perf_counter()
    write_trace("http.request.start", request_id=request_id, method=request.method, path=request.url.path)
    try:
        response = await call_next(request)
    except Exception as error:
        write_trace(
            "http.request.exception",
            request_id=request_id,
            error_type=type(error).__name__,
            duration_ms=round((time.perf_counter() - started) * 1000),
        )
        raise
    response.headers["X-Request-ID"] = request_id
    write_trace(
        "http.request.finish",
        request_id=request_id,
        status_code=response.status_code,
        duration_ms=round((time.perf_counter() - started) * 1000),
    )
    return response


async def probe_lm_studio() -> dict[str, object]:
    """Return a user-facing readiness state without leaking credentials."""
    try:
        async with httpx.AsyncClient(timeout=3.0) as client:
            response = await client.get(f"{LM_STUDIO_BASE_URL}/v1/models")
    except httpx.ConnectError:
        return {
            "status": "server-stopped",
            "ready": False,
            "message": "LM Studio API не запущен. Включите Local Server на порту 1234.",
        }
    except httpx.TimeoutException:
        return {
            "status": "timeout",
            "ready": False,
            "message": "LM Studio API не ответил за 3 секунды.",
        }
    except httpx.HTTPError:
        return {
            "status": "unreachable",
            "ready": False,
            "message": "Не удалось проверить LM Studio API.",
        }

    if response.status_code == 401:
        return {
            "status": "authentication-required",
            "ready": False,
            "message": "В LM Studio включён Require Authentication, но BOOK.CRAFT не настроен на API-токен.",
        }
    if not response.is_success:
        return {
            "status": "http-error",
            "ready": False,
            "http_status": response.status_code,
            "message": f"LM Studio API вернул HTTP {response.status_code}.",
        }

    try:
        models = response.json().get("data", [])
    except (ValueError, AttributeError):
        models = []
    model_ids = [str(item.get("id")) for item in models if isinstance(item, dict) and item.get("id")]
    if not model_ids:
        return {
            "status": "model-not-loaded",
            "ready": False,
            "models": [],
            "message": "LM Studio работает, но ни одна модель не загружена.",
        }
    return {
        "status": "ready",
        "ready": True,
        "models": model_ids,
        "message": f"LM Studio готов. Загружено моделей: {len(model_ids)}.",
    }


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


@app.get("/api/readiness")
async def readiness() -> dict[str, object]:
    llm = await probe_lm_studio()
    return {
        "status": "ready" if llm.get("ready") else "degraded",
        "media_gateway": {"ready": True, "message": "Media Gateway готов."},
        "llm": llm,
    }


@app.post("/api/llm/chat/completions")
async def proxy_local_completion(request: Request) -> JSONResponse:
    request_id = request.headers.get("x-request-id", "").strip()[:80] or uuid.uuid4().hex
    try:
        payload = await request.json()
    except ValueError as error:
        raise HTTPException(status_code=422, detail="Запрос модели должен содержать JSON.") from error
    if not isinstance(payload, dict):
        raise HTTPException(status_code=422, detail="Некорректный формат запроса модели.")

    messages = payload.get("messages", [])
    write_trace(
        "llm.forward.start",
        request_id=request_id,
        model=str(payload.get("model", ""))[:160],
        message_count=len(messages) if isinstance(messages, list) else 0,
        max_tokens=payload.get("max_tokens"),
    )
    started = time.perf_counter()
    try:
        async with httpx.AsyncClient(timeout=httpx.Timeout(120.0, connect=5.0)) as client:
            response = await client.post(f"{LM_STUDIO_BASE_URL}/v1/chat/completions", json=payload)
    except httpx.ConnectError as error:
        write_trace("llm.forward.error", request_id=request_id, category="server-stopped")
        raise HTTPException(status_code=503, detail="LM Studio Local Server не запущен на порту 1234.") from error
    except httpx.TimeoutException as error:
        write_trace("llm.forward.error", request_id=request_id, category="timeout")
        raise HTTPException(status_code=504, detail="Локальная модель не ответила за 120 секунд.") from error

    duration_ms = round((time.perf_counter() - started) * 1000)
    if response.status_code == 401:
        write_trace("llm.forward.error", request_id=request_id, category="authentication-required", duration_ms=duration_ms)
        raise HTTPException(status_code=401, detail="В LM Studio включён Require Authentication.")
    if not response.is_success:
        write_trace("llm.forward.error", request_id=request_id, category="model-http-error", upstream_status=response.status_code, duration_ms=duration_ms)
        raise HTTPException(status_code=502, detail=f"LM Studio вернул HTTP {response.status_code}.")

    write_trace("llm.forward.finish", request_id=request_id, upstream_status=response.status_code, duration_ms=duration_ms)
    return JSONResponse(content=response.json(), headers={"X-Request-ID": request_id})


@app.get("/api/trace/recent")
def recent_trace(limit: int = 100) -> dict[str, object]:
    safe_limit = max(1, min(limit, 500))
    trace_file = TRACE_ROOT / f"gateway-{datetime.now(UTC):%Y%m%d}.jsonl"
    if not trace_file.is_file():
        return {"run_id": RUN_ID, "events": []}
    lines = trace_file.read_text(encoding="utf-8").splitlines()[-safe_limit:]
    events = [json.loads(line) for line in lines if line.strip()]
    return {"run_id": RUN_ID, "events": events}


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


def _sanitize_diagnostic(value: object, key: str = "") -> object:
    if re.search(r"token|key|authorization|secret|password", key, flags=re.IGNORECASE):
        return "[REDACTED]"
    if isinstance(value, str):
        compact = value.strip()
        if re.fullmatch(r"(?:Bearer\\s+)?[A-Za-z0-9_.-]{24,}", compact, flags=re.IGNORECASE):
            return "[REDACTED]"
        return value[:1000]
    if isinstance(value, list):
        return [_sanitize_diagnostic(item) for item in value[-500:]]
    if isinstance(value, dict):
        return {
            str(item_key)[:100]: _sanitize_diagnostic(item_value, str(item_key))
            for item_key, item_value in list(value.items())[:100]
        }
    if value is None or isinstance(value, (bool, int, float)):
        return value
    return str(value)[:500]


@app.post("/api/diagnostics/github")
def submit_diagnostics(payload: dict[str, object]) -> dict[str, str]:
    """Create a redacted GitHub Issue using the locally authenticated GitHub CLI."""
    sanitized = _sanitize_diagnostic(payload)
    if not isinstance(sanitized, dict):
        raise HTTPException(status_code=422, detail="Некорректный диагностический пакет.")

    events = sanitized.get("events", [])
    if not isinstance(events, list):
        raise HTTPException(status_code=422, detail="В диагностике отсутствует список событий.")
    error_count = sum(
        1 for event in events
        if isinstance(event, dict) and event.get("level") == "error"
    )
    created_at = str(sanitized.get("createdAt", "unknown"))[:32]
    title = f"[BOOKCRAFT DIAGNOSTICS] {error_count} error(s) · {created_at}"
    report_json = json.dumps(sanitized, ensure_ascii=False, indent=2)
    if len(report_json) > 55000:
        sanitized["events"] = events[-180:]
        sanitized["truncated"] = True
        report_json = json.dumps(sanitized, ensure_ascii=False, indent=2)

    body = (
        "## BOOK·CRAFT MEDIA — автоматический диагностический отчёт\n\n"
        f"- Создан: `{created_at}`\n"
        f"- Событий: **{len(events)}**\n"
        f"- Ошибок: **{error_count}**\n"
        "- Секреты и содержимое рукописи исключены перед отправкой.\n\n"
        "<details><summary>Открыть JSON-трассировку</summary>\n\n"
        "```json\n"
        f"{report_json}\n"
        "```\n"
        "</details>\n"
    )

    repository = os.getenv("BOOKCRAFT_GITHUB_REPO", "VictorKVS/Vibe-coding").strip()
    temporary_path: Path | None = None
    try:
        with tempfile.NamedTemporaryFile(
            mode="w",
            encoding="utf-8",
            suffix=".md",
            prefix="bookcraft-diagnostics-",
            delete=False,
        ) as report_file:
            report_file.write(body)
            temporary_path = Path(report_file.name)

        completed = subprocess.run(
            [
                "gh", "issue", "create",
                "--repo", repository,
                "--title", title,
                "--body-file", str(temporary_path),
            ],
            capture_output=True,
            text=True,
            encoding="utf-8",
            errors="replace",
            timeout=45,
            check=False,
        )
    except FileNotFoundError as error:
        raise HTTPException(
            status_code=503,
            detail=(
                "GitHub CLI не найден. Установите gh, выполните gh auth login "
                "или скачайте журнал JSON и приложите его вручную."
            ),
        ) from error
    except subprocess.TimeoutExpired as error:
        raise HTTPException(
            status_code=504,
            detail="GitHub не ответил за 45 секунд. Скачайте журнал JSON и повторите позже.",
        ) from error
    finally:
        if temporary_path:
            temporary_path.unlink(missing_ok=True)

    if completed.returncode != 0:
        safe_error = (completed.stderr or completed.stdout or "неизвестная ошибка").strip()
        safe_error = re.sub(r"(gh[ops]_[A-Za-z0-9_]+)", "[REDACTED]", safe_error)
        raise HTTPException(
            status_code=503,
            detail=f"GitHub CLI не отправил отчёт: {safe_error[:400]}",
        )

    issue_url = completed.stdout.strip().splitlines()[-1]
    if not issue_url.startswith("https://github.com/"):
        raise HTTPException(status_code=502, detail="GitHub CLI не вернул ссылку на Issue.")
    return {"status": "sent", "issue_url": issue_url}


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
