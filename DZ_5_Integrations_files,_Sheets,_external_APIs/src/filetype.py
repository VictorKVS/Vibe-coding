from __future__ import annotations

import mimetypes
from pathlib import Path


SIGNATURES = [
    (b"%PDF-", "application/pdf"),
    (b"\x89PNG\r\n\x1a\n", "image/png"),
    (b"\xff\xd8\xff", "image/jpeg"),
    (b"GIF87a", "image/gif"),
    (b"GIF89a", "image/gif"),
    (b"RIFF", "application/riff"),
    (b"ID3", "audio/mpeg"),
    (b"OggS", "application/ogg"),
    (b"fLaC", "audio/flac"),
    (b"PK\x03\x04", "application/zip"),
]


def sniff_mime(path: str | Path) -> str:
    p = Path(path)
    head = p.read_bytes()[:32]

    for sig, mime in SIGNATURES:
        if head.startswith(sig):
            if mime == "application/riff":
                if head[8:12] == b"WAVE":
                    return "audio/wav"
                if head[8:12] == b"WEBP":
                    return "image/webp"
            if mime == "application/zip":
                suffix = p.suffix.lower()
                return {
                    ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                    ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                    ".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
                }.get(suffix, "application/zip")
            return mime

    if len(head) >= 12 and head[4:8] == b"ftyp":
        return "video/mp4"

    return mimetypes.guess_type(p.name)[0] or "application/octet-stream"


def mime_family(mime: str | None) -> str:
    value = (mime or "application/octet-stream").lower()
    if value.startswith("audio/"):
        return "audio"
    if value.startswith("video/"):
        return "video"
    if value.startswith("image/"):
        return "image"
    if value.startswith("text/"):
        return "document"
    if value in {
        "application/pdf",
        "application/json",
        "application/xml",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    }:
        return "document"
    return "unknown"


def mismatch_warning(declared_mime: str | None, detected_mime: str) -> str | None:
    if not declared_mime:
        return None
    declared_family = mime_family(declared_mime)
    detected_family = mime_family(detected_mime)
    if declared_family != "unknown" and detected_family != "unknown" and declared_family != detected_family:
        return f"Declared MIME {declared_mime} does not match detected MIME {detected_mime}"
    return None
