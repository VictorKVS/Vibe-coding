from father.runtime.story.schema import (
    StoryProject,
)
from father.runtime.story.continuity_ledger import (
    build_continuity_ledgers,
)
from father.runtime.story.continuity_ledger_schema import (
    ContinuityDirectiveBundle,
)


def _project():

    return StoryProject(
        project_id="P1",
        title="Ledger Test",

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

        scenes=[
            {
                "scene_id": "S1",
                "title": "Scene",
                "character_ids": [
                    "CHAR-A",
                    "CHAR-B",
                ],
                "event_ids": [
                    "E1",
                    "E2",
                    "E3",
                    "E4",
                ],
            }
        ],

        events=[
            {
                "event_id": "E1",
                "scene_id": "S1",
                "actor_id": "CHAR-A",
                "action": "event",
            },

            {
                "event_id": "E2",
                "scene_id": "S1",
                "actor_id": "CHAR-A",
                "action": "event",
            },

            {
                "event_id": "E3",
                "scene_id": "S1",
                "actor_id": "CHAR-A",
                "action": "event",
            },

            {
                "event_id": "E4",
                "scene_id": "S1",
                "actor_id": "CHAR-A",
                "action": "event",
            },
        ],

        canon={
            "world": {
                "timeline_event_ids": [
                    "E1",
                    "E2",
                    "E3",
                    "E4",
                ]
            }
        },
    )


def _bundle(
    directives,
):

    return ContinuityDirectiveBundle(
        project_id="P1",
        directives=directives,
    )


def test_object_acquire_use_release():

    result = build_continuity_ledgers(
        _project(),

        _bundle(
            [
                {
                    "directive_id": "D1",
                    "event_id": "E1",
                    "directive_type": "object_acquire",
                    "character_id": "CHAR-A",
                    "object_id": "OBJ-KEY",
                    "label": "key",
                },

                {
                    "directive_id": "D2",
                    "event_id": "E2",
                    "directive_type": "object_use",
                    "character_id": "CHAR-A",
                    "object_id": "OBJ-KEY",
                },

                {
                    "directive_id": "D3",
                    "event_id": "E3",
                    "directive_type": "object_release",
                    "character_id": "CHAR-A",
                    "object_id": "OBJ-KEY",
                },
            ]
        ),
    )

    assert (
        result.report["passed"]
        is True
    )

    assert (
        result.objects[
            "OBJ-KEY"
        ].status
        == "released"
    )

    assert (
        result.objects[
            "OBJ-KEY"
        ].owner_id
        is None
    )


def test_object_use_without_possession_fails():

    result = build_continuity_ledgers(
        _project(),

        _bundle(
            [
                {
                    "directive_id": "D1",
                    "event_id": "E1",
                    "directive_type": "object_use",
                    "character_id": "CHAR-A",
                    "object_id": "OBJ-KEY",
                }
            ]
        ),
    )

    codes = {
        item.code
        for item in result.violations
    }

    assert (
        "OBJECT_USE_WITHOUT_POSSESSION"
        in codes
    )

    assert (
        result.report["passed"]
        is False
    )


def test_injury_persists_until_healed():

    result = build_continuity_ledgers(
        _project(),

        _bundle(
            [
                {
                    "directive_id": "D1",
                    "event_id": "E1",
                    "directive_type": "injury_add",
                    "character_id": "CHAR-A",
                    "injury_id": "INJ-1",
                    "label": "cut hand",
                },

                {
                    "directive_id": "D2",
                    "event_id": "E4",
                    "directive_type": "injury_heal",
                    "character_id": "CHAR-A",
                    "injury_id": "INJ-1",
                },
            ]
        ),
    )

    injury = result.injuries[
        "INJ-1"
    ]

    assert (
        injury.status
        == "healed"
    )

    assert (
        injury.created_event_id
        == "E1"
    )

    assert (
        injury.healed_event_id
        == "E4"
    )


def test_commitment_remains_open_until_resolution():

    result = build_continuity_ledgers(
        _project(),

        _bundle(
            [
                {
                    "directive_id": "D1",
                    "event_id": "E1",
                    "directive_type": "commitment_open",
                    "character_id": "CHAR-A",
                    "target_character_id": "CHAR-B",
                    "commitment_id": "COM-1",
                    "label": "return the key",
                }
            ]
        ),
    )

    assert (
        result.commitments[
            "COM-1"
        ].status
        == "open"
    )

    assert (
        result.report[
            "open_commitments"
        ]
        == ["COM-1"]
    )


def test_commitment_can_be_fulfilled():

    result = build_continuity_ledgers(
        _project(),

        _bundle(
            [
                {
                    "directive_id": "D1",
                    "event_id": "E1",
                    "directive_type": "commitment_open",
                    "character_id": "CHAR-A",
                    "commitment_id": "COM-1",
                    "label": "return the key",
                },

                {
                    "directive_id": "D2",
                    "event_id": "E4",
                    "directive_type": "commitment_resolve",
                    "character_id": "CHAR-A",
                    "commitment_id": "COM-1",
                    "resolution": "fulfilled",
                },
            ]
        ),
    )

    assert (
        result.commitments[
            "COM-1"
        ].status
        == "fulfilled"
    )

    assert (
        result.report[
            "open_commitments"
        ]
        == []
    )


def test_goal_lifecycle():

    result = build_continuity_ledgers(
        _project(),

        _bundle(
            [
                {
                    "directive_id": "D1",
                    "event_id": "E1",
                    "directive_type": "goal_open",
                    "character_id": "CHAR-A",
                    "goal_id": "GOAL-1",
                    "label": "escape",
                },

                {
                    "directive_id": "D2",
                    "event_id": "E4",
                    "directive_type": "goal_resolve",
                    "character_id": "CHAR-A",
                    "goal_id": "GOAL-1",
                    "resolution": "achieved",
                },
            ]
        ),
    )

    assert (
        result.goals[
            "GOAL-1"
        ].status
        == "achieved"
    )

    assert (
        result.report[
            "active_goals"
        ]
        == []
    )
