import pytest

from father.runtime.story.fact_schema import (
    RawStoryFacts,
)
from father.runtime.story.normalizer import (
    normalize_story,
)
from father.runtime.story.provenance_schema import (
    StoryProvenanceResult,
)


def _facts():

    return RawStoryFacts(
        project_id="P1",
        title="Story",

        premise="Test premise.",

        genre=[
            "science fiction"
        ],

        characters=[
            {
                "character_id": "CHAR-A-001",
                "name": "Andrey",
                "age": 42,
                "adult_status": "adult",
                "role": "systems engineer",
            }
        ],

        locations=[
            {
                "location_id": "LOC-LAB-001",
                "name": "Laboratory",
                "description": (
                    "Dark concrete laboratory."
                ),
            }
        ],

        scenes=[
            {
                "scene_id": "SCENE-001",
                "title": "Arrival",
                "location_id": "LOC-LAB-001",
                "character_ids": [
                    "CHAR-A-001"
                ],
                "event_ids": [
                    "EVT-001"
                ],
            }
        ],

        events=[
            {
                "event_id": "EVT-001",
                "scene_id": "SCENE-001",
                "actor_id": "CHAR-A-001",
                "action": "enters laboratory",
                "target_id": "LOC-LAB-001",
                "location_id": "LOC-LAB-001",
                "content": (
                    "Andrey enters the laboratory."
                ),
                "consequences": [],
            }
        ],

        relationships=[
            {
                "relationship_id": "REL-001",
                "source_character_id": "CHAR-A-001",
                "target_character_id": "CHAR-A-001",
                "relationship_type": "self",
                "description": "Test relationship.",
            }
        ],

        warnings=[
            "/n"
        ],
    )


def _provenance():

    return StoryProvenanceResult(
        project_id="P1",

        evidence=[
            {
                "evidence_id": "EVID-001",
                "entity_type": "character",
                "entity_id": "CHAR-A-001",
                "field_path": "identity",
                "value_summary": "Andrey exists.",
                "origin": "canon",
                "source_fragment": "Andrey entered.",
                "confidence": 1.0,
                "rationale": "Explicit.",
            },

            {
                "evidence_id": "EVID-002",
                "entity_type": "character",
                "entity_id": "CHAR-A-001",
                "field_path": "age",
                "value_summary": "Andrey is 42.",
                "origin": "canon",
                "source_fragment": (
                    "Andrey was forty-two years old."
                ),
                "confidence": 1.0,
                "rationale": "Explicit age.",
            },

            {
                "evidence_id": "EVID-003",
                "entity_type": "location",
                "entity_id": "LOC-LAB-001",
                "field_path": "description",
                "value_summary": "Laboratory.",
                "origin": "canon",
                "source_fragment": (
                    "The concrete laboratory was dark."
                ),
                "confidence": 1.0,
                "rationale": "Explicit location.",
            },

            {
                "evidence_id": "EVID-004",
                "entity_type": "event",
                "entity_id": "EVT-001",
                "field_path": "event",
                "value_summary": (
                    "Andrey enters the laboratory."
                ),
                "origin": "canon",
                "source_fragment": (
                    "Andrey entered the laboratory."
                ),
                "confidence": 1.0,
                "rationale": "Explicit event.",
            },

            {
                "evidence_id": "EVID-005",
                "entity_type": "relationship",
                "entity_id": "REL-001",
                "field_path": "relationship",
                "value_summary": "Test relationship.",
                "origin": "canon",
                "source_fragment": "Andrey.",
                "confidence": 1.0,
                "rationale": "Test evidence.",
            },
        ],

        proposals=[
            {
                "proposal_id": "PROP-001",
                "entity_type": "character",
                "entity_id": "CHAR-A-001",
                "category": "visual",
                "value": (
                    "Use restrained posture."
                ),
                "confidence": 0.7,
                "rationale": (
                    "Visual interpretation."
                ),
            }
        ],

        warnings=[],
    )


def test_normalizer_preserves_core_facts():

    result = normalize_story(
        facts=_facts(),
        provenance=_provenance(),
    )

    project = result.project

    assert project.project_id == "P1"

    assert (
        project.characters[0].age
        == 42
    )

    assert (
        project.locations[0].description
        == "Dark concrete laboratory."
    )

    assert (
        project.scenes[0].event_ids
        == ["EVT-001"]
    )

    assert (
        project.events[0].event_id
        == "EVT-001"
    )

    assert (
        project.relationships[0].description
        == "Test relationship."
    )


