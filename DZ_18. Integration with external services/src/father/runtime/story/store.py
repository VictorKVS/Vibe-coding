from __future__ import annotations

import json
from datetime import datetime
from pathlib import Path

from father.runtime.story.extractor import (
    StoryExtractionResult,
)


REPO_ROOT = (
    Path(__file__)
    .resolve()
    .parents[4]
)

STORY_DATA_ROOT = (
    REPO_ROOT
    / "runtime-data"
    / "story"
)


def _dump_model(value):

    if hasattr(
        value,
        "model_dump",
    ):
        return value.model_dump(
            mode="json"
        )

    return json.loads(
        value.json()
    )


def save_extraction_draft(
    result: StoryExtractionResult,
) -> Path:

    project_id = (
        result.project.project_id
    )

    target_dir = (
        STORY_DATA_ROOT
        / "projects"
        / project_id
        / "drafts"
        / "extractions"
    )

    target_dir.mkdir(
        parents=True,
        exist_ok=True,
    )

    stamp = datetime.now().strftime(
        "%Y%m%d-%H%M%S"
    )

    target = (
        target_dir
        / f"{stamp}-extraction.json"
    )

    target.write_text(
        json.dumps(
            _dump_model(result),
            ensure_ascii=False,
            indent=2,
        ),
        encoding="utf-8",
    )

    return target
