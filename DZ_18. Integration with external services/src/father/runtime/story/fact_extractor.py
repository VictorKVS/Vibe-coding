from __future__ import annotations

import json
from dataclasses import dataclass, field
from pathlib import Path
from typing import Callable, Dict, Any

from father.runtime.story.fact_schema import (
    RawStoryFacts,
    validate_raw_story_facts,
)


def build_fact_prompt(
    source_text: str,
    project_id: str,
    title: str,
) -> str:

    return f"""
You are FATHER Story Core Fact Extractor.

Extract ONLY structural story facts.

Return exactly one JSON object.
No Markdown.
No commentary.
No reasoning in the answer.
Do not repeat the source text.

THIS IS STAGE A.

Extract:

- project metadata
- characters
- locations
- scenes
- events
- relationships
- warnings

DO NOT produce provenance findings in this pass.

DO NOT produce:
- source_fragment
- rationale
- psychological analysis
- comic proposals
- literary criticism
- research suggestions

Those belong to later stages.

RULES:

1. Preserve names and chronology.

2. Use stable IDs.

Examples:

CHAR-ANDREY-001
CHAR-LIRA-001
CHAR-MARINA-001

LOC-LAB-001

SCENE-001

EVT-001

REL-001

3. Keep all text fields short.

4. Event action must be a short verb phrase.

5. Event content must be one short factual sentence.

6. Consequences:
maximum four short items.

7. Do not duplicate the same event.

8. Do not invent age.

9. adult_status:
- adult only if clearly supported
- minor only if clearly supported
- otherwise unknown

10. Character knowledge must remain local.

11. A scene should reference existing character IDs
and event IDs.

12. An event should reference existing IDs whenever possible.

13. Relationship descriptions must describe only
relationships supported by the source.

14. Each explicit action, observation, warning, information transfer, decision, instruction or concealment that changes story state or character knowledge should be represented as an event.

15. Do not collapse several distinct factual actions into one event.

For example, these are normally separate events:
- entering a place
- observing or checking something
- receiving a warning
- learning new information
- making a decision
- giving an instruction
- deliberately withholding information

16. If an age is explicitly stated, extract the exact age.
Convert spelled-out ages to an integer when unambiguous.

17. Do not omit important explicit events merely to shorten the output.
Shorten descriptions instead.

18. Keep event action and content concise and factual.

19. Always finish and close the complete root JSON.

PROJECT ID:
{project_id}

TITLE:
{title}

SOURCE STORY:

{source_text}
""".strip()


def parse_fact_payload(
    raw: str,
) -> Dict[str, Any]:
    """
    Parse Stage A Core Fact JSON.

    Stage A requires structural story facts only.

    Required semantic collections:
    - characters
    - events

    Optional collections:
    - locations
    - scenes
    - relationships
    - findings
    - warnings

    Provenance findings are intentionally optional because
    they belong to Stage B.
    """

    text = raw.strip()

    decoder = json.JSONDecoder()

    candidates = []

    cursor = 0

    while True:

        start = text.find(
            "{",
            cursor,
        )

        if start < 0:
            break

        try:
            value, _end = decoder.raw_decode(
                text[start:]
            )

        except json.JSONDecodeError:
            cursor = start + 1
            continue

        if isinstance(
            value,
            dict,
        ):

            characters = value.get(
                "characters"
            )

            events = value.get(
                "events"
            )

            project_id = value.get(
                "project_id"
            )

            if (
                isinstance(project_id, str)
                and isinstance(characters, list)
                and isinstance(events, list)
            ):
                candidates.append(
                    value
                )

        cursor = start + 1

    if not candidates:
        raise ValueError(
            "No Core RawStoryFacts JSON payload found."
        )

    def score(
        value: Dict[str, Any],
    ) -> int:

        weights = {
            "characters": 12,
            "locations": 8,
            "scenes": 10,
            "events": 12,
            "relationships": 6,
            "findings": 2,
        }

        total = 0

        for key, weight in weights.items():

            items = value.get(
                key,
                []
            )

            if isinstance(
                items,
                list,
            ):
                total += (
                    len(items)
                    * weight
                )

        if value.get(
            "premise"
        ):
            total += 2

        if value.get(
            "title"
        ):
            total += 1

        return total

    return max(
        candidates,
        key=score,
    )


@dataclass
class StoryFactExtractor:
    generate: Callable[..., str]

    last_raw_response: str = field(
        default="",
        init=False,
    )

    def extract(
        self,
        source_text: str,
        project_id: str,
        title: str,
        json_schema_file: Path,
    ) -> RawStoryFacts:

        if not source_text.strip():
            raise ValueError(
                "Source story is empty."
            )

        prompt = build_fact_prompt(
            source_text=source_text,
            project_id=project_id,
            title=title,
        )

        raw = self.generate(
            prompt,
            max_tokens=4096,
            temperature=0.1,
            json_schema_file=json_schema_file,
            reasoning=False,
        )

        self.last_raw_response = raw

        payload = parse_fact_payload(
            raw
        )

        result = validate_raw_story_facts(
            payload
        )

        result.project_id = project_id

        if not result.title:
            result.title = title

        meaningful = sum(
            [
                len(result.characters),
                len(result.locations),
                len(result.scenes),
                len(result.events),
                len(result.relationships),
                len(result.findings),
            ]
        )

        if meaningful == 0:
            raise ValueError(
                "Fact extraction produced no knowledge."
            )

        return result
