from dataclasses import dataclass
import os


@dataclass(frozen=True)
class Settings:
    tg_token: str
    gigachat_credentials: str
    project_root: str = "."
    tours_csv: str = "data/tours.csv"
    sqlite_path: str = "data/ai_travel.db"
    knowledge_dir: str = "knowledge"


def load_settings() -> Settings:
    return Settings(
        tg_token=os.getenv("TG_TOKEN2", ""),
        gigachat_credentials=os.getenv("GIGACHAT_CREDENTIALS", ""),
    )
