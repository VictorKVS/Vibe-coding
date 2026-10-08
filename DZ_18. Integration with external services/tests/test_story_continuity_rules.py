import copy

from father.runtime.story.continuity_rules import (
    audit_continuity,
)
from father.runtime.story.schema import (
    StoryProject,
)
from father.runtime.story.state_engine import (
    build_story_state,
)


def _project():

    return StoryProject(
        project_id="P1",
        title="Continuity Test",

        characters=[
            {
                "character_id": "CHAR-A",
                "name": "A",
            },

            {
                "character_id": "CHAR-B",
                "name": "B",
            },
        ],

        locations=[
            {
                "location_id": "LOC-1",
                "name": "Room",
            }
        ],

        scenes=[
            {
                "scene_id": "SCENE-1",
                "title": "Scene",
                "location_id": "LOC-1",
                "character_ids": [
                    "CHAR-A",
                    "CHAR-B",
                ],
                "event_ids": [
                    "EVT-1",
                    "EVT-2",
                ],
            }
        ],

        events=[
            {
                "event_id": "EVT-1",
                "scene_id": "SCENE-1",
                "actor_id": "CHAR-A",
                "action": "provides information",
                "target_id": "CHAR-B",
                "location_id": "LOC-1",
                "content": (
                    "A tells B the code."
                ),
            },

            {
                "event_id": "EVT-2",
                "scene_id": "SCENE-1",
                "actor_id": "CHAR-A",
                "action": "withholds information",
                "target_id": "CHAR-B",
                "location_id": "LOC-1",
                "content": (
                    "A does not tell B that the key is broken."
                ),
            },
        ],

        canon={
            "world": {
                "timeline_event_ids": [
                    "EVT-1",
                    "EVT-2",
                ]
            }
        },
    )


def _built():

    return build_story_state(
        _project()
    )


def test_clean_state_passes_rules():

    built = _built()

    audit = audit_continuity(
        project=built.project,
        state=built.state,
    )

    assert (
        audit.report[
            "passed"
        ]
        is True
    )

    assert (
        audit.report[
            "errors"
        ]
        == 0
    )


def test_secret_leak_is_detected():

    built = _built()

    built.state.characters[
        "CHAR-B"
    ].knowledge_ids.append(
        "K-EVT-2"
    )

    audit = audit_continuity(
        project=built.project,
        state=built.state,
    )

    codes = {
        item.rule_code
        for item in audit.violations
    }

    assert (
        "SECRET_BOUNDARY"
        in codes
    )


def test_unknown_knowledge_is_detected():

    built = _built()

    built.state.characters[
        "CHAR-A"
    ].knowledge_ids.append(
        "K-UNKNOWN"
    )

    audit = audit_continuity(
        project=built.project,
        state=built.state,
    )

    codes = {
        item.rule_code
        for item in audit.violations
    }

    assert (
        "CHARACTER_KNOWLEDGE_REFERENCE"
        in codes
    )


def test_knowledge_before_source_is_detected():

    built = _built()

    first = built.state.transitions[
        0
    ]

    first.before[
        "CHAR-A"
    ][
        "knowledge_ids"
    ] = [
        "K-EVT-2"
    ]

    audit = audit_continuity(
        project=built.project,
        state=built.state,
    )

    codes = {
        item.rule_code
        for item in audit.violations
    }

    assert (
        "KNOWLEDGE_NOT_BEFORE_SOURCE"
        in codes
    )


def test_broken_transition_chain_is_detected():

    built = _built()

    second = built.state.transitions[
        1
    ]

    second.before[
        "CHAR-A"
    ][
        "location_id"
    ] = "LOC-BROKEN"

    audit = audit_continuity(
        project=built.project,
        state=built.state,
    )

    codes = {
        item.rule_code
        for item in audit.violations
    }

    assert (
        "CHARACTER_STATE_CHAIN"
        in codes
    )


def test_event_transition_mismatch_is_detected():

    built = _built()

    built.project.events[
        0
    ].after_state = {}

    audit = audit_continuity(
        project=built.project,
        state=built.state,
    )

    codes = {
        item.rule_code
        for item in audit.violations
    }

    assert (
        "EVENT_TRANSITION_MATCH"
        in codes
    )
