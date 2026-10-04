from __future__ import annotations

import argparse
import json
from datetime import datetime
from pathlib import Path

from father.runtime.story.fact_extractor import (
    StoryFactExtractor,
)
from father.runtime.story.fact_schema import (
    write_fact_json_schema,
)
from father.runtime.story.local_provider import (
    LlamaCppStoryProvider,
)
from father.runtime.story.model_router import (
    route_story_model,
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
        "--project-id",
        required=True,
    )

    parser.add_argument(
        "--title",
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

    schema_file = write_fact_json_schema(
        contracts
        / "raw-story-facts.schema.json"
    )

    extractor = StoryFactExtractor(
        generate=provider.generate
    )

    try:
        result = extractor.extract(
            source_text=source,
            project_id=args.project_id,
            title=args.title,
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

            raw_file = (
                debug_dir
                / "last-fact-model-output.txt"
            )

            raw_file.write_text(
                extractor.last_raw_response,
                encoding="utf-8",
            )

            print(
                f"Raw output: {raw_file}"
            )

        raise

    target_dir = (
        ROOT
        / "runtime-data"
        / "story"
        / "projects"
        / args.project_id
        / "facts"
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
        / f"{stamp}-facts.json"
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
        "FATHER Raw Story Facts"
    )

    print(
        f"Model: {spec.model_id}"
    )

    print(
        f"Characters: {len(result.characters)}"
    )

    print(
        f"Locations: {len(result.locations)}"
    )

    print(
        f"Scenes: {len(result.scenes)}"
    )

    print(
        f"Events: {len(result.events)}"
    )

    print(
        f"Relationships: {len(result.relationships)}"
    )

    print(
        f"Findings: {len(result.findings)}"
    )

    print(
        f"Warnings: {len(result.warnings)}"
    )

    print(
        f"Facts: {target}"
    )

    return 0


if __name__ == "__main__":
    raise SystemExit(
        main()
    )
