from __future__ import annotations

import json
import time
import uuid
from typing import Any

import httpx
from fastapi import HTTPException, Request
from fastapi.responses import JSONResponse

from .model_router_app import (
    AUTO_MODEL_ID,
    LM_STUDIO_BASE_URL,
    _ensure_model_loaded,
    _model_catalog,
    app,
    choose_model,
    write_trace,
)

AUTO_FAILURE_TTL_SECONDS = 600
AUTO_MAX_ATTEMPTS = 3
_AUTO_FAILURES: dict[str, dict[str, Any]] = {}


def _failure_is_active(model_id: str, now: float | None = None) -> bool:
    record = _AUTO_FAILURES.get(model_id)
    if not record:
        return False
    current = time.monotonic() if now is None else now
    if current - float(record.get("at", 0.0)) >= AUTO_FAILURE_TTL_SECONDS:
        _AUTO_FAILURES.pop(model_id, None)
        return False
    return True


def _mark_auto_failure(model_id: str, detail: str, request_id: str) -> None:
    _AUTO_FAILURES[model_id] = {
        "at": time.monotonic(),
        "detail": detail[:300],
    }
    write_trace(
        "llm.route.quarantine",
        request_id=request_id,
        model=model_id[:160],
        ttl_seconds=AUTO_FAILURE_TTL_SECONDS,
        detail=detail[:300],
    )


def _eligible_auto_models(model_ids: list[str]) -> list[str]:
    return [model_id for model_id in model_ids if not _failure_is_active(model_id)]


def _failure_snapshot() -> list[dict[str, object]]:
    now = time.monotonic()
    result: list[dict[str, object]] = []
    for model_id in list(_AUTO_FAILURES):
        if not _failure_is_active(model_id, now):
            continue
        record = _AUTO_FAILURES[model_id]
        remaining = max(0, round(AUTO_FAILURE_TTL_SECONDS - (now - float(record["at"]))))
        result.append({
            "model": model_id,
            "detail": str(record.get("detail", "")),
            "retry_after_seconds": remaining,
        })
    return result


async def _forward_to_loaded_model(
    payload: dict[str, Any],
    route: dict[str, str],
    runtime: dict[str, str],
    request_id: str,
) -> tuple[dict[str, Any], int]:
    forwarded = dict(payload)
    forwarded["model"] = runtime["instance_id"]
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
    if not isinstance(content, dict):
        raise HTTPException(status_code=502, detail="LM Studio вернул неожиданный формат ответа.")
    return content, duration_ms


# Replace only the router endpoints that need failure-aware AUTO behavior.
app.router.routes[:] = [
    route
    for route in app.router.routes
    if not (
        getattr(route, "path", None) in {"/api/llm/chat/completions", "/api/models/route"}
        and "POST" in getattr(route, "methods", set())
    )
]


@app.get("/api/models/failures")
def model_failure_state() -> dict[str, object]:
    return {
        "ttl_seconds": AUTO_FAILURE_TTL_SECONDS,
        "failures": _failure_snapshot(),
    }


@app.post("/api/models/route")
async def preview_resilient_model_route(request: Request) -> dict[str, object]:
    try:
        payload = await request.json()
    except ValueError as error:
        raise HTTPException(status_code=422, detail="Ожидался JSON-запрос.") from error
    if not isinstance(payload, dict):
        raise HTTPException(status_code=422, detail="Некорректный JSON-запрос.")

    catalog = await _model_catalog()
    available = [str(item["key"]) for item in catalog]
    requested = str(payload.get("model", AUTO_MODEL_ID)).strip() or AUTO_MODEL_ID
    candidates = _eligible_auto_models(available) if requested == AUTO_MODEL_ID else available
    try:
        route = choose_model(requested, payload.get("messages", []), candidates)
    except ValueError as error:
        code = str(error)
        if code == "model-not-loaded":
            raise HTTPException(status_code=409, detail="Выбранная модель отсутствует в LM Studio.") from error
        if code == "capability-not-loaded":
            raise HTTPException(status_code=409, detail="Для этого запроса нет подходящей рабочей локальной модели.") from error
        raise HTTPException(status_code=503, detail="В LM Studio нет доступной chat-модели.") from error
    return {
        **route,
        "temporarily_skipped": [item["model"] for item in _failure_snapshot()],
    }


