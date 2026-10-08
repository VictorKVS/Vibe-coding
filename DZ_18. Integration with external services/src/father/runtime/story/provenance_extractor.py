from __future__ import annotations

import json
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Callable, Dict, List, Tuple

from father.runtime.story.provenance_schema import (
    EvidenceRecord,
    StoryProvenanceResult,
    validate_provenance,
)


EvidenceRequirement = Dict[str, str]


def build_required_evidence_plan(
    core_facts: Dict[str, Any],
) -> List[EvidenceRequirement]:
    """
    Build deterministic evidence coverage requirements.

    Stage B must not decide by itself what is important enough
    to document. Stage A facts define the required coverage.
    """

    plan: List[EvidenceRequirement] = []

    for character in core_facts.get(
        "characters",
        [],
    ):

        character_id = character.get(
            "character_id",
            "",
        )

        if not character_id:
            continue

        plan.append(
            {
                "entity_type": "character",
                "entity_id": character_id,
                "field_path": "identity",
            }
        )

        if character.get(
            "age"
        ) is not None:

            plan.append(
                {
                    "entity_type": "character",
                    "entity_id": character_id,
                    "field_path": "age",
                }
            )

    for location in core_facts.get(
        "locations",
        [],
    ):

        location_id = location.get(
            "location_id",
            "",
        )

        if not location_id:
            continue

        plan.append(
            {
                "entity_type": "location",
                "entity_id": location_id,
                "field_path": "description",
            }
        )

    for event in core_facts.get(
        "events",
        [],
    ):

        event_id = event.get(
            "event_id",
            "",
        )

        if not event_id:
            continue

        plan.append(
            {
                "entity_type": "event",
                "entity_id": event_id,
                "field_path": "event",
            }
        )

    for relationship in core_facts.get(
        "relationships",
        [],
    ):

        relationship_id = relationship.get(
            "relationship_id",
            "",
        )

        if not relationship_id:
            continue

        plan.append(
            {
                "entity_type": "relationship",
                "entity_id": relationship_id,
                "field_path": "relationship",
            }
        )

    return plan


def _requirement_key(
    item,
) -> Tuple[str, str, str]:

    if isinstance(
        item,
        dict,
    ):

        return (
            str(
                item.get(
                    "entity_type",
                    "",
                )
            ),
            str(
                item.get(
                    "entity_id",
                    "",
                )
            ),
            str(
                item.get(
                    "field_path",
                    "",
                )
            ),
        )

    return (
        str(
            item.entity_type
        ),
        str(
            item.entity_id
        ),
        str(
            item.field_path
        ),
    )


def missing_required_evidence(
    core_facts: Dict[str, Any],
    result: StoryProvenanceResult,
) -> List[EvidenceRequirement]:

    required = build_required_evidence_plan(
        core_facts
    )

    covered = {
        _requirement_key(
            item
        )
        for item in result.evidence
    }

    return [
        item
        for item in required
        if _requirement_key(
            item
        ) not in covered
    ]


def build_provenance_prompt(
    source_text: str,
    core_facts: Dict[str, Any],
    project_id: str,
) -> str:

    compact_facts = json.dumps(
        core_facts,
        ensure_ascii=False,
        separators=(",", ":"),
    )

    required = build_required_evidence_plan(
        core_facts
    )

    required_json = json.dumps(
        required,
        ensure_ascii=False,
        separators=(",", ":"),
    )

    return f"""
You are FATHER Story Evidence Analyst.

This is STAGE B.

Stage A already extracted story entities.
Do not recreate Stage A.

Return exactly one JSON object.
No Markdown.
No commentary.
No reasoning outside JSON.

Your main task is EVIDENCE COVERAGE.

REQUIRED EVIDENCE PLAN:

{required_json}

You MUST produce an evidence record for every item
in REQUIRED EVIDENCE PLAN.

For each requirement, preserve exactly:
- entity_type
- entity_id
- field_path

Do not rename field_path values.

ORIGIN RULES

canon:
The information is explicitly stated
in the original source.

inference:
The information is derived or interpreted
rather than directly stated.

A negative explicit statement is still CANON.

Example:

"Andrey did not tell Marina that Lira helped him."

This is CANON.

Do not classify an explicit decision, concealment,
absence, distrust statement or negative statement
as inference merely because it describes behavior.

CONFIDENCE

1.0:
direct explicit statement.

0.85 to 0.99:
direct information requiring minor normalization.

0.60 to 0.84:
reasonable inference.

SOURCE FRAGMENT

Use the shortest source fragment sufficient
to prove the record.

Do not copy large paragraphs.

CHARACTER IDENTITY

For field_path "identity":
use evidence proving the character exists
and, where available, their explicit role.

AGE

For field_path "age":
find direct age evidence in ORIGINAL SOURCE.

Convert written numbers conceptually.

Example:

"forty-two years old"

supports:

value_summary:
"Andrey is 42 years old."

origin:
"canon"

confidence:
1.0

EVENT

For field_path "event":
find source evidence supporting the Stage A event.

RELATIONSHIP

For field_path "relationship":
classify explicit relations as canon.
Use inference only when the relationship meaning
is genuinely derived.

PROPOSALS

Proposals are not evidence.

They are optional.
Maximum five.

They must never modify canon automatically.

PROJECT ID:
{project_id}

STAGE A CORE FACTS:
{compact_facts}

ORIGINAL SOURCE:
{source_text}
""".strip()


