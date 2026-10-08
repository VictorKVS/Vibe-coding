from __future__ import annotations

from typing import Dict, List, Literal, Optional

from pydantic import BaseModel, Field


class KnowledgeRecord(BaseModel):

    knowledge_id: str
    source_event_id: str
    scene_id: str

    kind: Literal[
        "communication",
        "secret",
    ]

    content: str

    known_by: List[str] = Field(
        default_factory=list
    )

    hidden_from: List[str] = Field(
        default_factory=list
    )

    evidence_ids: List[str] = Field(
        default_factory=list
    )


class CharacterRuntimeState(BaseModel):

    character_id: str

    scene_id: Optional[str] = None
    location_id: Optional[str] = None

    observed_event_ids: List[str] = Field(
        default_factory=list
    )

    knowledge_ids: List[str] = Field(
        default_factory=list
    )

    secret_ids: List[str] = Field(
        default_factory=list
    )


class StateChange(BaseModel):

    event_id: str
    character_id: str

    field: str

    before: object = None
    after: object = None

    reason: str = ""


class EventTransition(BaseModel):

    event_id: str
    scene_id: str

    before: Dict[
        str,
        Dict[str, object],
    ] = Field(
        default_factory=dict
    )

    after: Dict[
        str,
        Dict[str, object],
    ] = Field(
        default_factory=dict
    )

    changes: List[StateChange] = Field(
        default_factory=list
    )


class ContinuityIssue(BaseModel):

    issue_id: str

    severity: Literal[
        "info",
        "warning",
        "error",
    ]

    code: str

    event_id: Optional[str] = None
    scene_id: Optional[str] = None

    message: str


class StoryStateResult(BaseModel):

    project_id: str

    timeline_event_ids: List[str] = Field(
        default_factory=list
    )

    characters: Dict[
        str,
        CharacterRuntimeState,
    ] = Field(
        default_factory=dict
    )

    knowledge: List[KnowledgeRecord] = Field(
        default_factory=list
    )

    transitions: List[EventTransition] = Field(
        default_factory=list
    )

    unresolved_secret_ids: List[str] = Field(
        default_factory=list
    )

    issues: List[ContinuityIssue] = Field(
        default_factory=list
    )

    report: Dict[str, object] = Field(
        default_factory=dict
    )
