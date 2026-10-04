from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Dict, Iterable, List, Optional, Set, Tuple

from father.runtime.story.fact_schema import (
    RawStoryFacts,
)
from father.runtime.story.provenance_extractor import (
    build_required_evidence_plan,
)
from father.runtime.story.provenance_schema import (
    EvidenceRecord,
    StoryProvenanceResult,
)
from father.runtime.story.schema import (
    CanonState,
    CharacterCard,
    LocationCard,
    RelationshipState,
    ResearchProposal,
    SceneCard,
    SourceEvidence,
    StoryEvent,
    StoryProject,
)


@dataclass
class NormalizationResult:

    project: StoryProject
    report: Dict[str, Any]


def _none_if_blank(
    value: Optional[str],
) -> Optional[str]:

    if value is None:
        return None

    value = value.strip()

    if not value:
        return None

    return value


def _source_evidence(
    item: EvidenceRecord,
) -> SourceEvidence:

    source_type = (
        "story_text"
        if item.origin == "canon"
        else "inference"
    )

    return SourceEvidence(
        source_id=item.evidence_id,
        source_type=source_type,
        fragment=item.source_fragment,
        confidence=item.confidence,
    )


def _evidence_for(
    provenance: StoryProvenanceResult,
    entity_type: str,
    entity_id: str,
) -> List[SourceEvidence]:

    result = []

    for item in provenance.evidence:

        if (
            item.entity_type == entity_type
            and item.entity_id == entity_id
        ):

            result.append(
                _source_evidence(
                    item
                )
            )

    return result


def _id_duplicates(
    values: Iterable[str],
) -> Set[str]:

    seen: Set[str] = set()
    duplicates: Set[str] = set()

    for value in values:

        if value in seen:
            duplicates.add(
                value
            )

        seen.add(
            value
        )

    return duplicates


def _clean_warnings(
    values: Iterable[str],
) -> Tuple[
    List[str],
    List[str],
]:

    clean: List[str] = []
    dropped: List[str] = []

    noise = {
        "",
        "/n",
        "\\n",
    }

    for raw in values:

        value = str(
            raw
        ).strip()

        if value.lower() in noise:

            dropped.append(
                str(raw)
            )

            continue

        if value not in clean:

            clean.append(
                value
            )

    return (
        clean,
        dropped,
    )


