from __future__ import annotations

from typing import Dict, List, Optional, Tuple

from father.runtime.story.schema import (
    StoryProject,
)
from father.runtime.story.state_schema import (
    StoryStateResult,
)
from father.runtime.story.continuity_schema import (
    ContinuityAuditResult,
    RuleViolation,
)


RULES = [
    "PROJECT_ID_MATCH",
    "TIMELINE_MATCH",
    "TRANSITION_ORDER",
    "EVENT_TRANSITION_MATCH",
    "KNOWLEDGE_REFERENCE",
    "KNOWLEDGE_SOURCE_EVENT",
    "KNOWLEDGE_AFTER_SOURCE",
    "KNOWLEDGE_NOT_BEFORE_SOURCE",
    "SECRET_BOUNDARY",
    "CHARACTER_KNOWLEDGE_REFERENCE",
    "UNRESOLVED_SECRET_REFERENCE",
    "CHARACTER_STATE_CHAIN",
]


def _dump_model(
    value,
):

    if hasattr(
        value,
        "model_dump",
    ):
        return value.model_dump(
            mode="json"
        )

    return value.dict()


def _knowledge_ids(
    snapshot: Optional[
        Dict[str, object]
    ],
) -> List[str]:

    if not snapshot:
        return []

    values = snapshot.get(
        "knowledge_ids",
        [],
    )

    if not isinstance(
        values,
        list,
    ):
        return []

    return [
        str(item)
        for item in values
    ]


