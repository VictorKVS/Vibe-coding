from __future__ import annotations

import json
from pathlib import Path
from typing import List, Literal

from pydantic import BaseModel, Field


EvidenceOrigin = Literal[
    "canon",
    "inference",
]


EvidenceEntityType = Literal[
    "project",
    "character",
    "location",
    "scene",
    "event",
    "relationship",
]


ProposalCategory = Literal[
    "psychology",
    "visual",
    "continuity",
    "story",
    "comic",
    "other",
]


class EvidenceRecord(BaseModel):

    evidence_id: str

    entity_type: EvidenceEntityType
    entity_id: str

    field_path: str
    value_summary: str

    origin: EvidenceOrigin

    source_fragment: str

    confidence: float = Field(
        ge=0.0,
        le=1.0,
    )

    rationale: str


class ProposalRecord(BaseModel):

    proposal_id: str

    entity_type: EvidenceEntityType
    entity_id: str

    category: ProposalCategory

    value: str

    confidence: float = Field(
        ge=0.0,
        le=1.0,
    )

    rationale: str


class StoryProvenanceResult(BaseModel):

    project_id: str

    evidence: List[EvidenceRecord] = Field(
        default_factory=list
    )

    proposals: List[ProposalRecord] = Field(
        default_factory=list
    )

    warnings: List[str] = Field(
        default_factory=list
    )


PROVENANCE_JSON_SCHEMA = {
    "type": "object",

    "properties": {
        "project_id": {
            "type": "string",
            "maxLength": 120,
        },

        "evidence": {
            "type": "array",
            "maxItems": 80,

            "items": {
                "type": "object",

                "properties": {
                    "evidence_id": {
                        "type": "string",
                        "maxLength": 100,
                    },

                    "entity_type": {
                        "type": "string",
                        "enum": [
                            "project",
                            "character",
                            "location",
                            "scene",
                            "event",
                            "relationship",
                        ],
                    },

                    "entity_id": {
                        "type": "string",
                        "maxLength": 120,
                    },

                    "field_path": {
                        "type": "string",
                        "maxLength": 100,
                    },

                    "value_summary": {
                        "type": "string",
                        "maxLength": 220,
                    },

                    "origin": {
                        "type": "string",
                        "enum": [
                            "canon",
                            "inference",
                        ],
                    },

                    "source_fragment": {
                        "type": "string",
                        "maxLength": 260,
                    },

                    "confidence": {
                        "type": "number",
                        "minimum": 0.0,
                        "maximum": 1.0,
                    },

                    "rationale": {
                        "type": "string",
                        "maxLength": 220,
                    },
                },

                "required": [
                    "evidence_id",
                    "entity_type",
                    "entity_id",
                    "field_path",
                    "value_summary",
                    "origin",
                    "source_fragment",
                    "confidence",
                    "rationale",
                ],

                "additionalProperties": False,
            },
        },

        "proposals": {
            "type": "array",
            "maxItems": 5,

            "items": {
                "type": "object",

                "properties": {
                    "proposal_id": {
                        "type": "string",
                        "maxLength": 100,
                    },

                    "entity_type": {
                        "type": "string",
                        "enum": [
                            "project",
                            "character",
                            "location",
                            "scene",
                            "event",
                            "relationship",
                        ],
                    },

                    "entity_id": {
                        "type": "string",
                        "maxLength": 120,
                    },

                    "category": {
                        "type": "string",
                        "enum": [
                            "psychology",
                            "visual",
                            "continuity",
                            "story",
                            "comic",
                            "other",
                        ],
                    },

                    "value": {
                        "type": "string",
                        "maxLength": 260,
                    },

                    "confidence": {
                        "type": "number",
                        "minimum": 0.0,
                        "maximum": 1.0,
                    },

                    "rationale": {
                        "type": "string",
                        "maxLength": 220,
                    },
                },

                "required": [
                    "proposal_id",
                    "entity_type",
                    "entity_id",
                    "category",
                    "value",
                    "confidence",
                    "rationale",
                ],

                "additionalProperties": False,
            },
        },

        "warnings": {
            "type": "array",
            "maxItems": 10,

            "items": {
                "type": "string",
                "maxLength": 240,
            },
        },
    },

    "required": [
        "project_id",
        "evidence",
        "proposals",
        "warnings",
    ],

    "additionalProperties": False,
}


def write_provenance_json_schema(
    path: Path,
) -> Path:

    path.parent.mkdir(
        parents=True,
        exist_ok=True,
    )

    path.write_text(
        json.dumps(
            PROVENANCE_JSON_SCHEMA,
            ensure_ascii=False,
            indent=2,
        ),
        encoding="utf-8",
    )

    return path


def validate_provenance(
    payload,
) -> StoryProvenanceResult:

    if hasattr(
        StoryProvenanceResult,
        "model_validate",
    ):
        return StoryProvenanceResult.model_validate(
            payload
        )

    return StoryProvenanceResult.parse_obj(
        payload
    )
