from __future__ import annotations

import argparse
import json
from datetime import datetime
from pathlib import Path

from father.runtime.story.schema import (
    StoryProject,
)
from father.runtime.story.continuity_ledger import (
    build_continuity_ledgers,
)
from father.runtime.story.continuity_ledger_schema import (
    ContinuityDirectiveBundle,
)


ROOT = (
    Path(__file__)
    .resolve()
    .parents[4]
)


def validate(
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
        "--directives",
        default="",
    )

    args = parser.parse_args()


    project = validate(
        StoryProject,

        json.loads(
            Path(
                args.project
            ).read_text(
                encoding="utf-8"
            )
        ),
    )


    if args.directives:

        bundle = validate(
            ContinuityDirectiveBundle,

            json.loads(
                Path(
                    args.directives
                ).read_text(
                    encoding="utf-8"
                )
            ),
        )

    else:

        bundle = (
            ContinuityDirectiveBundle(
                project_id=(
                    project.project_id
                ),

                directives=[],
            )
        )


    result = build_continuity_ledgers(
        project=project,
        bundle=bundle,
    )


    target_dir = (
        ROOT
        / "runtime-data"
        / "story"
        / "projects"
        / project.project_id
        / "continuity-ledger"
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
        / f"{stamp}-continuity-ledger.json"
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
        "FATHER Story Continuity Ledger"
    )

    print(
        "Mode: deterministic"
    )

    print(
        "LLM used: no"
    )

    print(
        "Directives: "
        f"{result.report['directives']}"
    )

    print(
        "Objects: "
        f"{result.report['objects']}"
    )

    print(
        "Injuries: "
        f"{result.report['injuries']}"
    )

    print(
        "Commitments: "
        f"{result.report['commitments']}"
    )

    print(
        "Goals: "
        f"{result.report['goals']}"
    )

    print(
        "Violations: "
        f"{result.report['violations']}"
    )

    print(
        "Passed: "
        f"{result.report['passed']}"
    )

    print(
        f"Ledger: {target}"
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
