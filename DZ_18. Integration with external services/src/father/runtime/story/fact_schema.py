from __future__ import annotations

import json
from pathlib import Path
from typing import Any, List, Literal, Optional

from pydantic import BaseModel, Field


class FactFinding(BaseModel):
    entity_type: str
    entity_id: str
    field_path: str
    value: Any

    origin: Literal[
        "canon",
        "inference",
        "proposal",
    ]

    source_fragment: str = ""

    confidence: float = Field(
        default=1.0,
        ge=0.0,
        le=1.0,
    )

    rationale: str = ""


class FactCharacter(BaseModel):
    character_id: str
    name: str

    age: Optional[int] = None

    adult_status: Literal[
        "unknown",
        "minor",
        "adult",
    ] = "unknown"

    role: str = ""


class FactLocation(BaseModel):
    location_id: str
    name: str
    description: str = ""


class FactScene(BaseModel):
    scene_id: str
    title: str

    location_id: str = ""

    character_ids: List[str] = Field(
        default_factory=list
    )

    event_ids: List[str] = Field(
        default_factory=list
    )


class FactEvent(BaseModel):
    event_id: str

    scene_id: str = ""

    actor_id: str = ""
    action: str

    target_id: str = ""
    location_id: str = ""

    content: str = ""

    consequences: List[str] = Field(
        default_factory=list
    )


class FactRelationship(BaseModel):
    relationship_id: str

    source_character_id: str
    target_character_id: str

    relationship_type: str

    description: str = ""


class RawStoryFacts(BaseModel):
    project_id: str
    title: str

    premise: str = ""

    genre: List[str] = Field(
        default_factory=list
    )

    characters: List[FactCharacter] = Field(
        default_factory=list
    )

    locations: List[FactLocation] = Field(
        default_factory=list
    )

    scenes: List[FactScene] = Field(
        default_factory=list
    )

    events: List[FactEvent] = Field(
        default_factory=list
    )

    relationships: List[FactRelationship] = Field(
        default_factory=list
    )

    findings: List[FactFinding] = Field(
        default_factory=list
    )

    warnings: List[str] = Field(
        default_factory=list
    )


FACT_JSON_SCHEMA = {
    "type": "object",

    "properties": {
        "project_id": {
            "type": "string"
        },

        "title": {
            "type": "string"
        },

        "premise": {
            "type": "string"
        },

        "genre": {
            "type": "array",
            "items": {
                "type": "string"
            }
        },

        "characters": {
            "type": "array",
            "items": {
                "type": "object",

                "properties": {
                    "character_id": {
                        "type": "string"
                    },

                    "name": {
                        "type": "string"
                    },

                    "age": {
                        "type": [
                            "integer",
                            "null"
                        ]
                    },

                    "adult_status": {
                        "type": "string",
                        "enum": [
                            "unknown",
                            "minor",
                            "adult"
                        ]
                    },

                    "role": {
                        "type": "string"
                    }
                },

                "required": [
                    "character_id",
                    "name",
                    "age",
                    "adult_status",
                    "role"
                ],

                "additionalProperties": False
            }
        },

        "locations": {
            "type": "array",

            "items": {
                "type": "object",

                "properties": {
                    "location_id": {
                        "type": "string"
                    },

                    "name": {
                        "type": "string"
                    },

                    "description": {
                        "type": "string"
                    }
                },

                "required": [
                    "location_id",
                    "name",
                    "description"
                ],

                "additionalProperties": False
            }
        },

        "scenes": {
            "type": "array",

            "items": {
                "type": "object",

                "properties": {
                    "scene_id": {
                        "type": "string"
                    },

                    "title": {
                        "type": "string"
                    },

                    "location_id": {
                        "type": "string"
                    },

                    "character_ids": {
                        "type": "array",
                        "items": {
                            "type": "string"
                        }
                    },

                    "event_ids": {
                        "type": "array",
                        "items": {
                            "type": "string"
                        }
                    }
                },

                "required": [
                    "scene_id",
                    "title",
                    "location_id",
                    "character_ids",
                    "event_ids"
                ],

                "additionalProperties": False
            }
        },

        "events": {
            "type": "array",

            "items": {
                "type": "object",

                "properties": {
                    "event_id": {
                        "type": "string"
                    },

                    "scene_id": {
                        "type": "string"
                    },

                    "actor_id": {
                        "type": "string"
                    },

                    "action": {
                        "type": "string"
                    },

                    "target_id": {
                        "type": "string"
                    },

                    "location_id": {
                        "type": "string"
                    },

                    "content": {
                        "type": "string"
                    },

                    "consequences": {
                        "type": "array",
                        "items": {
                            "type": "string"
                        }
                    }
                },

                "required": [
                    "event_id",
                    "scene_id",
                    "actor_id",
                    "action",
                    "target_id",
                    "location_id",
                    "content",
                    "consequences"
                ],

                "additionalProperties": False
            }
        },

        "relationships": {
            "type": "array",

            "items": {
                "type": "object",

                "properties": {
                    "relationship_id": {
                        "type": "string"
                    },

                    "source_character_id": {
                        "type": "string"
                    },

                    "target_character_id": {
                        "type": "string"
                    },

                    "relationship_type": {
                        "type": "string"
                    },

                    "description": {
                        "type": "string"
                    }
                },

                "required": [
                    "relationship_id",
                    "source_character_id",
                    "target_character_id",
                    "relationship_type",
                    "description"
                ],

                "additionalProperties": False
            }
        },

        "findings": {
            "type": "array",

            "items": {
                "type": "object",

                "properties": {
                    "entity_type": {
                        "type": "string"
                    },

                    "entity_id": {
                        "type": "string"
                    },

                    "field_path": {
                        "type": "string"
                    },

                    "value": {},

                    "origin": {
                        "type": "string",
                        "enum": [
                            "canon",
                            "inference",
                            "proposal"
                        ]
                    },

                    "source_fragment": {
                        "type": "string"
                    },

                    "confidence": {
                        "type": "number",
                        "minimum": 0.0,
                        "maximum": 1.0
                    },

                    "rationale": {
                        "type": "string"
                    }
                },

                "required": [
                    "entity_type",
                    "entity_id",
                    "field_path",
                    "value",
                    "origin",
                    "source_fragment",
                    "confidence",
                    "rationale"
                ],

                "additionalProperties": False
            }
        },

        "warnings": {
            "type": "array",
            "items": {
                "type": "string"
            }
        }
    },

    "required": [
        "project_id",
        "title",
        "premise",
        "genre",
        "characters",
        "locations",
        "scenes",
        "events",
        "relationships",
        "findings",
        "warnings"
    ],

    "additionalProperties": False
}



