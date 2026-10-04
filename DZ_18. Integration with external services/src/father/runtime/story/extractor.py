from __future__ import annotations

import json
from dataclasses import dataclass
from typing import Any, Callable, Dict, List, Literal

from pydantic import BaseModel, Field

from father.runtime.story.schema import StoryProject


OriginType = Literal[
    "canon",
    "inference",
    "proposal",
]


class ExtractionFinding(BaseModel):
    entity_type: str
    entity_id: str
    field_path: str

    value: Any

    origin: OriginType

    source_fragment: str = ""

    confidence: float = Field(
        default=1.0,
        ge=0.0,
        le=1.0,
    )

    rationale: str = ""


class StoryExtractionResult(BaseModel):
    project: StoryProject

    findings: List[ExtractionFinding] = Field(
        default_factory=list
    )

    warnings: List[str] = Field(
        default_factory=list
    )


def _validate_result(
    payload: Dict[str, Any],
) -> StoryExtractionResult:

    if hasattr(
        StoryExtractionResult,
        "model_validate",
    ):
        return StoryExtractionResult.model_validate(
            payload
        )

    return StoryExtractionResult.parse_obj(
        payload
    )


def parse_json_object(
    raw: str,
) -> Dict[str, Any]:
    """
    Extract the final valid JSON object from model output.

    llama.cpp may return:
    - echoed prompt text,
    - reasoning text,
    - Markdown fences,
    - example JSON from the prompt,
    - final assistant JSON.

    We therefore scan all JSON-object starts and prefer
    the LAST object matching the StoryExtractionResult
    top-level contract.
    """

    text = raw.strip()

    decoder = json.JSONDecoder()

    generic_candidates = []
    story_candidates = []

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
            generic_candidates.append(
                value
            )

            project = value.get(
                "project"
            )

            findings = value.get(
                "findings"
            )

            if (
                isinstance(project, dict)
                and isinstance(findings, list)
            ):
                story_candidates.append(
                    value
                )

        cursor = start + 1

    if story_candidates:
        return story_candidates[-1]

    if generic_candidates:
        return generic_candidates[-1]

    raise ValueError(
        "LLM response contains no valid JSON object."
    )


def build_extraction_prompt(
    source_text: str,
    project_id: str,
    title: str,
) -> str:

    instructions = r"""
You are FATHER Story Analyst.

Convert narrative prose into a structured
FATHER Story Engine representation.

The source may be Russian.

IMPORTANT DATA CLASSES

CANON:
A fact explicitly supported by source text.

INFERENCE:
A plausible interpretation derived from source text.
It must never silently become canon.

PROPOSAL:
An artistic, structural, psychological, visual,
comic or research suggestion not explicitly present
in the source.

RULES

1. Preserve names, chronology and causal meaning.

2. Track:
   - who said what
   - who did what
   - to whom
   - where
   - before-state
   - after-state
   - consequences

3. Extract persistent characters.

4. Extract persistent locations.

5. Extract important objects and props.

6. Extract relationships and their changes.

7. Character knowledge is local.
A character may know only what that character
learned, observed or was told.

8. Never infer personality from facial anatomy.

9. For comic design, psychology may intentionally
affect:
   - expression
   - gaze
   - posture
   - gestures
   - movement
   - silhouette
   - shape language

This is artistic character design,
not physiognomic diagnosis.

10. Never invent age as canon.

11. If adulthood is not explicit,
adult_status must remain "unknown".

12. Do not rewrite or improve canon automatically.

13. Improvements belong in proposals.

14. Every important extracted fact should have
an ExtractionFinding containing:
   entity_type
   entity_id
   field_path
   value
   origin
   source_fragment
   confidence
   rationale

15. Build story skeleton nodes when possible.

16. Build SceneCard objects.

17. Build StoryEvent objects.

18. Build RelationshipState objects.

19. Build CanonState from confirmed facts only.

20. Comic visual suggestions not directly stated
in the source are PROPOSALS.

RETURN JSON ONLY.

No Markdown.
No commentary outside JSON.

Expected top-level structure:

{
  "project": {
    "project_id": "...",
    "title": "...",
    "genre": [],
    "premise": "",
    "target_products": ["novel", "comic"],
    "style": {},
    "skeleton": [],
    "characters": [],
    "locations": [],
    "scenes": [],
    "events": [],
    "relationships": [],
    "canon": {},
    "proposals": []
  },
  "findings": [],
  "warnings": []
}

Use stable IDs such as:

CHAR-ANDREY-001
LOC-LAB-001
SCENE-001
EVT-001
REL-001
PROP-001
"""

    return (
        instructions
        + "\n\nPROJECT ID:\n"
        + project_id
        + "\n\nTITLE:\n"
        + title
        + "\n\nSOURCE STORY:\n"
        + source_text
    )


@dataclass
class StoryExtractor:
    generate: Callable[[str], str]

    def extract(
        self,
        source_text: str,
        project_id: str,
        title: str,
    ) -> StoryExtractionResult:

        if not source_text.strip():
            raise ValueError(
                "Source story is empty."
            )

        prompt = build_extraction_prompt(
            source_text=source_text,
            project_id=project_id,
            title=title,
        )

        raw = self.generate(
            prompt
        )

        payload = parse_json_object(
            raw
        )

        result = _validate_result(
            payload
        )

        if (
            result.project.project_id
            != project_id
        ):
            result.warnings.append(
                "Model changed project_id."
            )

            result.project.project_id = (
                project_id
            )

        if not result.project.title:
            result.project.title = title

        return result
