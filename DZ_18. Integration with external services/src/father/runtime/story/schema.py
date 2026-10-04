from __future__ import annotations

from typing import Dict, List, Literal, Optional

from pydantic import BaseModel, Field


class SourceEvidence(BaseModel):
    source_id: str
    source_type: Literal[
        "story_text",
        "author_input",
        "research",
        "inference",
    ]
    fragment: str = ""
    confidence: float = Field(
        default=1.0,
        ge=0.0,
        le=1.0,
    )


class StylePassport(BaseModel):
    narrative_distance: float = 0.5
    sentence_rhythm: float = 0.5
    dialogue_density: float = 0.5
    description_density: float = 0.5
    technical_detail: float = 0.5
    psychological_depth: float = 0.5
    visuality: float = 0.5
    action: float = 0.5
    humor: float = 0.0
    darkness: float = 0.0
    romance: float = 0.0
    eroticism: float = 0.0

    reference_notes: List[str] = Field(
        default_factory=list
    )


class PsychologyProfile(BaseModel):
    temperament: Optional[str] = None

    dominant_traits: List[str] = Field(
        default_factory=list
    )

    motivation: List[str] = Field(
        default_factory=list
    )

    fears: List[str] = Field(
        default_factory=list
    )

    values: List[str] = Field(
        default_factory=list
    )

    weaknesses: List[str] = Field(
        default_factory=list
    )

    stress_response: Optional[str] = None
    conflict_style: Optional[str] = None
    speech_style: Optional[str] = None

    openness: Optional[float] = None
    conscientiousness: Optional[float] = None
    extraversion: Optional[float] = None
    agreeableness: Optional[float] = None
    neuroticism: Optional[float] = None


class ComicVisualCode(BaseModel):
    shape_language: List[str] = Field(
        default_factory=list
    )

    silhouette: Optional[str] = None
    face_shape: Optional[str] = None
    eyes: Optional[str] = None
    brows: Optional[str] = None
    nose: Optional[str] = None
    mouth: Optional[str] = None
    jaw: Optional[str] = None

    posture: Optional[str] = None

    gestures: List[str] = Field(
        default_factory=list
    )

    movement: Optional[str] = None

    neutral_expression: Optional[str] = None

    expression_system: Dict[str, str] = Field(
        default_factory=dict
    )

    grotesque_level: float = Field(
        default=0.5,
        ge=0.0,
        le=1.0,
    )

    stylization_level: float = Field(
        default=0.5,
        ge=0.0,
        le=1.0,
    )


class CharacterCard(BaseModel):
    character_id: str
    name: str

    aliases: List[str] = Field(
        default_factory=list
    )

    story_role: Optional[str] = None
    archetype: Optional[str] = None

    age: Optional[int] = None

    adult_status: Literal[
        "unknown",
        "minor",
        "adult",
    ] = "unknown"

    biography: List[str] = Field(
        default_factory=list
    )

    psychology: PsychologyProfile = Field(
        default_factory=PsychologyProfile
    )

    visual: ComicVisualCode = Field(
        default_factory=ComicVisualCode
    )

    appearance_canon: Dict[str, object] = Field(
        default_factory=dict
    )

    identity_lock: List[str] = Field(
        default_factory=list
    )

    mutable_attributes: List[str] = Field(
        default_factory=list
    )

    wardrobe: List[str] = Field(
        default_factory=list
    )

    props: List[str] = Field(
        default_factory=list
    )

    goals: List[str] = Field(
        default_factory=list
    )

    secrets: List[str] = Field(
        default_factory=list
    )

    knowledge: List[str] = Field(
        default_factory=list
    )

    evidence: List[SourceEvidence] = Field(
        default_factory=list
    )


class LocationCard(BaseModel):
    location_id: str
    name: str

    purpose: Optional[str] = None
    architecture: Optional[str] = None
    atmosphere: Optional[str] = None
    lighting: Optional[str] = None
    state: Optional[str] = None

    objects: List[str] = Field(
        default_factory=list
    )

    hazards: List[str] = Field(
        default_factory=list
    )

    world_rules: List[str] = Field(
        default_factory=list
    )

    visual_prompt_base: Optional[str] = None

    camera_presets: List[str] = Field(
        default_factory=list
    )

    evidence: List[SourceEvidence] = Field(
        default_factory=list
    )


