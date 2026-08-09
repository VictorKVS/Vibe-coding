from __future__ import annotations

from pathlib import Path
from typing import Any, Dict

from .documents import extract_document
from .images import normalize_image
from .ingestion import create_artifact
from .media import normalize_media


def route_artifact(
    path: str | Path,
    work_dir: str | Path,
    *,
    source: str = "local",
    original_name: str | None = None,
    declared_mime: str | None = None,
) -> Dict[str, Any]:
    p = Path(path)
    work = Path(work_dir)
    artifact = create_artifact(
        p,
        source=source,
        original_name=original_name,
        declared_mime=declared_mime,
    )

    if artifact.media_type in {"audio", "video"}:
        result = normalize_media(p, work / "media")
        artifact.normalized_path = Path(result["normalized_path"])
        artifact.metadata.update(result)
        return {"kind": "media", "artifact": artifact, **result}

    if artifact.media_type == "image":
        result = normalize_image(p, work / "images")
        artifact.normalized_path = Path(result["normalized_path"])
        artifact.metadata.update(result)
        return {"kind": "image", "artifact": artifact, **result}

    if artifact.media_type == "document":
        result = extract_document(p)
        return {"kind": "document", "artifact": artifact, **result}

    raise ValueError(
        f"Unsupported artifact: detected_mime={artifact.detected_mime}, "
        f"name={artifact.original_name}"
    )
