from __future__ import annotations

from pathlib import Path
from typing import Any, Dict

from .documents import extract_document
from .media import normalize_media


MEDIA_EXTENSIONS = {
    ".mp3", ".wav", ".m4a", ".aac", ".ogg", ".opus", ".flac",
    ".mp4", ".mov", ".mkv", ".webm", ".avi", ".mpeg", ".mpg",
}

DOCUMENT_EXTENSIONS = {
    ".pdf", ".docx", ".xlsx", ".pptx", ".txt", ".md", ".csv", ".json",
}


def route_artifact(path: str | Path, work_dir: str | Path) -> Dict[str, Any]:
    p = Path(path)
    suffix = p.suffix.lower()

    if suffix in MEDIA_EXTENSIONS:
        result = normalize_media(p, Path(work_dir) / "media")
        return {"kind": "media", **result}

    if suffix in DOCUMENT_EXTENSIONS:
        result = extract_document(p)
        return {"kind": "document", **result}

    raise ValueError(f"Unsupported artifact format: {suffix or '<no extension>'}")
