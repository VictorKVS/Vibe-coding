from __future__ import annotations

import json
import os
import re
import time
import uuid
from typing import Any

import httpx
from fastapi import HTTPException, Request
from fastapi.responses import JSONResponse

from .app import LM_STUDIO_BASE_URL, app, write_trace

AUTO_MODEL_ID = "auto"
NON_CHAT_MODEL_MARKERS = (
    "whisper",
    "embedding",
    "embed-",
    "nomic-embed",
    "rerank",
    "bge-",
)
SINGLE_MODEL_RUNTIME = os.getenv("BOOKCRAFT_SINGLE_MODEL", "1").strip().lower() not in {"0", "false", "no"}


def _is_chat_model(model_id: str) -> bool:
    """Keep STT/embedding/rerank services out of the chat router catalog."""
    value = model_id.strip().lower()
    return bool(value) and not any(marker in value for marker in NON_CHAT_MODEL_MARKERS)


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
    available = [
        item for item in available_models
        if isinstance(item, str) and _is_chat_model(item)
    ]
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
            score = 118 if "code" in caps else 25
            reason = "Запрос содержит код или технические маркеры."
        elif features["is_long"]:
            score = 112 if "long-context" in caps and "code" not in caps else 80 if "long-context" in caps else 30
            reason = "Запрос длинный; приоритет модели с большим контекстом."
        elif features["is_prose"] and features["is_russian"]:
            score = 108 if "russian" in caps else 88 if "prose" in caps and "vision" not in caps else 45
            reason = "Русский литературный/редакторский запрос."
        elif features["is_prose"]:
            score = 94 if "prose" in caps and "vision" not in caps else 40
            reason = "Творческий или редакторский текст."
        else:
            # Vision-модель не должна становиться постоянной текстовой моделью
            # только потому, что в её имени есть слово mistral.
            if "gigachat" in value and features["is_russian"]:
                score = 94
                reason = "Обычный русский текст; выбрана специализированная русскоязычная модель."
            elif "mistral" in value and "vision" not in caps:
                score = 90
                reason = "Обычный текстовый запрос; приоритет обычной Mistral."
            elif "qwen" in value and "code" not in caps:
                score = 84
                reason = "Обычный текстовый запрос; выбрана универсальная Qwen."
            elif "gigachat" in value:
                score = 82
                reason = "Обычный текстовый запрос; выбрана GigaChat."
            elif "vision" in caps:
                score = 35
                reason = "Vision-модель используется как резерв, потому что обычной text-модели нет."

        scored.append((score, -index, model_id, reason))

    score, _, model_id, reason = max(scored, key=lambda item: (item[0], item[1]))
    if score < 0:
        raise ValueError("capability-not-loaded")
    return {"model": model_id, "mode": "auto", "reason": reason}


async def _native_model_inventory() -> list[dict[str, Any]]:
    """Return LM Studio native v1 model inventory with real loaded-instance state."""
    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            response = await client.get(f"{LM_STUDIO_BASE_URL}/api/v1/models")
    except httpx.ConnectError as error:
        raise HTTPException(status_code=503, detail="LM Studio Local Server не запущен на порту 1234.") from error
    except httpx.TimeoutException as error:
        raise HTTPException(status_code=504, detail="LM Studio не ответил при получении списка моделей.") from error

    if response.status_code == 401:
        raise HTTPException(status_code=401, detail="В LM Studio включён Require Authentication.")
    if response.status_code == 404:
        return []
    if not response.is_success:
        raise HTTPException(status_code=502, detail=f"LM Studio вернул HTTP {response.status_code} при получении моделей.")

    try:
        payload = response.json()
    except ValueError as error:
        raise HTTPException(status_code=502, detail="LM Studio вернул некорректный список моделей.") from error

    result: list[dict[str, Any]] = []
    for item in payload.get("models", []):
        if not isinstance(item, dict):
            continue
        key = str(item.get("key", "")).strip()
        model_type = str(item.get("type", "")).strip().lower()
        if not key or model_type == "embedding" or not _is_chat_model(key):
            continue
        loaded_instances = item.get("loaded_instances", [])
        if not isinstance(loaded_instances, list):
            loaded_instances = []
        result.append({
            "key": key,
            "display_name": str(item.get("display_name") or key),
            "type": model_type or "llm",
            "architecture": item.get("architecture"),
            "loaded_instances": [instance for instance in loaded_instances if isinstance(instance, dict)],
        })
    return result


async def _openai_visible_models() -> list[str]:
    """Fallback for older LM Studio builds and JIT-visible model catalogs."""
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
        model_id
        for item in payload.get("data", [])
        if isinstance(item, dict)
        for model_id in [str(item.get("id", "")).strip()]
        if _is_chat_model(model_id)
    ]