def _validate_consistency(
    facts: RawStoryFacts,
    provenance: StoryProvenanceResult,
) -> List[str]:

    errors: List[str] = []

    if (
        facts.project_id
        != provenance.project_id
    ):

        errors.append(
            "Project ID mismatch: "
            f"{facts.project_id} != "
            f"{provenance.project_id}"
        )

    character_ids = {
        item.character_id
        for item in facts.characters
    }

    location_ids = {
        item.location_id
        for item in facts.locations
    }

    scene_ids = {
        item.scene_id
        for item in facts.scenes
    }

    event_ids = {
        item.event_id
        for item in facts.events
    }

    relationship_ids = {
        item.relationship_id
        for item in facts.relationships
    }


    duplicate_groups = {
        "character": _id_duplicates(
            item.character_id
            for item in facts.characters
        ),

        "location": _id_duplicates(
            item.location_id
            for item in facts.locations
        ),

        "scene": _id_duplicates(
            item.scene_id
            for item in facts.scenes
        ),

        "event": _id_duplicates(
            item.event_id
            for item in facts.events
        ),

        "relationship": _id_duplicates(
            item.relationship_id
            for item in facts.relationships
        ),
    }

    for entity_type, duplicates in (
        duplicate_groups.items()
    ):

        for duplicate in sorted(
            duplicates
        ):

            errors.append(
                "Duplicate "
                f"{entity_type} ID: "
                f"{duplicate}"
            )


    for scene in facts.scenes:

        if (
            scene.location_id
            and scene.location_id
            not in location_ids
        ):

            errors.append(
                f"{scene.scene_id}: "
                "unknown location "
                f"{scene.location_id}"
            )

        for character_id in (
            scene.character_ids
        ):

            if (
                character_id
                not in character_ids
            ):

                errors.append(
                    f"{scene.scene_id}: "
                    "unknown character "
                    f"{character_id}"
                )

        for event_id in (
            scene.event_ids
        ):

            if event_id not in event_ids:

                errors.append(
                    f"{scene.scene_id}: "
                    "unknown event "
                    f"{event_id}"
                )


    for event in facts.events:

        if (
            event.scene_id
            and event.scene_id
            not in scene_ids
        ):

            errors.append(
                f"{event.event_id}: "
                "unknown scene "
                f"{event.scene_id}"
            )

        if (
            event.actor_id
            and event.actor_id
            not in character_ids
        ):

            errors.append(
                f"{event.event_id}: "
                "unknown actor "
                f"{event.actor_id}"
            )

        if (
            event.location_id
            and event.location_id
            not in location_ids
        ):

            errors.append(
                f"{event.event_id}: "
                "unknown location "
                f"{event.location_id}"
            )

        target_id = event.target_id

        if target_id:

            if (
                target_id.startswith(
                    "CHAR-"
                )
                and target_id
                not in character_ids
            ):

                errors.append(
                    f"{event.event_id}: "
                    "unknown character target "
                    f"{target_id}"
                )

            if (
                target_id.startswith(
                    "LOC-"
                )
                and target_id
                not in location_ids
            ):

                errors.append(
                    f"{event.event_id}: "
                    "unknown location target "
                    f"{target_id}"
                )


    for relationship in (
        facts.relationships
    ):

        if (
            relationship.source_character_id
            not in character_ids
        ):

            errors.append(
                f"{relationship.relationship_id}: "
                "unknown source character "
                f"{relationship.source_character_id}"
            )

        if (
            relationship.target_character_id
            not in character_ids
        ):

            errors.append(
                f"{relationship.relationship_id}: "
                "unknown target character "
                f"{relationship.target_character_id}"
            )


    known_entities = {
        "project": {
            facts.project_id
        },
        "character": character_ids,
        "location": location_ids,
        "scene": scene_ids,
        "event": event_ids,
        "relationship": relationship_ids,
    }


    for evidence in (
        provenance.evidence
    ):

        known = known_entities.get(
            evidence.entity_type
        )

        if (
            known is not None
            and evidence.entity_id
            not in known
        ):

            errors.append(
                "Orphan evidence "
                f"{evidence.evidence_id}: "
                f"{evidence.entity_type}/"
                f"{evidence.entity_id}"
            )


    required = {
        (
            item["entity_type"],
            item["entity_id"],
            item["field_path"],
        )
        for item in build_required_evidence_plan(
            facts.model_dump()
            if hasattr(
                facts,
                "model_dump",
            )
            else facts.dict()
        )
    }


    covered = {
        (
            item.entity_type,
            item.entity_id,
            item.field_path,
        )
        for item in provenance.evidence
    }


    missing = (
        required
        - covered
    )


    for item in sorted(
        missing
    ):

        errors.append(
            "Missing required evidence: "
            + "/".join(
                item
            )
        )

    return errors


def _proposal_category(
    category: str,
) -> str:

    mapping = {
        "psychology": "character",
        "visual": "comic",
        "continuity": "continuity",
        "story": "plot",
        "comic": "comic",
        "other": "other",
    }

    return mapping.get(
        category,
        "other",
    )


def _build_canon_state(
    facts: RawStoryFacts,
    characters: List[CharacterCard],
    locations: List[LocationCard],
) -> CanonState:

    character_state: Dict[
        str,
        Dict[str, object],
    ] = {}

    for character in characters:

        character_state[
            character.character_id
        ] = {
            "name": character.name,
            "age": character.age,
            "adult_status": (
                character.adult_status
            ),
            "story_role": (
                character.story_role
            ),
            "last_scene_id": None,
            "last_location_id": None,
            "evidence_ids": [
                item.source_id
                for item in character.evidence
            ],
        }


    for event in facts.events:

        actor_id = event.actor_id

        if (
            actor_id
            and actor_id
            in character_state
        ):

            if event.scene_id:

                character_state[
                    actor_id
                ][
                    "last_scene_id"
                ] = event.scene_id

            if event.location_id:

                character_state[
                    actor_id
                ][
                    "last_location_id"
                ] = event.location_id


    location_state = {
        location.location_id: {
            "name": location.name,
            "description": (
                location.description
            ),
            "evidence_ids": [
                item.source_id
                for item in location.evidence
            ],
        }
        for location in locations
    }


    last_scene_id = (
        facts.scenes[-1].scene_id
        if facts.scenes
        else None
    )


    return CanonState(
        scene_id=last_scene_id,

        characters=character_state,

        locations=location_state,

        world={
            "scene_order": [
                item.scene_id
                for item in facts.scenes
            ],

            "timeline_event_ids": [
                item.event_id
                for item in facts.events
            ],
        },

        active_props={},

        unresolved_secrets=[],
    )



