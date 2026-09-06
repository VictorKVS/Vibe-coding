from __future__ import annotations

import json
import re
import time
import uuid
from typing import Any

import httpx
from fastapi import HTTPException, Request
from fastapi.responses import JSONResponse

from .app import LM_STUDIO_BASE_URL, app, write_trace

AUTO_MODEL_ID = "auto"


def _model_capabilities(model_id: str) -> set[str]:
    """Infer coarse capabilities from a model id without hard-coding exact filenames."""
    value = model_id.lower()
    capabilities = {"text"}
    if any(token in value for token in ("llava", "vision", "vl", "cogvlm", "minicpm-v")):
        capabilities.add("vision")
    if any(token in value for token in ("coder", "codestral", "deepseek-coder", "codeqwen")):
        capabilities.add("code")
    if any(token in value for token in ("qwen", "long", "1m", "128k")):
        capabilities.add("long-context")
    if any(token in value for token in ("gigachat", "mistral", "mythomax")):
        capabilities.add("prose")
    if "gigachat" in value:
        capabilities.add("russian")
    return capabilities


def _flatten_content(content: Any) -> tuple[str, bool]:
    if isinstance(content, str):
        return content, False
    if not isinstance(content, list):
        return "", False

    text_parts: list[str] = []
    has_image = False
    for item in content:
        if isinstance(item, str):
            text_parts.append(item)
            continue
        if not isinstance(item, dict):
            continue
        item_type = str(item.get("type", "")).lower()
        if item_type in {"image", "image_url", "input_image"} or "image_url" in item:
            has_image = True
        text = item.get("text")
        if isinstance(text, str):
            text_parts.append(text)
    return "\n".join(text_parts), has_image


def _request_features(messages: Any) -> dict[str, Any]:
    text_parts: list[str] = []
    has_image = False
    if isinstance(messages, list):
        for message in messages:
            if not isinstance(message, dict):
                continue
            text, item_has_image = _flatten_content(message.get("content"))
            if text:
                text_parts.append(text)
            has_image = has_image or item_has_image

    text = "\n".join(text_parts)
    lowered = text.lower()
    code_markers = (
        "```", "traceback", "exception", "function ", "class ", "def ",
        "javascript", "typescript", "python", "powershell", "sql", "api ",
        "endpoint", "regex", "docker", "github actions",
    )
    prose_markers = (
        "редакт", "литератур", "стиль", "сценар", "рассказ", "роман",
        "перепиши", "улучши текст", "диалог", "персонаж",
    )
    cyrillic = len(re.findall(r"[А-Яа-яЁё]", text))
    letters = len(re.findall(r"[A-Za-zА-Яа-яЁё]", text))
    return {
        "text": text,
        "has_image": has_image,
        "is_code": any(marker in lowered for marker in code_markers),
        "is_long": len(text) >= 12000,
        "is_prose": any(marker in lowered for marker in prose_markers),
        "is_russian": letters > 0 and cyrillic / letters >= 0.45,
    }


def choose_model(requested_model: str, messages: Any, available_models: list[str]) -> dict[str, str]:
    """Resolve manual or automatic model selection with an explainable reason."""
    available = [item for item in available_models if isinstance(item, str) and item.strip()]
    if not available:
        raise ValueError("no-models")

    requested = (requested_model or AUTO_MODEL_ID).strip()
    if requested and requested != AUTO_MODEL_ID:
        if requested not in available:
            raise ValueError("model-not-loaded")
        return {"model": requested, "mode": "manual", "reason": "Пользователь выбрал модель вручную."}

    features = _request_features(messages)
    scored: list[tuple[int, int, str, str]] = []
    for index, model_id in enumerate(available):
        caps = _model_capabilities(model_id)
        value = model_id.lower()
        score = 10
        reason = "Универсальная текстовая модель."

        if features["has_image"]:
            score = 120 if "vision" in caps else -100
            reason = "В запросе есть изображение; нужна vision-модель."
        elif features["is_code"]:
            score = 115 if "code" in caps else 25
            reason = "Запрос содержит код или технические маркеры."
        elif features["is_long"]:
            score = 110 if "long-context" in caps else 30
            reason = "Запрос длинный; приоритет модели с большим контекстом."
        elif features["is_prose"] and features["is_russian"]:
            score = 105 if "russian" in caps else 85 if "prose" in caps else 35
            reason = "Русский литературный/редакторский запрос."
        elif features["is_prose"]:
            score = 90 if "prose" in caps else 35
            reason = "Творческий или редакторский текст."
        else:
            if "mistral" in value:
                score = 80
                reason = "Обычный текстовый запрос; приоритет Mistral как быстрой универсальной модели."
            elif "qwen" in value:
                score = 72
                reason = "Обычный текстовый запрос; выбрана универсальная Qwen."
            elif "gigachat" in value and features["is_russian"]:
                score = 75
                reason = "Русский текстовый запрос; доступна GigaChat."
            elif "vision" in caps:
                score = 35

        scored.append((score, -index, model_id, reason))

    score, _, model_id, reason = max(scored, key=lambda item: (item[0], item[1]))
    if score < 0:
        raise ValueError("capability-not-loaded")
    return {"model": model_id, "mode": "auto", "reason": reason}