async def _model_catalog() -> list[dict[str, Any]]:
    inventory = await _native_model_inventory()
    if inventory:
        return inventory
    return [
        {
            "key": model_id,
            "display_name": model_id,
            "type": "llm",
            "architecture": None,
            "loaded_instances": [],
        }
        for model_id in await _openai_visible_models()
    ]


async def _unload_instance(instance_id: str, request_id: str) -> None:
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                f"{LM_STUDIO_BASE_URL}/api/v1/models/unload",
                json={"instance_id": instance_id},
            )
    except (httpx.ConnectError, httpx.TimeoutException):
        return
    if response.is_success:
        write_trace("llm.model.unload", request_id=request_id, instance_id=instance_id[:160])


async def _ensure_model_loaded(model_key: str, request_id: str) -> dict[str, str]:
    """Make the selected model the real runtime model, not just a UI label."""
    inventory = await _native_model_inventory()
    if not inventory:
        # Older LM Studio or native API unavailable: OpenAI endpoint may still JIT-load.
        return {"model": model_key, "instance_id": model_key, "state": "jit-or-existing"}

    selected = next((item for item in inventory if item["key"] == model_key), None)
    if selected is None:
        raise HTTPException(status_code=409, detail=f"Модель «{model_key}» отсутствует в локальном каталоге LM Studio.")

    instances = selected.get("loaded_instances", [])
    if instances:
        instance_id = str(instances[0].get("id") or model_key)
        return {"model": model_key, "instance_id": instance_id, "state": "already-loaded"}

    if SINGLE_MODEL_RUNTIME:
        for item in inventory:
            if item["key"] == model_key:
                continue
            for instance in item.get("loaded_instances", []):
                instance_id = str(instance.get("id", "")).strip()
                if instance_id:
                    await _unload_instance(instance_id, request_id)

    write_trace("llm.model.load.start", request_id=request_id, model=model_key[:160])
    try:
        async with httpx.AsyncClient(timeout=httpx.Timeout(210.0, connect=10.0)) as client:
            response = await client.post(
                f"{LM_STUDIO_BASE_URL}/api/v1/models/load",
                json={"model": model_key, "echo_load_config": True},
            )
    except httpx.ConnectError as error:
        raise HTTPException(status_code=503, detail="LM Studio остановился во время загрузки модели.") from error
    except httpx.TimeoutException as error:
        raise HTTPException(status_code=504, detail=f"Модель «{model_key}» не загрузилась за 210 секунд.") from error

    if response.status_code == 401:
        raise HTTPException(status_code=401, detail="LM Studio требует API-токен для управления моделями.")
    if not response.is_success:
        detail = ""
        try:
            body = response.json()
            detail = str(body.get("error") or body.get("message") or "")[:300]
        except ValueError:
            detail = response.text[:300]
        suffix = f": {detail}" if detail else ""
        raise HTTPException(status_code=502, detail=f"LM Studio не загрузил «{model_key}» (HTTP {response.status_code}){suffix}")

    try:
        body = response.json()
    except ValueError as error:
        raise HTTPException(status_code=502, detail="LM Studio загрузил модель, но вернул некорректный JSON.") from error
    instance_id = str(body.get("instance_id") or body.get("model_instance_id") or model_key)
    write_trace(
        "llm.model.load.finish",
        request_id=request_id,
        model=model_key[:160],
        instance_id=instance_id[:160],
        load_time_seconds=body.get("load_time_seconds"),
    )
    return {"model": model_key, "instance_id": instance_id, "state": "loaded-now"}


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
    catalog = await _model_catalog()
    auto = {
        "id": AUTO_MODEL_ID,
        "object": "model",
        "owned_by": "bookcraft-router",
        "bookcraft": {"mode": "auto", "capabilities": ["routing"], "loaded": False},
    }
    models = [auto]
    for item in catalog:
        model_id = str(item["key"])
        models.append({
            "id": model_id,
            "object": "model",
            "owned_by": "lm-studio",
            "bookcraft": {
                "display_name": item.get("display_name") or model_id,
                "capabilities": sorted(_model_capabilities(model_id)),
                "loaded": bool(item.get("loaded_instances")),
                "loaded_instances": [str(instance.get("id")) for instance in item.get("loaded_instances", []) if instance.get("id")],
            },
        })
    return {"object": "list", "data": models}


@app.get("/api/models/runtime")
async def model_runtime_state() -> dict[str, object]:
    catalog = await _model_catalog()
    return {
        "single_model_runtime": SINGLE_MODEL_RUNTIME,
        "models": [
            {
                "id": item["key"],
                "display_name": item.get("display_name") or item["key"],
                "loaded": bool(item.get("loaded_instances")),
                "instances": [str(instance.get("id")) for instance in item.get("loaded_instances", []) if instance.get("id")],
                "capabilities": sorted(_model_capabilities(str(item["key"]))),
            }
            for item in catalog
        ],
    }