def _canonicalize_scene_event_links(
    facts: RawStoryFacts,
):
    """
    Reconcile redundant scene/event links.

    Canonical policy:

    1. Event.scene_id is authoritative when present.
    2. If Event.scene_id is blank, a unique Scene.event_ids
       membership may repair it.
    3. Scene.event_ids is rebuilt from the resolved event map.
    4. Direct contradictions are rejected.
    """

    scene_ids = {
        scene.scene_id
        for scene in facts.scenes
    }


    # --------------------------------------------------------
    # What Stage A scenes currently claim
    # --------------------------------------------------------

    listed_owner: Dict[
        str,
        str,
    ] = {}


    for scene in facts.scenes:

        for event_id in scene.event_ids:

            existing = listed_owner.get(
                event_id
            )

            if (
                existing
                and existing != scene.scene_id
            ):

                raise ValueError(
                    "Event listed in multiple scenes: "
                    f"{event_id}: "
                    f"{existing}, "
                    f"{scene.scene_id}"
                )

            listed_owner[
                event_id
            ] = scene.scene_id


    # --------------------------------------------------------
    # Resolve canonical event -> scene mapping
    # --------------------------------------------------------

    event_scene: Dict[
        str,
        str,
    ] = {}

    repairs: List[
        Dict[str, object]
    ] = []


    for event in facts.events:

        explicit_scene = (
            event.scene_id.strip()
            if event.scene_id
            else ""
        )

        listed_scene = listed_owner.get(
            event.event_id,
            "",
        )


        if explicit_scene:

            if (
                explicit_scene
                not in scene_ids
            ):

                raise ValueError(
                    f"{event.event_id}: "
                    "unknown Event.scene_id "
                    f"{explicit_scene}"
                )


            if (
                listed_scene
                and listed_scene
                != explicit_scene
            ):

                resolved_scene = (
                    explicit_scene
                )

                repairs.append(
                    {
                        "event_id": (
                            event.event_id
                        ),

                        "repair": (
                            "scene_membership_conflict"
                        ),

                        "from": (
                            listed_scene
                        ),

                        "to": (
                            explicit_scene
                        ),

                        "reason": (
                            "Explicit Event.scene_id is authoritative; "
                            "Scene.event_ids is rebuilt as a derived index"
                        ),
                    }
                )

            else:

                resolved_scene = (
                    explicit_scene
                )


        elif listed_scene:

            resolved_scene = (
                listed_scene
            )

            repairs.append(
                {
                    "event_id": (
                        event.event_id
                    ),

                    "repair": (
                        "event_scene_id"
                    ),

                    "from": "",

                    "to": (
                        resolved_scene
                    ),

                    "reason": (
                        "Recovered from "
                        "Scene.event_ids"
                    ),
                }
            )


        else:

            raise ValueError(
                f"{event.event_id}: "
                "no scene assignment"
            )


        event_scene[
            event.event_id
        ] = resolved_scene


    # --------------------------------------------------------
    # Rebuild scene -> events from canonical event mapping
    # --------------------------------------------------------

    scene_events: Dict[
        str,
        List[str],
    ] = {
        scene.scene_id: []
        for scene in facts.scenes
    }


    for event in facts.events:

        resolved_scene = (
            event_scene[
                event.event_id
            ]
        )

        scene_events[
            resolved_scene
        ].append(
            event.event_id
        )


    # --------------------------------------------------------
    # Record every deterministic repair
    # --------------------------------------------------------

    for scene in facts.scenes:

        original = list(
            scene.event_ids
        )

        canonical = list(
            scene_events[
                scene.scene_id
            ]
        )


        if original != canonical:

            missing = [
                event_id
                for event_id in canonical
                if event_id not in original
            ]

            extra = [
                event_id
                for event_id in original
                if event_id not in canonical
            ]


            repairs.append(
                {
                    "scene_id": (
                        scene.scene_id
                    ),

                    "repair": (
                        "scene_event_ids"
                    ),

                    "from": (
                        original
                    ),

                    "to": (
                        canonical
                    ),

                    "missing_added": (
                        missing
                    ),

                    "extra_removed": (
                        extra
                    ),

                    "reason": (
                        "Rebuilt from canonical "
                        "Event.scene_id mapping"
                    ),
                }
            )


    return (
        scene_events,
        event_scene,
        repairs,
    )

