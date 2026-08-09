from __future__ import annotations

from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parents[1]
SCREENS_ROOT = PROJECT_ROOT / "assets" / "screens"

STAGE_DIRS = {
    "start": "start",
    "file_received": "file_received",
    "transcription": "transcription",
    "analysis": "analysis",
    "ready": "ready",
    "ai_consultant": "ai_consultant",
}


def screen_path(stage: str, device: str = "phone") -> Path:
    folder = STAGE_DIRS[stage]
    candidates = [
        SCREENS_ROOT / folder / f"{device}.jpg",
        SCREENS_ROOT / folder / f"{device}.jpg.png",
        SCREENS_ROOT / folder / f"{device}.png",
    ]
    for path in candidates:
        if path.exists():
            return path
    raise FileNotFoundError(f"Screen asset not found for {stage}/{device}")


def validate_assets() -> dict[str, str]:
    result = {}
    for stage in STAGE_DIRS:
        result[stage] = str(screen_path(stage, "phone"))
    return result