# CORE_FACT_PASS_CONSTRAINTS
#
# Stage A extracts only structural story facts.
# Provenance/findings are generated in a separate pass.
#
# Keeping the constrained generation compact prevents
# local models from exhausting the generation budget
# inside long source_fragment/rationale strings.

FACT_JSON_SCHEMA["properties"].pop(
    "findings",
    None,
)

FACT_JSON_SCHEMA["required"] = [
    key
    for key in FACT_JSON_SCHEMA["required"]
    if key != "findings"
]


# ---------- root limits ----------

FACT_JSON_SCHEMA["properties"]["premise"][
    "maxLength"
] = 320

FACT_JSON_SCHEMA["properties"]["genre"][
    "maxItems"
] = 5

FACT_JSON_SCHEMA["properties"]["characters"][
    "maxItems"
] = 20

FACT_JSON_SCHEMA["properties"]["locations"][
    "maxItems"
] = 20

FACT_JSON_SCHEMA["properties"]["scenes"][
    "maxItems"
] = 30

FACT_JSON_SCHEMA["properties"]["events"][
    "maxItems"
] = 60

FACT_JSON_SCHEMA["properties"]["relationships"][
    "maxItems"
] = 40

FACT_JSON_SCHEMA["properties"]["warnings"][
    "maxItems"
] = 10


# ---------- characters ----------

_char = (
    FACT_JSON_SCHEMA["properties"]
    ["characters"]
    ["items"]
    ["properties"]
)

_char["character_id"]["maxLength"] = 80
_char["name"]["maxLength"] = 120
_char["role"]["maxLength"] = 160


# ---------- locations ----------

_loc = (
    FACT_JSON_SCHEMA["properties"]
    ["locations"]
    ["items"]
    ["properties"]
)

_loc["location_id"]["maxLength"] = 80
_loc["name"]["maxLength"] = 160
_loc["description"]["maxLength"] = 240


# ---------- scenes ----------

_scene = (
    FACT_JSON_SCHEMA["properties"]
    ["scenes"]
    ["items"]
    ["properties"]
)

_scene["scene_id"]["maxLength"] = 80
_scene["title"]["maxLength"] = 180
_scene["location_id"]["maxLength"] = 80

_scene["character_ids"]["maxItems"] = 20
_scene["event_ids"]["maxItems"] = 30


# ---------- events ----------

_event = (
    FACT_JSON_SCHEMA["properties"]
    ["events"]
    ["items"]
    ["properties"]
)

_event["event_id"]["maxLength"] = 100
_event["scene_id"]["maxLength"] = 80
_event["actor_id"]["maxLength"] = 80
_event["action"]["maxLength"] = 180
_event["target_id"]["maxLength"] = 80
_event["location_id"]["maxLength"] = 80
_event["content"]["maxLength"] = 260

_event["consequences"]["maxItems"] = 4

_event[
    "consequences"
][
    "items"
][
    "maxLength"
] = 180


# ---------- relationships ----------

_rel = (
    FACT_JSON_SCHEMA["properties"]
    ["relationships"]
    ["items"]
    ["properties"]
)

_rel["relationship_id"]["maxLength"] = 100
_rel["source_character_id"]["maxLength"] = 80
_rel["target_character_id"]["maxLength"] = 80
_rel["relationship_type"]["maxLength"] = 80
_rel["description"]["maxLength"] = 220


# ---------- warnings ----------

FACT_JSON_SCHEMA[
    "properties"
][
    "warnings"
][
    "items"
][
    "maxLength"
] = 240

def write_fact_json_schema(
    path: Path,
) -> Path:

    path.parent.mkdir(
        parents=True,
        exist_ok=True,
    )

    path.write_text(
        json.dumps(
            FACT_JSON_SCHEMA,
            ensure_ascii=False,
            indent=2,
        ),
        encoding="utf-8",
    )

    return path


def validate_raw_story_facts(
    payload,
) -> RawStoryFacts:

    if hasattr(
        RawStoryFacts,
        "model_validate",
    ):
        return RawStoryFacts.model_validate(
            payload
        )

    return RawStoryFacts.parse_obj(
        payload
    )
