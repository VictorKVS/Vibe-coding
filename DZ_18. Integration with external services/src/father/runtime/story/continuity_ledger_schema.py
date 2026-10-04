from __future__ import annotations

from typing import Dict, List, Literal, Optional

from pydantic import BaseModel, Field


DirectiveType = Literal[
    "object_acquire",
    "object_release",
    "object_use",
    "object_destroy",
    "injury_add",
    "injury_heal",
    "commitment_open",
    "commitment_resolve",
    "goal_open",
    "goal_resolve",
]


class ContinuityDirective(BaseModel):

    directive_id: str
    event_id: str

    directive_type: DirectiveType

    character_id: str

    target_character_id: Optional[str] = None

    object_id: Optional[str] = None
    injury_id: Optional[str] = None
    commitment_id: Optional[str] = None
    goal_id: Optional[str] = None

    label: str = ""

    resolution: Optional[
        Literal[
            "fulfilled",
            "broken",
            "cancelled",
            "achieved",
            "failed",
            "abandoned",
        ]
    ] = None

    evidence_ids: List[str] = Field(
        default_factory=list
    )


class ContinuityDirectiveBundle(BaseModel):

    project_id: str

    directives: List[
        ContinuityDirective
    ] = Field(
        default_factory=list
    )


class ObjectLedgerState(BaseModel):

    object_id: str
    label: str = ""

    owner_id: Optional[str] = None

    status: Literal[
        "available",
        "held",
        "released",
        "destroyed",
    ] = "available"

    acquired_event_id: Optional[str] = None
    last_event_id: Optional[str] = None


class InjuryLedgerState(BaseModel):

    injury_id: str
    character_id: str
    label: str = ""

    status: Literal[
        "active",
        "healed",
    ] = "active"

    created_event_id: str
    healed_event_id: Optional[str] = None


class CommitmentLedgerState(BaseModel):

    commitment_id: str
    character_id: str

    target_character_id: Optional[str] = None

    label: str = ""

    status: Literal[
        "open",
        "fulfilled",
        "broken",
        "cancelled",
    ] = "open"

    opened_event_id: str
    resolved_event_id: Optional[str] = None


class GoalLedgerState(BaseModel):

    goal_id: str
    character_id: str

    label: str = ""

    status: Literal[
        "active",
        "achieved",
        "failed",
        "abandoned",
    ] = "active"

    opened_event_id: str
    resolved_event_id: Optional[str] = None


class LedgerViolation(BaseModel):

    violation_id: str

    severity: Literal[
        "warning",
        "error",
    ]

    code: str
    message: str

    directive_id: Optional[str] = None
    event_id: Optional[str] = None
    character_id: Optional[str] = None
    entity_id: Optional[str] = None


class LedgerTransition(BaseModel):

    directive_id: str
    event_id: str

    entity_type: Literal[
        "object",
        "injury",
        "commitment",
        "goal",
    ]

    entity_id: str

    before: Optional[
        Dict[str, object]
    ] = None

    after: Optional[
        Dict[str, object]
    ] = None


class ContinuityLedgerResult(BaseModel):

    project_id: str

    objects: Dict[
        str,
        ObjectLedgerState,
    ] = Field(
        default_factory=dict
    )

    injuries: Dict[
        str,
        InjuryLedgerState,
    ] = Field(
        default_factory=dict
    )

    commitments: Dict[
        str,
        CommitmentLedgerState,
    ] = Field(
        default_factory=dict
    )

    goals: Dict[
        str,
        GoalLedgerState,
    ] = Field(
        default_factory=dict
    )

    transitions: List[
        LedgerTransition
    ] = Field(
        default_factory=list
    )

    violations: List[
        LedgerViolation
    ] = Field(
        default_factory=list
    )

    report: Dict[
        str,
        object,
    ] = Field(
        default_factory=dict
    )
