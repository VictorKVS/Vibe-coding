from __future__ import annotations

import re
import uuid
from typing import Any

from fastapi import HTTPException, Request
from pydantic import BaseModel, Field

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


# Replace the plain manual switch endpoint with an observed version.
app.router.routes[:] = [
    route
    for route in app.router.routes
    if not (
        getattr(route, "path", None) == "/api/models/switch"
        and "POST" in getattr(route, "methods", set())
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
