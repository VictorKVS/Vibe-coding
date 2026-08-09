from __future__ import annotations

import hashlib
import mimetypes
import uuid
from pathlib import Path

from .models import Artifact


def sha256_file(path: str | Path) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def detect_media_type(mime: str | None, filename: str) -> str:
    mime = mime or mimetypes.guess_type(filename)[0] or "application/octet-stream"
    if mime.startswith("audio/"):
        return "audio"
    if mime.startswith("video/"):
        return "video"
    if mime.startswith("image/"):
        return "image"
    if mime in {
        "application/pdf",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        "text/plain",
        "text/csv",
        "text/html",
        "application/json",
        "application/xml",
        "text/xml",
    }:
        return "document"
    return "unknown"


def create_artifact(
    path: str | Path,
    *,
    source: str,
    original_name: str | None = None,
    declared_mime: str | None = None,
) -> Artifact:
    path = Path(path)
    name = original_name or path.name
    detected_mime = mimetypes.guess_type(name)[0] or "application/octet-stream"
    return Artifact(
        id=uuid.uuid4().hex,
        source=source,
        original_name=name,
        declared_mime=declared_mime,
        detected_mime=detected_mime,
        sha256=sha256_file(path),
        size=path.stat().st_size,
        original_path=path,
        media_type=detect_media_type(detected_mime, name),
    )
