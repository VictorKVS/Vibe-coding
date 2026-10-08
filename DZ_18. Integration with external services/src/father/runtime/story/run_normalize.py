from __future__ import annotations

import argparse
import json
from datetime import datetime
from pathlib import Path

from father.runtime.story.fact_schema import (
    validate_raw_story_facts,
)
from father.runtime.story.normalizer import (
    normalize_story,
)
from father.runtime.story.provenance_schema import (
    validate_provenance,
)


ROOT = (
    Path(__file__)
    .resolve()
    .parents[4]
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
        "--facts",
        required=True,
    )

    parser.add_argument(
        "--provenance",
        required=True,
    )

    args = parser.parse_args()


    facts_path = Path(
        args.facts
    )

    provenance_path = Path(
        args.provenance
    )


    facts_payload = json.loads(
        facts_path.read_text(
            encoding="utf-8"
        )
    )

    provenance_payload = json.loads(
        provenance_path.read_text(
            encoding="utf-8"
        )
    )


    facts = validate_raw_story_facts(
        facts_payload
    )

    provenance = validate_provenance(
        provenance_payload
    )


    result = normalize_story(
        facts=facts,
        provenance=provenance,
    )


    result.report[
        "inputs"
    ] = {
        "facts": str(
            facts_path.resolve()
        ),
        "provenance": str(
            provenance_path.resolve()
        ),
    }


    target_dir = (
        ROOT
        / "runtime-data"
        / "story"
        / "projects"
        / result.project.project_id
        / "canon"
    )

    target_dir.mkdir(
        parents=True,
        exist_ok=True,
    )


    stamp = datetime.now().strftime(
        "%Y%m%d-%H%M%S"
    )


    project_file = (
        target_dir
        / f"{stamp}-story-project.json"
    )

    report_file = (
        target_dir
        / f"{stamp}-normalization-report.json"
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


    report_file.write_text(
        json.dumps(
            result.report,
            ensure_ascii=False,
            indent=2,
        ),
        encoding="utf-8",
    )


    print(
        "FATHER Story Canon Normalizer"
    )

    print(
        "Mode: deterministic"
    )

    print(
        "LLM used: no"
    )

    print(
        f"Characters: {len(result.project.characters)}"
    )

    print(
        f"Locations: {len(result.project.locations)}"
    )

    print(
        f"Scenes: {len(result.project.scenes)}"
    )

    print(
        f"Events: {len(result.project.events)}"
    )

    print(
        "Relationships: "
        f"{len(result.project.relationships)}"
    )

    print(
        "Evidence attached: "
        f"{result.report['attached_evidence']}"
    )

    print(
        f"StoryProject: {project_file}"
    )

    print(
        f"Report: {report_file}"
    )

    return 0


if __name__ == "__main__":

    raise SystemExit(
        main()
    )