@app.post("/api/llm/chat/completions")
async def resilient_local_completion(request: Request) -> JSONResponse:
    request_id = request.headers.get("x-request-id", "").strip()[:80] or uuid.uuid4().hex
    try:
        payload = await request.json()
    except ValueError as error:
        raise HTTPException(status_code=422, detail="Запрос модели должен содержать JSON.") from error
    if not isinstance(payload, dict):
        raise HTTPException(status_code=422, detail="Некорректный формат запроса модели.")

    catalog = await _model_catalog()
    available = [str(item["key"]) for item in catalog]
    requested = str(payload.get("model", AUTO_MODEL_ID)).strip() or AUTO_MODEL_ID
    is_auto = requested == AUTO_MODEL_ID
    candidates = _eligible_auto_models(available) if is_auto else available
    fallbacks: list[dict[str, str]] = []

    if not candidates:
        if is_auto and available:
            # All models were quarantined; allow a fresh attempt after clearing the oldest failures.
            oldest = min(
                available,
                key=lambda model_id: float(_AUTO_FAILURES.get(model_id, {}).get("at", 0.0)),
            )
            _AUTO_FAILURES.pop(oldest, None)
            candidates = _eligible_auto_models(available)
        if not candidates:
            raise HTTPException(status_code=503, detail="В LM Studio нет доступной chat-модели.")

    attempts_left = min(AUTO_MAX_ATTEMPTS, len(candidates)) if is_auto else 1
    last_error: HTTPException | None = None

    while attempts_left > 0:
        attempts_left -= 1
        try:
            route = choose_model(requested if not is_auto else AUTO_MODEL_ID, payload.get("messages", []), candidates)
        except ValueError as error:
            code = str(error)
            if code == "model-not-loaded":
                raise HTTPException(status_code=409, detail="Выбранная модель отсутствует в LM Studio.") from error
            if code == "capability-not-loaded":
                if fallbacks:
                    raise HTTPException(
                        status_code=502,
                        detail="AUTO исключил неработающие модели, но не осталось модели с нужной возможностью.",
                    ) from error
                raise HTTPException(status_code=409, detail="AUTO не нашёл локальную модель с нужной возможностью.") from error
            raise HTTPException(status_code=503, detail="В LM Studio нет доступной chat-модели.") from error

        selected_model = route["model"]
        try:
            runtime = await _ensure_model_loaded(selected_model, request_id)
            content, duration_ms = await _forward_to_loaded_model(payload, route, runtime, request_id)
        except HTTPException as error:
            last_error = error
            if not is_auto or error.status_code in {401, 503, 504}:
                raise
            detail = str(error.detail)
            fallbacks.append({"model": selected_model, "error": detail[:220]})
            _mark_auto_failure(selected_model, detail, request_id)
            candidates = [model_id for model_id in candidates if model_id != selected_model]
            candidates = _eligible_auto_models(candidates)
            write_trace(
                "llm.route.fallback",
                request_id=request_id,
                failed_model=selected_model[:160],
                remaining_candidates=len(candidates),
                error=detail[:300],
            )
            if not candidates:
                break
            continue

        _AUTO_FAILURES.pop(selected_model, None)
        route = {
            **route,
            "instance_id": runtime["instance_id"],
            "runtime_state": runtime["state"],
            "fallbacks": fallbacks,
        }
        content["bookcraft_route"] = route
        write_trace(
            "llm.forward.finish",
            request_id=request_id,
            upstream_status=200,
            duration_ms=duration_ms,
            selected_model=selected_model[:160],
            instance_id=runtime["instance_id"][:160],
            fallback_count=len(fallbacks),
        )
        return JSONResponse(
            content=content,
            headers={
                "X-Request-ID": request_id,
                "X-Bookcraft-Model": selected_model[:160],
                "X-Bookcraft-Instance": runtime["instance_id"][:160],
                "X-Bookcraft-Route-Mode": route["mode"],
                "X-Bookcraft-Fallbacks": str(len(fallbacks)),
            },
        )

    if fallbacks:
        summary = "; ".join(f"{item['model']}: {item['error']}" for item in fallbacks)
        raise HTTPException(
            status_code=502,
            detail=f"AUTO не смог запустить локальную модель после {len(fallbacks)} попыток. {summary[:700]}",
        )
    if last_error is not None:
        raise last_error
    raise HTTPException(status_code=503, detail="AUTO не нашёл доступную локальную модель.")
