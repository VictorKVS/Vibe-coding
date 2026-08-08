from dataclasses import dataclass
import os
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[1]


@dataclass(frozen=True)
class Settings:
    tg_token: str
    gigachat_credentials: str
    project_root: str = str(PROJECT_ROOT)
    tours_csv: str = str(PROJECT_ROOT / "data" / "tours.csv")
    sqlite_path: str = str(PROJECT_ROOT / "data" / "ai_travel.db")
    knowledge_dir: str = str(PROJECT_ROOT / "knowledge")
    assets_dir: str = str(PROJECT_ROOT / "assets")


def load_settings() -> Settings:
    return Settings(
        tg_token=os.getenv("TG_TOKEN2", ""),
        gigachat_credentials=os.getenv("GIGACHAT_CREDENTIALS", ""),
    )
