from __future__ import annotations

import argparse
import json
from datetime import datetime
from pathlib import Path

from father.runtime.story.schema import (
    StoryProject,
)
from father.runtime.story.state_schema import (
    StoryStateResult,
)
from father.runtime.story.continuity_rules import (
    audit_continuity,
)


ROOT = (
    Path(__file__)
    .resolve()
    .parents[4]
)


def validate_model(
    model,
    payload,
):

    if hasattr(
        model,
        "model_validate",
    ):

        return model.model_validate(
            payload
        )

    return model.parse_obj(
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

    parser.add_argument(
        "--state",
        required=True,
    )

    args = parser.parse_args()


    project = validate_model(
        StoryProject,

        json.loads(
            Path(
                args.project
            ).read_text(
                encoding="utf-8"
            )
        ),
    )


    state = validate_model(
        StoryStateResult,

        json.loads(
            Path(
                args.state
            ).read_text(
                encoding="utf-8"
            )
        ),
    )


    result = audit_continuity(
        project=project,
        state=state,
    )


    target_dir = (
        ROOT
        / "runtime-data"
        / "story"
        / "projects"
        / project.project_id
        / "continuity"
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
        / f"{stamp}-continuity-audit.json"
    )


    target.write_text(
        json.dumps(
            dump_model(
                result
            ),
            ensure_ascii=False,
            indent=2,
        ),
        encoding="utf-8",
    )


    print(
        "FATHER Story Continuity Rules"
    )

    print(
        "Mode: deterministic"
    )

    print(
        "LLM used: no"
    )

    print(
        "Rules checked: "
        f"{result.report['rules_checked']}"
    )

    print(
        "Violations: "
        f"{result.report['violations']}"
    )

    print(
        "Errors: "
        f"{result.report['errors']}"
    )

    print(
        "Warnings: "
        f"{result.report['warnings']}"
    )

    print(
        "Passed: "
        f"{result.report['passed']}"
    )

    print(
        f"Audit: {target}"
    )

    return (
        0
        if result.report[
            "passed"
        ]
        else 2
    )


if __name__ == "__main__":

    raise SystemExit(
        main()
    )