def audit_continuity(
    project: StoryProject,
    state: StoryStateResult,
) -> ContinuityAuditResult:

    violations: List[
        RuleViolation
    ] = []

    counter = 1


    def add(
        severity: str,
        rule_code: str,
        message: str,
        event_id: Optional[str] = None,
        scene_id: Optional[str] = None,
        character_id: Optional[str] = None,
        knowledge_id: Optional[str] = None,
        details: Optional[
            Dict[str, object]
        ] = None,
    ) -> None:

        nonlocal counter

        violations.append(
            RuleViolation(
                violation_id=(
                    f"RULE-{counter:03d}"
                ),

                severity=severity,

                rule_code=rule_code,

                message=message,

                event_id=event_id,

                scene_id=scene_id,

                character_id=character_id,

                knowledge_id=knowledge_id,

                details=(
                    details
                    or {}
                ),
            )
        )

        counter += 1


    # --------------------------------------------------------
    # Indexes
    # --------------------------------------------------------

    event_map = {
        item.event_id: item
        for item in project.events
    }

    transition_map = {
        item.event_id: item
        for item in state.transitions
    }

    knowledge_map = {
        item.knowledge_id: item
        for item in state.knowledge
    }

    character_ids = {
        item.character_id
        for item in project.characters
    }


    # --------------------------------------------------------
    # PROJECT_ID_MATCH
    # --------------------------------------------------------

    if (
        project.project_id
        != state.project_id
    ):

        add(
            "error",
            "PROJECT_ID_MATCH",

            "StoryProject and StoryState "
            "project IDs differ.",

            details={
                "project": (
                    project.project_id
                ),

                "state": (
                    state.project_id
                ),
            },
        )


    # --------------------------------------------------------
    # TIMELINE_MATCH
    # --------------------------------------------------------

    canonical_timeline = [
        str(item)
        for item in project.canon.world.get(
            "timeline_event_ids",
            [],
        )
    ]

    state_timeline = list(
        state.timeline_event_ids
    )


    if (
        canonical_timeline
        != state_timeline
    ):

        add(
            "error",
            "TIMELINE_MATCH",

            "Canon timeline differs from "
            "StoryState timeline.",

            details={
                "canon": (
                    canonical_timeline
                ),

                "state": (
                    state_timeline
                ),
            },
        )


    # --------------------------------------------------------
    # TRANSITION_ORDER
    # --------------------------------------------------------

    transition_order = [
        item.event_id
        for item in state.transitions
    ]


    if (
        transition_order
        != state_timeline
    ):

        add(
            "error",
            "TRANSITION_ORDER",

            "Transition order differs from "
            "state timeline.",

            details={
                "timeline": (
                    state_timeline
                ),

                "transitions": (
                    transition_order
                ),
            },
        )


    # --------------------------------------------------------
    # EVENT_TRANSITION_MATCH
    # --------------------------------------------------------

    for event_id in state_timeline:

        event = event_map.get(
            event_id
        )

        transition = transition_map.get(
            event_id
        )


        if event is None:

            add(
                "error",
                "EVENT_TRANSITION_MATCH",

                "Timeline references unknown event.",

                event_id=event_id,
            )

            continue


        if transition is None:

            add(
                "error",
                "EVENT_TRANSITION_MATCH",

                "Event has no state transition.",

                event_id=event_id,

                scene_id=(
                    event.scene_id
                ),
            )

            continue


        if (
            event.scene_id
            != transition.scene_id
        ):

            add(
                "error",
                "EVENT_TRANSITION_MATCH",

                "Event and transition "
                "scene IDs differ.",

                event_id=event_id,

                scene_id=(
                    event.scene_id
                ),

                details={
                    "event_scene": (
                        event.scene_id
                    ),

                    "transition_scene": (
                        transition.scene_id
                    ),
                },
            )


        if (
            event.before_state
            != transition.before
        ):

            add(
                "error",
                "EVENT_TRANSITION_MATCH",

                "Event.before_state differs "
                "from transition.before.",

                event_id=event_id,

                scene_id=(
                    event.scene_id
                ),
            )


        if (
            event.after_state
            != transition.after
        ):

            add(
                "error",
                "EVENT_TRANSITION_MATCH",

                "Event.after_state differs "
                "from transition.after.",

                event_id=event_id,

                scene_id=(
                    event.scene_id
                ),
            )


    # --------------------------------------------------------
    # KNOWLEDGE_REFERENCE +
    # KNOWLEDGE_SOURCE_EVENT +
    # KNOWLEDGE_AFTER_SOURCE +
    # KNOWLEDGE_NOT_BEFORE_SOURCE
    # --------------------------------------------------------

    timeline_position = {
        event_id: index
        for index, event_id
        in enumerate(
            state_timeline
        )
    }


    for record in state.knowledge:

        if (
            record.source_event_id
            not in event_map
        ):

            add(
                "error",
                "KNOWLEDGE_SOURCE_EVENT",

                "Knowledge record references "
                "unknown source event.",

                event_id=(
                    record.source_event_id
                ),

                knowledge_id=(
                    record.knowledge_id
                ),
            )

            continue


        transition = transition_map.get(
            record.source_event_id
        )


        if transition is None:

            add(
                "error",
                "KNOWLEDGE_SOURCE_EVENT",

                "Knowledge source event has "
                "no transition.",

                event_id=(
                    record.source_event_id
                ),

                knowledge_id=(
                    record.knowledge_id
                ),
            )

            continue


        source_event = event_map[
            record.source_event_id
        ]


        # Every character reference must exist.

        for character_id in (
            record.known_by
            + record.hidden_from
        ):

            if (
                character_id
                not in character_ids
            ):

                add(
                    "error",
                    "KNOWLEDGE_REFERENCE",

                    "Knowledge record references "
                    "unknown character.",

                    event_id=(
                        record.source_event_id
                    ),

                    scene_id=(
                        record.scene_id
                    ),

                    character_id=(
                        character_id
                    ),

                    knowledge_id=(
                        record.knowledge_id
                    ),
                )


        # known_by and hidden_from are mutually exclusive.

        overlap = (
            set(
                record.known_by
            )
            & set(
                record.hidden_from
            )
        )


        if overlap:

            add(
                "error",
                "SECRET_BOUNDARY",

                "Character is simultaneously "
                "known_by and hidden_from.",

                event_id=(
                    record.source_event_id
                ),

                scene_id=(
                    record.scene_id
                ),

                knowledge_id=(
                    record.knowledge_id
                ),

                details={
                    "overlap": sorted(
                        overlap
                    )
                },
            )


        # The source transition must grant knowledge
        # to direct participants represented in after.

        for character_id in (
            record.known_by
        ):

            after_state = (
                transition.after.get(
                    character_id
                )
            )


            if after_state is not None:

                if (
                    record.knowledge_id
                    not in _knowledge_ids(
                        after_state
                    )
                ):

                    add(
                        "error",
                        "KNOWLEDGE_AFTER_SOURCE",

                        "Character should know "
                        "knowledge after source event.",

                        event_id=(
                            record.source_event_id
                        ),

                        scene_id=(
                            record.scene_id
                        ),

                        character_id=(
                            character_id
                        ),

                        knowledge_id=(
                            record.knowledge_id
                        ),
                    )


        # hidden_from must not gain it at source event.

        for character_id in (
            record.hidden_from
        ):

            after_state = (
                transition.after.get(
                    character_id
                )
            )


            if (
                after_state is not None
                and record.knowledge_id
                in _knowledge_ids(
                    after_state
                )
            ):

                add(
                    "error",
                    "SECRET_BOUNDARY",

                    "Hidden character learned "
                    "secret at withholding event.",

                    event_id=(
                        record.source_event_id
                    ),

                    scene_id=(
                        record.scene_id
                    ),

                    character_id=(
                        character_id
                    ),

                    knowledge_id=(
                        record.knowledge_id
                    ),
                )


        # Knowledge cannot appear in an earlier
        # transition snapshot than its source event.

        source_position = (
            timeline_position[
                record.source_event_id
            ]
        )


        for earlier_event_id in (
            state_timeline[
                :source_position
            ]
        ):

            earlier = transition_map.get(
                earlier_event_id
            )

            if earlier is None:
                continue


            snapshots = list(
                earlier.before.values()
            ) + list(
                earlier.after.values()
            )


            for snapshot in snapshots:

                if (
                    record.knowledge_id
                    in _knowledge_ids(
                        snapshot
                    )
                ):

                    add(
                        "error",
                        "KNOWLEDGE_NOT_BEFORE_SOURCE",

                        "Knowledge appears before "
                        "its source event.",

                        event_id=(
                            earlier_event_id
                        ),

                        knowledge_id=(
                            record.knowledge_id
                        ),

                        details={
                            "source_event_id": (
                                record.source_event_id
                            )
                        },
                    )

                    break


    # --------------------------------------------------------
    # CHARACTER_KNOWLEDGE_REFERENCE
    # --------------------------------------------------------

    for (
        character_id,
        runtime_state,
    ) in state.characters.items():

        if (
            character_id
            not in character_ids
        ):

            add(
                "error",
                "CHARACTER_KNOWLEDGE_REFERENCE",

                "StoryState contains "
                "unknown character.",

                character_id=(
                    character_id
                ),
            )


        for knowledge_id in (
            runtime_state.knowledge_ids
        ):

            if (
                knowledge_id
                not in knowledge_map
            ):

                add(
                    "error",
                    "CHARACTER_KNOWLEDGE_REFERENCE",

                    "Character references "
                    "unknown knowledge ID.",

                    character_id=(
                        character_id
                    ),

                    knowledge_id=(
                        knowledge_id
                    ),
                )


        for secret_id in (
            runtime_state.secret_ids
        ):

            record = knowledge_map.get(
                secret_id
            )


            if record is None:

                add(
                    "error",
                    "CHARACTER_KNOWLEDGE_REFERENCE",

                    "Character references "
                    "unknown secret ID.",

                    character_id=(
                        character_id
                    ),

                    knowledge_id=(
                        secret_id
                    ),
                )

                continue


            if (
                record.kind
                != "secret"
            ):

                add(
                    "error",
                    "CHARACTER_KNOWLEDGE_REFERENCE",

                    "Character secret_ids contains "
                    "non-secret knowledge.",

                    character_id=(
                        character_id
                    ),

                    knowledge_id=(
                        secret_id
                    ),
                )


    # --------------------------------------------------------
    # SECRET_BOUNDARY final-state check
    # --------------------------------------------------------

    for record in state.knowledge:

        if (
            record.kind
            != "secret"
        ):
            continue


        for character_id in (
            record.hidden_from
        ):

            runtime_state = (
                state.characters.get(
                    character_id
                )
            )


            if runtime_state is None:
                continue


            if (
                record.knowledge_id
                in runtime_state.knowledge_ids
            ):

                add(
                    "error",
                    "SECRET_BOUNDARY",

                    "Secret leaked to a character "
                    "listed in hidden_from.",

                    event_id=(
                        record.source_event_id
                    ),

                    scene_id=(
                        record.scene_id
                    ),

                    character_id=(
                        character_id
                    ),

                    knowledge_id=(
                        record.knowledge_id
                    ),
                )


    # --------------------------------------------------------
    # UNRESOLVED_SECRET_REFERENCE
    # --------------------------------------------------------

    unresolved = set(
        state.unresolved_secret_ids
    )


    expected_unresolved = {
        item.knowledge_id
        for item in state.knowledge
        if (
            item.kind
            == "secret"
            and item.hidden_from
        )
    }


    unknown_unresolved = (
        unresolved
        - set(
            knowledge_map
        )
    )


    for knowledge_id in sorted(
        unknown_unresolved
    ):

        add(
            "error",
            "UNRESOLVED_SECRET_REFERENCE",

            "Unresolved secret references "
            "unknown knowledge ID.",

            knowledge_id=(
                knowledge_id
            ),
        )


    if (
        unresolved
        != expected_unresolved
    ):

        add(
            "error",
            "UNRESOLVED_SECRET_REFERENCE",

            "Unresolved secret registry differs "
            "from current secret boundaries.",

            details={
                "actual": sorted(
                    unresolved
                ),

                "expected": sorted(
                    expected_unresolved
                ),
            },
        )


    # --------------------------------------------------------
    # CHARACTER_STATE_CHAIN
    #
    # For every character, whenever it appears again,
    # the new before-state must equal the previous after-state.
    # --------------------------------------------------------

    last_after: Dict[
        str,
        Dict[str, object],
    ] = {}


    for event_id in state_timeline:

        transition = transition_map.get(
            event_id
        )

        if transition is None:
            continue


        for (
            character_id,
            before_state,
        ) in transition.before.items():

            previous = last_after.get(
                character_id
            )


            if (
                previous is not None
                and previous
                != before_state
            ):

                add(
                    "error",
                    "CHARACTER_STATE_CHAIN",

                    "Character before-state does "
                    "not continue previous after-state.",

                    event_id=(
                        event_id
                    ),

                    scene_id=(
                        transition.scene_id
                    ),

                    character_id=(
                        character_id
                    ),

                    details={
                        "previous_after": (
                            previous
                        ),

                        "current_before": (
                            before_state
                        ),
                    },
                )


        for (
            character_id,
            after_state,
        ) in transition.after.items():

            last_after[
                character_id
            ] = after_state


    # --------------------------------------------------------
    # Result
    # --------------------------------------------------------

    errors = [
        item
        for item in violations
        if item.severity
        == "error"
    ]

    warnings = [
        item
        for item in violations
        if item.severity
        == "warning"
    ]


    return ContinuityAuditResult(
        project_id=(
            project.project_id
        ),

        rules_checked=list(
            RULES
        ),

        violations=violations,

        report={
            "mode": "deterministic",

            "llm_used": False,

            "rules_checked": len(
                RULES
            ),

            "violations": len(
                violations
            ),

            "errors": len(
                errors
            ),

            "warnings": len(
                warnings
            ),

            "passed": (
                len(
                    errors
                )
                == 0
            ),
        },
    )