@app.post("/api/models/switch")
async def switch_model(request: Request) -> dict[str, str]:
    """Explicitly switch LM Studio runtime to a selected model."""
    request_id = request.headers.get("x-request-id", "").strip()[:80] or uuid.uuid4().hex
    try:
        payload = await request.json()
    except ValueError as error:
        raise HTTPException(status_code=422, detail="Ожидался JSON-запрос.") from error
    model_key = str(payload.get("model", "")).strip()
    if not model_key or model_key == AUTO_MODEL_ID:
        raise HTTPException(status_code=422, detail="Для ручного переключения укажите конкретную модель.")
    available = [str(item["key"]) for item in await _model_catalog()]
    if model_key not in available:
        raise HTTPException(status_code=409, detail="Выбранная модель отсутствует в LM Studio.")
    runtime = await _ensure_model_loaded(model_key, request_id)
    return {
        "status": "ready",
        "model": model_key,
        "instance_id": runtime["instance_id"],
        "state": runtime["state"],
    }


@app.post("/api/models/route")
async def preview_model_route(request: Request) -> dict[str, str]:
    """Explain which model AUTO would choose without running inference."""
    try:
        payload = await request.json()
    except ValueError as error:
        raise HTTPException(status_code=422, detail="Ожидался JSON-запрос.") from error
    available = [str(item["key"]) for item in await _model_catalog()]
    try:
        return choose_model(str(payload.get("model", AUTO_MODEL_ID)), payload.get("messages", []), available)
    except ValueError as error:
        code = str(error)
        if code == "model-not-loaded":
            raise HTTPException(status_code=409, detail="Выбранная модель отсутствует в LM Studio.") from error
        if code == "capability-not-loaded":
            raise HTTPException(status_code=409, detail="Для этого запроса нет подходящей локальной модели.") from error
        raise HTTPException(status_code=503, detail="В LM Studio нет ни одной chat-модели.") from error


@app.post("/api/llm/chat/completions")
async def routed_local_completion(request: Request) -> JSONResponse:
    request_id = request.headers.get("x-request-id", "").strip()[:80] or uuid.uuid4().hex
    try:
        payload = await request.json()
    except ValueError as error:
        raise HTTPException(status_code=422, detail="Запрос модели должен содержать JSON.") from error
    if not isinstance(payload, dict):
        raise HTTPException(status_code=422, detail="Некорректный формат запроса модели.")

    catalog = await _model_catalog()
    available = [str(item["key"]) for item in catalog]
    try:
        route = choose_model(str(payload.get("model", AUTO_MODEL_ID)), payload.get("messages", []), available)
    except ValueError as error:
        code = str(error)
        if code == "model-not-loaded":
            raise HTTPException(status_code=409, detail="Выбранная модель отсутствует в LM Studio.") from error
        if code == "capability-not-loaded":
            raise HTTPException(status_code=409, detail="AUTO не нашёл локальную модель с нужной возможностью.") from error
        raise HTTPException(status_code=503, detail="В LM Studio нет ни одной chat-модели.") from error

    runtime = await _ensure_model_loaded(route["model"], request_id)
    route = {**route, "instance_id": runtime["instance_id"], "runtime_state": runtime["state"]}

    forwarded = dict(payload)
    forwarded["model"] = runtime["instance_id"]
    write_trace(
        "llm.route",
        request_id=request_id,
        requested_model=str(payload.get("model", AUTO_MODEL_ID))[:160],
        selected_model=route["model"][:160],
        instance_id=runtime["instance_id"][:160],
        runtime_state=runtime["state"],
        route_mode=route["mode"],
        route_reason=route["reason"][:300],
    )

    started = time.perf_counter()
    try:
        async with httpx.AsyncClient(timeout=httpx.Timeout(180.0, connect=5.0)) as client:
            response = await client.post(f"{LM_STUDIO_BASE_URL}/v1/chat/completions", json=forwarded)
    except httpx.ConnectError as error:
        raise HTTPException(status_code=503, detail="LM Studio Local Server не запущен на порту 1234.") from error
    except httpx.TimeoutException as error:
        raise HTTPException(status_code=504, detail="Локальная модель не ответила за 180 секунд.") from error

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
        detail = ""
        try:
            body = response.json()
            detail = str(body.get("error") or body.get("message") or "")[:300]
        except ValueError:
            detail = response.text[:300]
        suffix = f": {detail}" if detail else ""
        raise HTTPException(status_code=502, detail=f"LM Studio вернул HTTP {response.status_code}{suffix}")

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
        instance_id=runtime["instance_id"][:160],
    )
    return JSONResponse(
        content=content,
        headers={
            "X-Request-ID": request_id,
            "X-Bookcraft-Model": route["model"][:160],
            "X-Bookcraft-Instance": runtime["instance_id"][:160],
            "X-Bookcraft-Route-Mode": route["mode"],
        },
    )