async def _fetch_loaded_models() -> list[str]:
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.get(f"{LM_STUDIO_BASE_URL}/v1/models")
    except httpx.ConnectError as error:
        raise HTTPException(status_code=503, detail="LM Studio Local Server не запущен на порту 1234.") from error
    except httpx.TimeoutException as error:
        raise HTTPException(status_code=504, detail="LM Studio не ответил при получении списка моделей.") from error

    if response.status_code == 401:
        raise HTTPException(status_code=401, detail="В LM Studio включён Require Authentication.")
    if not response.is_success:
        raise HTTPException(status_code=502, detail=f"LM Studio вернул HTTP {response.status_code} при получении моделей.")

    try:
        payload = response.json()
    except ValueError as error:
        raise HTTPException(status_code=502, detail="LM Studio вернул некорректный список моделей.") from error
    return [
        str(item.get("id")).strip()
        for item in payload.get("data", [])
        if isinstance(item, dict) and str(item.get("id", "")).strip()
    ]


# app.py already registers this endpoint. Remove only that route and replace it
# with the router-aware version; all other BOOK.CRAFT routes stay untouched.
app.router.routes[:] = [
    route
    for route in app.router.routes
    if not (getattr(route, "path", None) == "/api/llm/chat/completions" and "POST" in getattr(route, "methods", set()))
]


@app.get("/v1/models")
async def routed_model_catalog() -> dict[str, object]:
    """OpenAI-compatible discovery endpoint used by the existing Vite UI."""
    loaded = await _fetch_loaded_models()
    auto = {
        "id": AUTO_MODEL_ID,
        "object": "model",
        "owned_by": "bookcraft-router",
        "bookcraft": {"mode": "auto", "capabilities": ["routing"]},
    }
    models = [auto]
    for model_id in loaded:
        models.append({
            "id": model_id,
            "object": "model",
            "owned_by": "lm-studio",
            "bookcraft": {"capabilities": sorted(_model_capabilities(model_id))},
        })
    return {"object": "list", "data": models}


@app.post("/api/models/route")
async def preview_model_route(request: Request) -> dict[str, str]:
    """Explain which loaded model AUTO would choose without running inference."""
    try:
        payload = await request.json()
    except ValueError as error:
        raise HTTPException(status_code=422, detail="Ожидался JSON-запрос.") from error
    loaded = await _fetch_loaded_models()
    try:
        return choose_model(str(payload.get("model", AUTO_MODEL_ID)), payload.get("messages", []), loaded)
    except ValueError as error:
        code = str(error)
        if code == "model-not-loaded":
            raise HTTPException(status_code=409, detail="Выбранная модель сейчас не загружена в LM Studio.") from error
        if code == "capability-not-loaded":
            raise HTTPException(status_code=409, detail="Для этого запроса не загружена подходящая модель.") from error
        raise HTTPException(status_code=503, detail="В LM Studio не загружено ни одной модели.") from error


@app.post("/api/llm/chat/completions")
async def routed_local_completion(request: Request) -> JSONResponse:
    request_id = request.headers.get("x-request-id", "").strip()[:80] or uuid.uuid4().hex
    try:
        payload = await request.json()
    except ValueError as error:
        raise HTTPException(status_code=422, detail="Запрос модели должен содержать JSON.") from error
    if not isinstance(payload, dict):
        raise HTTPException(status_code=422, detail="Некорректный формат запроса модели.")

    loaded = await _fetch_loaded_models()
    try:
        route = choose_model(str(payload.get("model", AUTO_MODEL_ID)), payload.get("messages", []), loaded)
    except ValueError as error:
        code = str(error)
        if code == "model-not-loaded":
            raise HTTPException(status_code=409, detail="Выбранная модель сейчас не загружена в LM Studio.") from error
        if code == "capability-not-loaded":
            raise HTTPException(status_code=409, detail="AUTO не нашёл загруженную модель с нужной возможностью.") from error
        raise HTTPException(status_code=503, detail="В LM Studio не загружено ни одной модели.") from error

    forwarded = dict(payload)
    forwarded["model"] = route["model"]
    write_trace(
        "llm.route",
        request_id=request_id,
        requested_model=str(payload.get("model", AUTO_MODEL_ID))[:160],
        selected_model=route["model"][:160],
        route_mode=route["mode"],
        route_reason=route["reason"][:300],
    )

    started = time.perf_counter()
    try:
        async with httpx.AsyncClient(timeout=httpx.Timeout(120.0, connect=5.0)) as client:
            response = await client.post(f"{LM_STUDIO_BASE_URL}/v1/chat/completions", json=forwarded)
    except httpx.ConnectError as error:
        raise HTTPException(status_code=503, detail="LM Studio Local Server не запущен на порту 1234.") from error
    except httpx.TimeoutException as error:
        raise HTTPException(status_code=504, detail="Локальная модель не ответила за 120 секунд.") from error

    duration_ms = round((time.perf_counter() - started) * 1000)
    if response.status_code == 401:
        raise HTTPException(status_code=401, detail="В LM Studio включён Require Authentication.")
    if not response.is_success:
        write_trace(
            "llm.forward.error",
            request_id=request_id,
            category="model-http-error",
            upstream_status=response.status_code,
            duration_ms=duration_ms,
            selected_model=route["model"][:160],
        )
        raise HTTPException(status_code=502, detail=f"LM Studio вернул HTTP {response.status_code}.")

    try:
        content = response.json()
    except json.JSONDecodeError as error:
        raise HTTPException(status_code=502, detail="LM Studio вернул некорректный JSON.") from error
    if isinstance(content, dict):
        content["bookcraft_route"] = route

    write_trace(
        "llm.forward.finish",
        request_id=request_id,
        upstream_status=response.status_code,
        duration_ms=duration_ms,
        selected_model=route["model"][:160],
    )
    return JSONResponse(
        content=content,
        headers={
            "X-Request-ID": request_id,
            "X-Bookcraft-Model": route["model"][:160],
            "X-Bookcraft-Route-Mode": route["mode"],
        },
    )