def test_normalizer_attaches_provenance():

    result = normalize_story(
        facts=_facts(),
        provenance=_provenance(),
    )

    project = result.project

    assert len(
        project.characters[0].evidence
    ) == 2

    assert len(
        project.locations[0].evidence
    ) == 1

    assert len(
        project.events[0].evidence
    ) == 1

    assert len(
        project.relationships[0].evidence
    ) == 1

    assert (
        result.report[
            "attached_evidence"
        ]
        == 5
    )

    assert (
        result.report[
            "unmapped_evidence_ids"
        ]
        == []
    )


def test_normalizer_builds_canon_state():

    result = normalize_story(
        facts=_facts(),
        provenance=_provenance(),
    )

    canon = result.project.canon

    assert (
        canon.scene_id
        == "SCENE-001"
    )

    assert (
        canon.characters[
            "CHAR-A-001"
        ][
            "last_location_id"
        ]
        == "LOC-LAB-001"
    )

    assert (
        canon.world[
            "timeline_event_ids"
        ]
        == ["EVT-001"]
    )


def test_normalizer_keeps_proposals_non_canon():

    result = normalize_story(
        facts=_facts(),
        provenance=_provenance(),
    )

    proposal = (
        result.project.proposals[0]
    )

    assert (
        proposal.status
        == "open"
    )

    assert (
        proposal.canon_changed
        is False
    )

    assert (
        proposal.category
        == "comic"
    )


def test_normalizer_removes_warning_noise():

    result = normalize_story(
        facts=_facts(),
        provenance=_provenance(),
    )

    assert (
        result.report["warnings"]
        == []
    )

    assert (
        result.report[
            "dropped_warning_noise"
        ]
        == ["/n"]
    )


def test_normalizer_rejects_missing_required_evidence():

    provenance = _provenance()

    provenance.evidence = [
        item
        for item in provenance.evidence
        if item.field_path != "age"
    ]

    with pytest.raises(
        ValueError,
        match="Missing required evidence",
    ):

        normalize_story(
            facts=_facts(),
            provenance=provenance,
        )



def test_normalizer_repairs_incomplete_scene_event_index():

    facts = _facts()

    facts.scenes[0].event_ids = []

    result = normalize_story(
        facts=facts,
        provenance=_provenance(),
    )

    assert (
        result.project.scenes[
            0
        ].event_ids
        == ["EVT-001"]
    )

    assert (
        result.project.events[
            0
        ].scene_id
        == "SCENE-001"
    )

    assert (
        result.report[
            "scene_event_links_repaired"
        ]
        >= 1
    )



def test_normalizer_repairs_scene_event_conflict():

    facts = _facts()

    facts.scenes.append(
        type(
            facts.scenes[0]
        )(
            scene_id="SCENE-002",
            title="Other scene",
            location_id="LOC-LAB-001",
            character_ids=[
                "CHAR-A-001"
            ],
            event_ids=[
                "EVT-001"
            ],
        )
    )

    facts.scenes[0].event_ids = []

    facts.events[0].scene_id = (
        "SCENE-001"
    )

    result = normalize_story(
        facts=facts,
        provenance=_provenance(),
    )

    event = result.project.events[0]

    assert (
        event.scene_id
        == "SCENE-002"
    )

    scene2 = next(
        scene
        for scene
        in result.project.scenes
        if scene.scene_id
        == "SCENE-002"
    )

    assert (
        "EVT-001"
        in scene2.event_ids
    )

    repairs = result.report[
        "scene_event_link_repairs"
    ]

    assert any(
        item.get(
            "event_id"
        )
        == "EVT-001"
        and item.get(
            "repair"
        )
        == "event_scene_conflict"
        and item.get(
            "from"
        )
        == "SCENE-001"
        and item.get(
            "to"
        )
        == "SCENE-002"
        for item in repairs
    )


def test_normalizer_rejects_multiple_scene_membership():

    facts = _facts()

    facts.scenes.append(
        type(
            facts.scenes[0]
        )(
            scene_id="SCENE-002",
            title="Other scene",
            location_id="LOC-LAB-001",
            character_ids=[
                "CHAR-A-001"
            ],
            event_ids=[
                "EVT-001"
            ],
        )
    )

    with pytest.raises(
        ValueError,
        match="Event listed in multiple scenes",
    ):

        normalize_story(
            facts=facts,
            provenance=_provenance(),
        )