def normalize_story(
    facts: RawStoryFacts,
    provenance: StoryProvenanceResult,
) -> NormalizationResult:

    errors = _validate_consistency(
        facts=facts,
        provenance=provenance,
    )

    if errors:

        raise ValueError(
            "Story normalization consistency failure:\n"
            + "\n".join(
                "- " + item
                for item in errors
            )
        )


    (
        scene_events,
        event_scene,
        scene_event_repairs,
    ) = _canonicalize_scene_event_links(
        facts
    )


    characters = [
        CharacterCard(
            character_id=item.character_id,
            name=item.name,
            story_role=_none_if_blank(
                item.role
            ),
            age=item.age,
            adult_status=item.adult_status,

            evidence=_evidence_for(
                provenance,
                "character",
                item.character_id,
            ),
        )
        for item in facts.characters
    ]


    locations = [
        LocationCard(
            location_id=item.location_id,
            name=item.name,

            description=_none_if_blank(
                item.description
            ),

            evidence=_evidence_for(
                provenance,
                "location",
                item.location_id,
            ),
        )
        for item in facts.locations
    ]


    scenes = [
        SceneCard(
            scene_id=item.scene_id,
            title=item.title,

            location_id=_none_if_blank(
                item.location_id
            ),

            character_ids=list(
                item.character_ids
            ),

            event_ids=list(
                scene_events[
                    item.scene_id
                ]
            ),
        )
        for item in facts.scenes
    ]


    events = [
        StoryEvent(
            event_id=item.event_id,
            scene_id=event_scene[
                item.event_id
            ],

            actor_id=_none_if_blank(
                item.actor_id
            ),

            action=item.action,

            target_id=_none_if_blank(
                item.target_id
            ),

            location_id=_none_if_blank(
                item.location_id
            ),

            content=_none_if_blank(
                item.content
            ),

            consequences=list(
                item.consequences
            ),

            evidence=_evidence_for(
                provenance,
                "event",
                item.event_id,
            ),
        )
        for item in facts.events
    ]


    relationships = [
        RelationshipState(
            relationship_id=(
                item.relationship_id
            ),

            source_character_id=(
                item.source_character_id
            ),

            target_character_id=(
                item.target_character_id
            ),

            relationship_type=(
                item.relationship_type
            ),

            description=_none_if_blank(
                item.description
            ),

            evidence=_evidence_for(
                provenance,
                "relationship",
                item.relationship_id,
            ),
        )
        for item in facts.relationships
    ]


    proposals = [
        ResearchProposal(
            proposal_id=item.proposal_id,

            category=_proposal_category(
                item.category
            ),

            problem=(
                item.rationale
                or "Stage B proposal"
            ),

            evidence=[],

            external_findings=[],

            options=[
                item.value
            ],

            expected_effects={
                "confidence": (
                    item.confidence
                ),
                "source_stage": (
                    "provenance"
                ),
            },

            affected_entities=[
                item.entity_id
            ],

            status="open",

            canon_changed=False,
        )
        for item in provenance.proposals
    ]


    canon = _build_canon_state(
        facts=facts,
        characters=characters,
        locations=locations,
    )


    project = StoryProject(
        project_id=facts.project_id,
        title=facts.title,

        genre=list(
            facts.genre
        ),

        premise=facts.premise,

        characters=characters,
        locations=locations,
        scenes=scenes,
        events=events,
        relationships=relationships,

        canon=canon,

        proposals=proposals,
    )


    clean_fact_warnings, dropped_fact = (
        _clean_warnings(
            facts.warnings
        )
    )

    clean_prov_warnings, dropped_prov = (
        _clean_warnings(
            provenance.warnings
        )
    )


    attached_evidence_ids = {
        item.source_id
        for character in project.characters
        for item in character.evidence
    }

    attached_evidence_ids.update(
        item.source_id
        for location in project.locations
        for item in location.evidence
    )

    attached_evidence_ids.update(
        item.source_id
        for event in project.events
        for item in event.evidence
    )

    attached_evidence_ids.update(
        item.source_id
        for relationship in project.relationships
        for item in relationship.evidence
    )


    all_evidence_ids = {
        item.evidence_id
        for item in provenance.evidence
    }


    report = {
        "project_id": (
            project.project_id
        ),

        "mode": (
            "deterministic"
        ),

        "llm_used": False,

        "counts": {
            "characters": len(
                project.characters
            ),

            "locations": len(
                project.locations
            ),

            "scenes": len(
                project.scenes
            ),

            "events": len(
                project.events
            ),

            "relationships": len(
                project.relationships
            ),

            "evidence": len(
                provenance.evidence
            ),

            "proposals": len(
                project.proposals
            ),
        },

        "warnings": (
            clean_fact_warnings
            + [
                item
                for item
                in clean_prov_warnings
                if item
                not in clean_fact_warnings
            ]
        ),

        "dropped_warning_noise": (
            dropped_fact
            + dropped_prov
        ),

        "required_evidence_missing": 0,

        "scene_event_links_repaired": len(
            scene_event_repairs
        ),

        "scene_event_link_repairs": (
            scene_event_repairs
        ),

        "attached_evidence": len(
            attached_evidence_ids
        ),

        "unmapped_evidence_ids": sorted(
            all_evidence_ids
            - attached_evidence_ids
        ),

        "consistency_errors": [],
    }


    return NormalizationResult(
        project=project,
        report=report,
    )
