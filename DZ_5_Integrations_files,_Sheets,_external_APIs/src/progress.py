from __future__ import annotations

from dataclasses import dataclass
from typing import Awaitable, Callable


@dataclass(frozen=True)
class ProgressStage:
    key: str
    percent: int
    label: str


STAGES = {
    "received": ProgressStage("received", 0, "Файл получен"),
    "downloaded": ProgressStage("downloaded", 15, "Файл загружен"),
    "normalized": ProgressStage("normalized", 30, "Файл подготовлен"),
    "transcribed": ProgressStage("transcribed", 60, "Транскрибация завершена"),
    "saved": ProgressStage("saved", 70, "Текст сохранён"),
    "analyzed": ProgressStage("analyzed", 85, "AI-анализ завершён"),
    "sheets": ProgressStage("sheets", 92, "Данные сохранены"),
    "ready": ProgressStage("ready", 100, "Протокол готов"),
}


def render_progress(stage_key: str) -> str:
    stage = STAGES[stage_key]
    blocks = round(stage.percent / 10)
    bar = "█" * blocks + "░" * (10 - blocks)
    return f"Обработка встречи\n{bar} {stage.percent}%\n{stage.label}"


class ProgressReporter:
    def __init__(self, editor: Callable[[str], Awaitable[object]]):
        self._editor = editor
        self._last_key: str | None = None

    async def set(self, stage_key: str) -> None:
        if stage_key == self._last_key:
            return
        if stage_key not in STAGES:
            raise KeyError(f"Unknown progress stage: {stage_key}")
        await self._editor(render_progress(stage_key))
        self._last_key = stage_key
