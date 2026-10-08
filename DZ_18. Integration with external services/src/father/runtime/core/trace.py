from __future__ import annotations

import hashlib
import json
import threading
import uuid

from contextvars import ContextVar
from datetime import datetime
from pathlib import Path
from typing import Any


REPO_ROOT = Path(__file__).resolve().parents[4]

TRACE_DIR = (
    REPO_ROOT
    / "runtime-data"
    / "traces"
)

TRACE_DIR.mkdir(
    parents=True,
    exist_ok=True,
)

_TRACE_ID: ContextVar[str] = ContextVar(
    "father_trace_id",
    default="",
)

_LOCK = threading.Lock()


def new_trace_id(
    candidate: str | None = None,
) -> str:
    value = (
        candidate or ""
    ).strip()

    if value:
        return value[:128]

    return uuid.uuid4().hex


def set_trace_id(
    trace_id: str,
) -> None:
    _TRACE_ID.set(trace_id)


def get_trace_id() -> str:
    value = _TRACE_ID.get()

    if value:
        return value

    value = new_trace_id()
    set_trace_id(value)

    return value


def text_fingerprint(
    value: str,
) -> str:
    return hashlib.sha256(
        value.encode(
            "utf-8",
            errors="replace",
        )
    ).hexdigest()[:16]


def _trace_file() -> Path:
    stamp = datetime.now().astimezone().strftime(
        "%Y-%m-%d"
    )

    return (
        TRACE_DIR
        / f"father-trace-{stamp}.jsonl"
    )


def _safe_value(
    value: Any,
) -> Any:
    if value is None:
        return None

    if isinstance(
        value,
        (str, int, float, bool),
    ):
        if isinstance(value, str):
            return value[:1000]

        return value

    return str(value)[:1000]


def trace_event(
    stage: str,
    status: str = "ok",
    trace_id: str | None = None,
    **fields: Any,
) -> str:
    trace_id = (
        trace_id
        or get_trace_id()
    )

    event = {
        "timestamp": (
            datetime
            .now()
            .astimezone()
            .isoformat(
                timespec="milliseconds"
            )
        ),
        "trace_id": trace_id,
        "component": "father-runtime",
        "stage": stage,
        "status": status,
    }

    for key, value in fields.items():
        if value is not None:
            event[key] = _safe_value(
                value
            )

    line = json.dumps(
        event,
        ensure_ascii=False,
        separators=(",", ":"),
    )

    with _LOCK:
        with _trace_file().open(
            "a",
            encoding="utf-8",
        ) as stream:
            stream.write(
                line + "\n"
            )

    return trace_id
