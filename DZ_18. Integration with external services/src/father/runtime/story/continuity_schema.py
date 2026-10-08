from __future__ import annotations

from typing import Dict, List, Literal, Optional

from pydantic import BaseModel, Field


class RuleViolation(BaseModel):

    violation_id: str

    severity: Literal[
        "info",
        "warning",
        "error",
    ]

    rule_code: str

    message: str

    event_id: Optional[str] = None
    scene_id: Optional[str] = None
    character_id: Optional[str] = None
    knowledge_id: Optional[str] = None

    details: Dict[
        str,
        object,
    ] = Field(
        default_factory=dict
    )


class ContinuityAuditResult(BaseModel):

    project_id: str

    rules_checked: List[str] = Field(
        default_factory=list
    )

    violations: List[
        RuleViolation
    ] = Field(
        default_factory=list
    )

    report: Dict[
        str,
        object,
    ] = Field(
        default_factory=dict
    )