def build_repair_prompt(
    source_text: str,
    core_facts: Dict[str, Any],
    project_id: str,
    missing: List[EvidenceRequirement],
) -> str:

    missing_json = json.dumps(
        missing,
        ensure_ascii=False,
        separators=(",", ":"),
    )

    compact_facts = json.dumps(
        core_facts,
        ensure_ascii=False,
        separators=(",", ":"),
    )

    return f"""
You are FATHER Story Evidence Repair.

A previous evidence extraction was incomplete.

Return exactly one JSON object.
No Markdown.
No commentary.
No reasoning outside JSON.

Generate ONLY the missing evidence records listed below.

MISSING REQUIRED EVIDENCE:

{missing_json}

For every item above:
preserve exactly:
- entity_type
- entity_id
- field_path

Do not omit any item.

Use ORIGINAL SOURCE as the authority.

ORIGIN:

canon:
directly supported by source.

inference:
derived interpretation only.

A negative explicit source statement is canon.

If age is written in words,
normalize it to a numeric meaning
in value_summary.

Use the shortest useful source_fragment.

Set proposals to [].
Use warnings only for a genuine inability
to support a required record.

PROJECT ID:
{project_id}

STAGE A CORE FACTS:
{compact_facts}

ORIGINAL SOURCE:
{source_text}
""".strip()


def parse_provenance_payload(
    raw: str,
) -> Dict[str, Any]:

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

            project_id = value.get(
                "project_id"
            )

            evidence = value.get(
                "evidence"
            )

            proposals = value.get(
                "proposals"
            )

            if (
                isinstance(project_id, str)
                and isinstance(evidence, list)
                and isinstance(proposals, list)
            ):
                candidates.append(
                    value
                )

        cursor = start + 1

    if not candidates:
        raise ValueError(
            "No StoryProvenance JSON payload found."
        )

    return max(
        candidates,
        key=lambda value: (
            len(
                value.get(
                    "evidence",
                    [],
                )
            )
            * 10
            + len(
                value.get(
                    "proposals",
                    [],
                )
            )
        ),
    )


def _merge_evidence(
    first: List[EvidenceRecord],
    second: List[EvidenceRecord],
) -> List[EvidenceRecord]:

    result: List[EvidenceRecord] = []

    seen = set()

    for item in (
        list(first)
        + list(second)
    ):

        key = _requirement_key(
            item
        )

        if key in seen:
            continue

        seen.add(
            key
        )

        result.append(
            item
        )

    for index, item in enumerate(
        result,
        start=1,
    ):
        item.evidence_id = (
            f"EVID-{index:03d}"
        )

    return result


@dataclass
class StoryProvenanceExtractor:

    generate: Callable[..., str]

    last_raw_response: str = field(
        default="",
        init=False,
    )

    repair_used: bool = field(
        default=False,
        init=False,
    )

    def _generate_result(
        self,
        prompt: str,
        json_schema_file: Path,
    ) -> StoryProvenanceResult:

        raw = self.generate(
            prompt,
            max_tokens=4096,
            temperature=0.1,
            json_schema_file=json_schema_file,
            reasoning=False,
        )

        self.last_raw_response = raw

        payload = parse_provenance_payload(
            raw
        )

        return validate_provenance(
            payload
        )

    def extract(
        self,
        source_text: str,
        core_facts: Dict[str, Any],
        project_id: str,
        json_schema_file: Path,
    ) -> StoryProvenanceResult:

        if not source_text.strip():
            raise ValueError(
                "Source story is empty."
            )

        if not core_facts:
            raise ValueError(
                "Core facts are empty."
            )

        prompt = build_provenance_prompt(
            source_text=source_text,
            core_facts=core_facts,
            project_id=project_id,
        )

        result = self._generate_result(
            prompt=prompt,
            json_schema_file=json_schema_file,
        )

        result.project_id = project_id

        missing = missing_required_evidence(
            core_facts=core_facts,
            result=result,
        )

        if missing:

            self.repair_used = True

            repair_prompt = build_repair_prompt(
                source_text=source_text,
                core_facts=core_facts,
                project_id=project_id,
                missing=missing,
            )

            repair = self._generate_result(
                prompt=repair_prompt,
                json_schema_file=json_schema_file,
            )

            result.evidence = _merge_evidence(
                first=result.evidence,
                second=repair.evidence,
            )

            for warning in repair.warnings:

                if warning not in result.warnings:
                    result.warnings.append(
                        warning
                    )

        missing_after_repair = missing_required_evidence(
            core_facts=core_facts,
            result=result,
        )

        if missing_after_repair:

            details = ", ".join(
                (
                    item["entity_id"]
                    + ":"
                    + item["field_path"]
                )
                for item in missing_after_repair
            )

            raise ValueError(
                "Provenance coverage incomplete after repair: "
                + details
            )

        if not result.evidence:
            raise ValueError(
                "Provenance extraction produced no evidence."
            )

        return result