class StorySkeletonNode(BaseModel):
    node_id: str
    title: str

    function: Literal[
        "introduction",
        "inciting_incident",
        "development",
        "turn",
        "midpoint",
        "escalation",
        "crisis",
        "climax",
        "resolution",
        "custom",
    ] = "custom"

    goal: Optional[str] = None

    participants: List[str] = Field(
        default_factory=list
    )

    required_events: List[str] = Field(
        default_factory=list
    )

    changes: List[str] = Field(
        default_factory=list
    )


class SceneCard(BaseModel):
    scene_id: str
    title: str

    skeleton_node_id: Optional[str] = None

    location_id: Optional[str] = None

    character_ids: List[str] = Field(
        default_factory=list
    )

    goal: Optional[str] = None
    obstacle: Optional[str] = None
    conflict: Optional[str] = None
    outcome: Optional[str] = None

    information_revealed: List[str] = Field(
        default_factory=list
    )

    character_state_before: Dict[
        str,
        object,
    ] = Field(
        default_factory=dict
    )

    character_state_after: Dict[
        str,
        object,
    ] = Field(
        default_factory=dict
    )

    world_state_before: Dict[
        str,
        object,
    ] = Field(
        default_factory=dict
    )

    world_state_after: Dict[
        str,
        object,
    ] = Field(
        default_factory=dict
    )

    comic_shots: List[Dict[str, object]] = Field(
        default_factory=list
    )


class StoryEvent(BaseModel):
    event_id: str
    scene_id: str

    actor_id: Optional[str] = None

    action: str

    target_id: Optional[str] = None
    object_id: Optional[str] = None
    location_id: Optional[str] = None

    content: Optional[str] = None

    causes: List[str] = Field(
        default_factory=list
    )

    consequences: List[str] = Field(
        default_factory=list
    )

    before_state: Dict[str, object] = Field(
        default_factory=dict
    )

    after_state: Dict[str, object] = Field(
        default_factory=dict
    )

    evidence: List[SourceEvidence] = Field(
        default_factory=list
    )


class RelationshipState(BaseModel):
    relationship_id: str

    source_character_id: str
    target_character_id: str

    relationship_type: str

    trust: Optional[float] = None
    fear: Optional[float] = None
    attraction: Optional[float] = None
    hostility: Optional[float] = None

    status: Optional[str] = None

    changed_by_event_id: Optional[str] = None


class CanonState(BaseModel):
    scene_id: Optional[str] = None

    characters: Dict[str, Dict[str, object]] = Field(
        default_factory=dict
    )

    locations: Dict[str, Dict[str, object]] = Field(
        default_factory=dict
    )

    world: Dict[str, object] = Field(
        default_factory=dict
    )

    active_props: Dict[str, object] = Field(
        default_factory=dict
    )

    unresolved_secrets: List[str] = Field(
        default_factory=list
    )


class ResearchProposal(BaseModel):
    proposal_id: str

    category: Literal[
        "plot",
        "character",
        "world",
        "technology",
        "dialogue",
        "style",
        "continuity",
        "originality",
        "comic",
        "other",
    ]

    problem: str
    evidence: List[str] = Field(
        default_factory=list
    )

    external_findings: List[str] = Field(
        default_factory=list
    )

    options: List[str] = Field(
        default_factory=list
    )

    expected_effects: Dict[
        str,
        object,
    ] = Field(
        default_factory=dict
    )

    affected_entities: List[str] = Field(
        default_factory=list
    )

    status: Literal[
        "open",
        "accepted",
        "rejected",
        "modified",
        "deferred",
    ] = "open"

    canon_changed: bool = False


class StoryProject(BaseModel):
    project_id: str
    title: str

    genre: List[str] = Field(
        default_factory=list
    )

    premise: str = ""

    target_products: List[str] = Field(
        default_factory=lambda: [
            "novel",
            "comic",
        ]
    )

    style: StylePassport = Field(
        default_factory=StylePassport
    )

    skeleton: List[StorySkeletonNode] = Field(
        default_factory=list
    )

    characters: List[CharacterCard] = Field(
        default_factory=list
    )

    locations: List[LocationCard] = Field(
        default_factory=list
    )

    scenes: List[SceneCard] = Field(
        default_factory=list
    )

    events: List[StoryEvent] = Field(
        default_factory=list
    )

    relationships: List[RelationshipState] = Field(
        default_factory=list
    )

    canon: CanonState = Field(
        default_factory=CanonState
    )

    proposals: List[ResearchProposal] = Field(
        default_factory=list
    )
