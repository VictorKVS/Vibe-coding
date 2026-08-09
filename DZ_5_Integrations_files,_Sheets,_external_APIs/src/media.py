from __future__ import annotations

import json
import subprocess
from pathlib import Path
from typing import Any, Dict


def ffprobe(path: str | Path) -> Dict[str, Any]:
    path = str(path)
    cmd = [
        "ffprobe",
        "-v", "quiet",
        "-print_format", "json",
        "-show_format",
        "-show_streams",
        path,
    ]
    result = subprocess.run(cmd, capture_output=True, text=True, check=True)
    return json.loads(result.stdout or "{}")


def has_audio_stream(probe: Dict[str, Any]) -> bool:
    return any(s.get("codec_type") == "audio" for s in probe.get("streams", []))


def has_video_stream(probe: Dict[str, Any]) -> bool:
    return any(s.get("codec_type") == "video" for s in probe.get("streams", []))


def normalize_audio(src: str | Path, dst: str | Path) -> str:
    src, dst = str(src), str(dst)
    Path(dst).parent.mkdir(parents=True, exist_ok=True)
    cmd = [
        "ffmpeg", "-y",
        "-i", src,
        "-vn",
        "-ac", "1",
        "-ar", "16000",
        "-c:a", "pcm_s16le",
        dst,
    ]
    subprocess.run(cmd, capture_output=True, text=True, check=True)
    return dst


def extract_audio_from_video(src: str | Path, dst: str | Path) -> str:
    return normalize_audio(src, dst)


def normalize_media(src: str | Path, out_dir: str | Path) -> Dict[str, Any]:
    src = Path(src)
    out_dir = Path(out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)

    probe = ffprobe(src)
    audio = has_audio_stream(probe)
    video = has_video_stream(probe)

    if not audio:
        raise ValueError("Media file has no audio stream")

    normalized_audio = out_dir / f"{src.stem}.normalized.wav"
    normalize_audio(src, normalized_audio)

    return {
        "probe": probe,
        "has_audio": audio,
        "has_video": video,
        "normalized_audio": str(normalized_audio),
    }
