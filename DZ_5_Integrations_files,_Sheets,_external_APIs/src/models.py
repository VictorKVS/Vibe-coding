from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path
from typing import Any


@dataclass
class Artifact:
    id: str
    source: str
    original_name: str
    declared_mime: str | None
    detected_mime: str | None
    sha256: str
    size: int
    original_path: Path
    normalized_path: Path | None = None
    media_type: str | None = None
    language: str | None = None
    metadata: dict[str, Any] = field(default_factory=dict)


@dataclass
class ExtractedContent:
    artifact_id: str
    text: str = ""
    language: str | None = None
    pages: list[str] = field(default_factory=list)
    tables: list[dict[str, Any]] = field(default_factory=list)
    images: list[str] = field(default_factory=list)
    metadata: dict[str, Any] = field(default_factory=dict)
