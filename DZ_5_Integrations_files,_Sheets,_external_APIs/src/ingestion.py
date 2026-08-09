from __future__ import annotations

import hashlib
import uuid
from pathlib import Path

from .filetype import mime_family, mismatch_warning, sniff_mime
from .models import Artifact


def sha256_file(path: str | Path) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def create_artifact(
    path: str | Path,
    *,
    source: str,
    original_name: str | None = None,
    declared_mime: str | None = None,
) -> Artifact:
    path = Path(path)
    name = original_name or path.name
    detected_mime = sniff_mime(path)
    warning = mismatch_warning(declared_mime, detected_mime)

    metadata = {}
    if warning:
        metadata["mime_warning"] = warning

    return Artifact(
        id=uuid.uuid4().hex,
        source=source,
        original_name=name,
        declared_mime=declared_mime,
        detected_mime=detected_mime,
        sha256=sha256_file(path),
        size=path.stat().st_size,
        original_path=path,
        media_type=mime_family(detected_mime),
        metadata=metadata,
    )
