from __future__ import annotations

import argparse
import json
from datetime import datetime
from pathlib import Path

from father.runtime.story.local_provider import (
    LlamaCppStoryProvider,
)
from father.runtime.story.model_router import (
    route_story_model,
)
from father.runtime.story.provenance_extractor import (
    StoryProvenanceExtractor,
)
from father.runtime.story.provenance_schema import (
    write_provenance_json_schema,
)


ROOT = (
    Path(__file__)
    .resolve()
    .parents[4]
)


def dump_model(value):

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
        "--input",
        required=True,
    )

    parser.add_argument(
        "--facts",
        required=True,
    )

    parser.add_argument(
        "--project-id",
        required=True,
    )

    parser.add_argument(
        "--model",
        choices=[
            "auto",
            "3b",
            "8b",
            "14b",
        ],
        default="auto",
    )

    args = parser.parse_args()

    source = Path(
        args.input
    ).read_text(
        encoding="utf-8-sig"
    )

    facts = json.loads(
        Path(
            args.facts
        ).read_text(
            encoding="utf-8"
        )
    )

    if args.model == "auto":

        spec = route_story_model(
            task="story_extract",
            mode="auto",
        )

    else:

        spec = route_story_model(
            task="story_extract",
            mode="manual",
            manual_model=args.model,
        )

    provider = LlamaCppStoryProvider(
        spec=spec,
    )

    contracts = (
        ROOT
        / "runtime-data"
        / "story"
        / "contracts"
    )

    schema_file = write_provenance_json_schema(
        contracts
        / "story-provenance.schema.json"
    )

    extractor = StoryProvenanceExtractor(
        generate=provider.generate
    )

    try:

        result = extractor.extract(
            source_text=source,
            core_facts=facts,
            project_id=args.project_id,
            json_schema_file=schema_file,
        )

    except Exception:

        if extractor.last_raw_response:

            debug_dir = (
                ROOT
                / "runtime-data"
                / "story"
                / "debug"
            )

            debug_dir.mkdir(
                parents=True,
                exist_ok=True,
            )

            debug_file = (
                debug_dir
                / "last-provenance-model-output.txt"
            )

            debug_file.write_text(
                extractor.last_raw_response,
                encoding="utf-8",
            )

            print(
                f"Raw output: {debug_file}"
            )

        raise

    target_dir = (
        ROOT
        / "runtime-data"
        / "story"
        / "projects"
        / args.project_id
        / "provenance"
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
        / f"{stamp}-provenance.json"
    )

    target.write_text(
        json.dumps(
            dump_model(result),
            ensure_ascii=False,
            indent=2,
        ),
        encoding="utf-8",
    )

    print(
        "FATHER Story Provenance"
    )

    print(
        f"Model: {spec.model_id}"
    )

    print(
        f"Evidence: {len(result.evidence)}"
    )

    print(
        f"Proposals: {len(result.proposals)}"
    )

    print(
        f"Warnings: {len(result.warnings)}"
    )

    print(
        f"Provenance: {target}"
    )

    return 0


if __name__ == "__main__":
    raise SystemExit(
        main()
    )
