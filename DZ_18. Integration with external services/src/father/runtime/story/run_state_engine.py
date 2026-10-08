from __future__ import annotations

import argparse
import json
from datetime import datetime
from pathlib import Path

from father.runtime.story.schema import (
    StoryProject,
)
from father.runtime.story.state_engine import (
    build_story_state,
)


ROOT = (
    Path(__file__)
    .resolve()
    .parents[4]
)


def validate_project(
    payload,
) -> StoryProject:

    if hasattr(
        StoryProject,
        "model_validate",
    ):

        return StoryProject.model_validate(
            payload
        )

    return StoryProject.parse_obj(
        payload
    )


def dump_model(
    value,
):

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


def main() -> int:

    parser = argparse.ArgumentParser()

    parser.add_argument(
        "--project",
        required=True,
    )

    args = parser.parse_args()


    source = Path(
        args.project
    )


    payload = json.loads(
        source.read_text(
            encoding="utf-8"
        )
    )


    project = validate_project(
        payload
    )


    result = build_story_state(
        project
    )


    target_dir = (
        ROOT
        / "runtime-data"
        / "story"
        / "projects"
        / project.project_id
        / "state"
    )


    target_dir.mkdir(
        parents=True,
        exist_ok=True,
    )


    stamp = datetime.now().strftime(
        "%Y%m%d-%H%M%S"
    )


    state_file = (
        target_dir
        / f"{stamp}-story-state.json"
    )


    project_file = (
        target_dir
        / f"{stamp}-stateful-story-project.json"
    )


    state_file.write_text(
        json.dumps(
            dump_model(
                result.state
            ),
            ensure_ascii=False,
            indent=2,
        ),
        encoding="utf-8",
    )


    project_file.write_text(
        json.dumps(
            dump_model(
                result.project
            ),
            ensure_ascii=False,
            indent=2,
        ),
        encoding="utf-8",
    )


    print(
        "FATHER Story State Engine"
    )

    print(
        "Mode: deterministic"
    )

    print(
        "LLM used: no"
    )

    print(
        "Timeline events: "
        f"{len(result.state.timeline_event_ids)}"
    )

    print(
        "Transitions: "
        f"{len(result.state.transitions)}"
    )

    print(
        "Knowledge records: "
        f"{len(result.state.knowledge)}"
    )

    print(
        "Unresolved secrets: "
        f"{len(result.state.unresolved_secret_ids)}"
    )

    print(
        "Continuity issues: "
        f"{len(result.state.issues)}"
    )

    print(
        f"State: {state_file}"
    )

    print(
        f"Stateful project: {project_file}"
    )

    return 0


if __name__ == "__main__":

    raise SystemExit(
        main()
    )
