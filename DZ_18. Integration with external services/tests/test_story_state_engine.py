import pytest

from father.runtime.story.schema import (
    StoryProject,
)
from father.runtime.story.state_engine import (
    build_story_state,
)


def _project():

    return StoryProject(
        project_id="P1",
        title="State Test",

        characters=[
            {
                "character_id": "CHAR-A",
                "name": "A",
                "adult_status": "adult",
            },

            {
                "character_id": "CHAR-B",
                "name": "B",
                "adult_status": "adult",
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
                    "A tells B that the access code is seven."
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


def test_state_engine_transfers_communication():

    result = build_story_state(
        _project()
    )

    record = next(
        item
        for item in result.state.knowledge
        if item.knowledge_id
        == "K-EVT-1"
    )

    assert (
        record.kind
        == "communication"
    )

    assert set(
        record.known_by
    ) == {
        "CHAR-A",
        "CHAR-B",
    }

    assert (
        "K-EVT-1"
        in result.state.characters[
            "CHAR-B"
        ].knowledge_ids
    )


def test_state_engine_tracks_withheld_secret():

    result = build_story_state(
        _project()
    )

    secret = next(
        item
        for item in result.state.knowledge
        if item.knowledge_id
        == "K-EVT-2"
    )

    assert (
        secret.kind
        == "secret"
    )

    assert (
        secret.known_by
        == ["CHAR-A"]
    )

    assert (
        secret.hidden_from
        == ["CHAR-B"]
    )

    assert (
        "K-EVT-2"
        in result.state.unresolved_secret_ids
    )

    assert (
        "K-EVT-2"
        not in result.state.characters[
            "CHAR-B"
        ].knowledge_ids
    )


def test_state_engine_writes_before_after():

    result = build_story_state(
        _project()
    )

    assert (
        len(
            result.state.transitions
        )
        == 2
    )

    event = result.project.events[0]

    assert (
        event.before_state
        is not None
    )

    assert (
        event.after_state
    )

    assert (
        result.project.scenes[
            0
        ].character_state_after
    )


def test_state_engine_updates_canon():

    result = build_story_state(
        _project()
    )

    canon = result.project.canon

    assert (
        canon.world[
            "state_engine_version"
        ]
        == "D1"
    )

    assert (
        canon.unresolved_secrets
        == ["K-EVT-2"]
    )

    assert (
        "K-EVT-1"
        in canon.characters[
            "CHAR-B"
        ][
            "knowledge_ids"
        ]
    )


def test_state_engine_detects_scene_reentry():

    project = _project()

    project.scenes.append(
        type(
            project.scenes[0]
        )(
            scene_id="SCENE-2",
            title="Other",
            location_id="LOC-1",
            character_ids=[
                "CHAR-A",
                "CHAR-B",
            ],
            event_ids=[
                "EVT-2",
            ],
        )
    )

    project.scenes[0].event_ids = [
        "EVT-1",
    ]

    project.events.append(
        type(
            project.events[0]
        )(
            event_id="EVT-3",
            scene_id="SCENE-1",
            actor_id="CHAR-A",
            action="provides information",
            target_id="CHAR-B",
            location_id="LOC-1",
            content="A tells B one more fact.",
        )
    )

    project.events[1].scene_id = (
        "SCENE-2"
    )

    project.canon.world[
        "timeline_event_ids"
    ] = [
        "EVT-1",
        "EVT-2",
        "EVT-3",
    ]

    result = build_story_state(
        project
    )

    codes = {
        item.code
        for item in result.state.issues
    }

    assert (
        "SCENE_TIMELINE_REENTRY"
        in codes
    )


def test_state_engine_rejects_broken_timeline():

    project = _project()

    project.canon.world[
        "timeline_event_ids"
    ] = [
        "EVT-1",
    ]

    with pytest.raises(
        ValueError,
        match="timeline/event mismatch",
    ):

        build_story_state(
            project
        )
