from __future__ import annotations

import argparse
from pathlib import Path

from father.runtime.story.extractor import (
    StoryExtractor,
)
from father.runtime.story.local_provider import (
    LlamaCppStoryProvider,
)
from father.runtime.story.model_router import (
    route_story_model,
)
from father.runtime.story.store import (
    save_extraction_draft,
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

    source_path = Path(
        args.input
    )

    source_text = source_path.read_text(
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

    print(
        "FATHER Story Extractor"
    )

    print(
        f"Model: {spec.model_id}"
    )

    print(
        f"Source characters: {len(source_text)}"
    )

    provider = LlamaCppStoryProvider(
        spec=spec,
    )

    print(
        f"GGUF: {provider.model_file}"
    )

    extractor = StoryExtractor(
        generate=provider.generate
    )

    try:
        result = extractor.extract(
            source_text=source_text,
            project_id=args.project_id,
            title=args.title,
        )

    except Exception:
        raw = extractor.last_raw_response

        if raw:
            debug_dir = (
                Path(__file__)
                .resolve()
                .parents[4]
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
                / "last-story-model-output.txt"
            )

            debug_file.write_text(
                raw,
                encoding="utf-8",
            )

            print(
                f"Raw model output: {debug_file}"
            )

        raise

    target = save_extraction_draft(
        result
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
        f"Relationships: {len(result.project.relationships)}"
    )

    print(
        f"Findings: {len(result.findings)}"
    )

    print(
        f"Warnings: {len(result.warnings)}"
    )

    print(
        f"Draft: {target}"
    )

    return 0


if __name__ == "__main__":
    raise SystemExit(
        main()
    )
