from __future__ import annotations

from dataclasses import dataclass
from typing import Dict, Iterable, List, Optional

from father.runtime.story.schema import (
    StoryProject,
)
from father.runtime.story.state_schema import (
    CharacterRuntimeState,
    ContinuityIssue,
    EventTransition,
    KnowledgeRecord,
    StateChange,
    StoryStateResult,
)


@dataclass
class StateBuildResult:

    project: StoryProject
    state: StoryStateResult


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


def _append_unique(
    values: List[str],
    value: Optional[str],
) -> None:

    if not value:
        return

    if value not in values:

        values.append(
            value
        )


def _snapshot_ids(
    states: Dict[
        str,
        CharacterRuntimeState,
    ],
    character_ids: Iterable[str],
) -> Dict[
    str,
    Dict[str, object],
]:

    result = {}

    for character_id in character_ids:

        state = states.get(
            character_id
        )

        if state is None:
            continue

        result[
            character_id
        ] = _dump_model(
            state
        )

    return result


def _communication_action(
    action: str,
) -> bool:

    value = action.lower()

    markers = (
        "asks",
        "ask ",
        "responds",
        "respond ",
        "answers",
        "answer ",
        "provides information",
        "tells",
        "tell ",
        "says",
        "say ",
        "gives instruction",
        "instructs",
        "warns",
        "warn ",
    )

    return any(
        marker in value
        for marker in markers
    )


def _withholding_action(
    action: str,
    content: Optional[str],
) -> bool:

    action_value = (
        action or ""
    ).lower()

    content_value = (
        content or ""
    ).lower()

    return (
        "withhold"
        in action_value
        or "does not tell"
        in content_value
        or "did not tell"
        in content_value
    )


def _hidden_content(
    content: Optional[str],
) -> str:

    value = (
        content or ""
    ).strip()

    lower = value.lower()

    markers = (
        " that ",
        ": ",
    )

    for marker in markers:

        position = lower.find(
            marker
        )

        if position >= 0:

            result = value[
                position
                + len(marker):
            ].strip()

            if result:

                return result

    return value


def _evidence_ids(
    event,
) -> List[str]:

    return [
        item.source_id
        for item in event.evidence
    ]


def _validate_timeline(
    project: StoryProject,
) -> List[str]:

    event_ids = [
        item.event_id
        for item in project.events
    ]

    raw = project.canon.world.get(
        "timeline_event_ids",
        []
    )

    timeline = [
        str(item)
        for item in raw
    ]


    if not timeline:

        timeline = list(
            event_ids
        )


    if len(
        timeline
    ) != len(
        set(
            timeline
        )
    ):

        raise ValueError(
            "Story timeline contains duplicate event IDs."
        )


    if set(
        timeline
    ) != set(
        event_ids
    ):

        missing = (
            set(
                event_ids
            )
            - set(
                timeline
            )
        )

        extra = (
            set(
                timeline
            )
            - set(
                event_ids
            )
        )

        raise ValueError(
            "Story timeline/event mismatch. "
            f"Missing={sorted(missing)} "
            f"Extra={sorted(extra)}"
        )


    return timeline


def _detect_scene_reentry(
    timeline: List[str],
    event_map,
) -> List[ContinuityIssue]:

    compressed: List[str] = []

    for event_id in timeline:

        scene_id = (
            event_map[
                event_id
            ].scene_id
        )

        if (
            not compressed
            or compressed[-1]
            != scene_id
        ):

            compressed.append(
                scene_id
            )


    issues = []

    seen = set()

    issue_index = 1

    for scene_id in compressed:

        if scene_id in seen:

            issues.append(
                ContinuityIssue(
                    issue_id=(
                        f"CONT-{issue_index:03d}"
                    ),

                    severity="warning",

                    code=(
                        "SCENE_TIMELINE_REENTRY"
                    ),

                    scene_id=scene_id,

                    message=(
                        "Scene appears in more than one "
                        "non-contiguous timeline segment."
                    ),
                )
            )

            issue_index += 1

        seen.add(
            scene_id
        )


    return issues


def build_story_state(
    project: StoryProject,
) -> StateBuildResult:

    timeline = _validate_timeline(
        project
    )


    event_map = {
        item.event_id: item
        for item in project.events
    }


    scene_map = {
        item.scene_id: item
        for item in project.scenes
    }


    character_ids = {
        item.character_id
        for item in project.characters
    }


    location_ids = {
        item.location_id
        for item in project.locations
    }


    states = {
        character.character_id:
            CharacterRuntimeState(
                character_id=(
                    character.character_id
                )
            )
        for character in project.characters
    }


    knowledge: List[
        KnowledgeRecord
    ] = []


    transitions: List[
        EventTransition
    ] = []


    issues = _detect_scene_reentry(
        timeline=timeline,
        event_map=event_map,
    )


    scene_started = set()


    # --------------------------------------------------------
    # Walk canonical timeline, never scene-group order.
    # --------------------------------------------------------

    for event_id in timeline:

        event = event_map[
            event_id
        ]


        scene = scene_map.get(
            event.scene_id
        )

        if scene is None:

            raise ValueError(
                f"{event.event_id}: "
                f"unknown scene {event.scene_id}"
            )


        touched: List[str] = []


        if (
            event.actor_id
            and event.actor_id
            in character_ids
        ):

            touched.append(
                event.actor_id
            )


        if (
            event.target_id
            and event.target_id
            in character_ids
            and event.target_id
            not in touched
        ):

            touched.append(
                event.target_id
            )


        if (
            event.scene_id
            not in scene_started
        ):

            scene.character_state_before = (
                _snapshot_ids(
                    states,
                    scene.character_ids,
                )
            )

            scene_started.add(
                event.scene_id
            )


        before = _snapshot_ids(
            states,
            touched,
        )


        changes: List[
            StateChange
        ] = []


        # ----------------------------------------------------
        # Actor state
        # ----------------------------------------------------

        actor_state = None

        if (
            event.actor_id
            and event.actor_id
            in states
        ):

            actor_state = states[
                event.actor_id
            ]


            old_scene = (
                actor_state.scene_id
            )

            if (
                old_scene
                != event.scene_id
            ):

                actor_state.scene_id = (
                    event.scene_id
                )

                changes.append(
                    StateChange(
                        event_id=(
                            event.event_id
                        ),

                        character_id=(
                            event.actor_id
                        ),

                        field="scene_id",

                        before=old_scene,

                        after=(
                            event.scene_id
                        ),

                        reason=(
                            "Actor participates "
                            "in event."
                        ),
                    )
                )


            if (
                event.location_id
                and event.location_id
                in location_ids
            ):

                old_location = (
                    actor_state.location_id
                )

                if (
                    old_location
                    != event.location_id
                ):

                    actor_state.location_id = (
                        event.location_id
                    )

                    changes.append(
                        StateChange(
                            event_id=(
                                event.event_id
                            ),

                            character_id=(
                                event.actor_id
                            ),

                            field=(
                                "location_id"
                            ),

                            before=(
                                old_location
                            ),

                            after=(
                                event.location_id
                            ),

                            reason=(
                                "Explicit event "
                                "location."
                            ),
                        )
                    )


            _append_unique(
                actor_state.observed_event_ids,
                event.event_id,
            )


        # ----------------------------------------------------
        # Target character observes direct interaction
        # ----------------------------------------------------

        target_state = None

        if (
            event.target_id
            and event.target_id
            in states
        ):

            target_state = states[
                event.target_id
            ]

            old_scene = (
                target_state.scene_id
            )

            if (
                old_scene
                != event.scene_id
            ):

                target_state.scene_id = (
                    event.scene_id
                )

                changes.append(
                    StateChange(
                        event_id=(
                            event.event_id
                        ),

                        character_id=(
                            event.target_id
                        ),

                        field="scene_id",

                        before=old_scene,

                        after=(
                            event.scene_id
                        ),

                        reason=(
                            "Character is direct "
                            "event target."
                        ),
                    )
                )


            _append_unique(
                target_state.observed_event_ids,
                event.event_id,
            )


        # ----------------------------------------------------
        # Meeting/finding implies co-location
        # only when actor location is known.
        # ----------------------------------------------------

        action_lower = (
            event.action or ""
        ).lower()


        if (
            target_state is not None
            and actor_state is not None
            and (
                "finds"
                in action_lower
                or "meets"
                in action_lower
            )
            and actor_state.location_id
        ):

            old_location = (
                target_state.location_id
            )

            if (
                old_location
                != actor_state.location_id
            ):

                target_state.location_id = (
                    actor_state.location_id
                )

                changes.append(
                    StateChange(
                        event_id=(
                            event.event_id
                        ),

                        character_id=(
                            event.target_id
                        ),

                        field="location_id",

                        before=old_location,

                        after=(
                            actor_state.location_id
                        ),

                        reason=(
                            "Direct meeting/finding "
                            "with located actor."
                        ),
                    )
                )


        # ----------------------------------------------------
        # Secret / withheld information
        # ----------------------------------------------------

        if _withholding_action(
            event.action,
            event.content,
        ):

            knowledge_id = (
                f"K-{event.event_id}"
            )

            known_by = []

            hidden_from = []


            if (
                event.actor_id
                and event.actor_id
                in states
            ):

                known_by.append(
                    event.actor_id
                )


            if (
                event.target_id
                and event.target_id
                in states
            ):

                hidden_from.append(
                    event.target_id
                )


            record = KnowledgeRecord(
                knowledge_id=(
                    knowledge_id
                ),

                source_event_id=(
                    event.event_id
                ),

                scene_id=(
                    event.scene_id
                ),

                kind="secret",

                content=_hidden_content(
                    event.content
                ),

                known_by=known_by,

                hidden_from=hidden_from,

                evidence_ids=_evidence_ids(
                    event
                ),
            )


            knowledge.append(
                record
            )


            for character_id in known_by:

                state = states[
                    character_id
                ]

                _append_unique(
                    state.knowledge_ids,
                    knowledge_id,
                )

                _append_unique(
                    state.secret_ids,
                    knowledge_id,
                )


        # ----------------------------------------------------
        # Direct communication
        # ----------------------------------------------------

        elif (
            _communication_action(
                event.action
            )
            and target_state
            is not None
        ):

            knowledge_id = (
                f"K-{event.event_id}"
            )

            known_by = []


            if (
                event.actor_id
                and event.actor_id
                in states
            ):

                known_by.append(
                    event.actor_id
                )


            if (
                event.target_id
                and event.target_id
                in states
                and event.target_id
                not in known_by
            ):

                known_by.append(
                    event.target_id
                )


            record = KnowledgeRecord(
                knowledge_id=(
                    knowledge_id
                ),

                source_event_id=(
                    event.event_id
                ),

                scene_id=(
                    event.scene_id
                ),

                kind=(
                    "communication"
                ),

                content=(
                    event.content
                    or event.action
                ),

                known_by=known_by,

                hidden_from=[],

                evidence_ids=_evidence_ids(
                    event
                ),
            )


            knowledge.append(
                record
            )


            for character_id in known_by:

                _append_unique(
                    states[
                        character_id
                    ].knowledge_ids,

                    knowledge_id,
                )


        after = _snapshot_ids(
            states,
            touched,
        )


        transition = EventTransition(
            event_id=(
                event.event_id
            ),

            scene_id=(
                event.scene_id
            ),

            before=before,

            after=after,

            changes=changes,
        )


        transitions.append(
            transition
        )


        event.before_state = (
            before
        )

        event.after_state = (
            after
        )


        scene.character_state_after = (
            _snapshot_ids(
                states,
                scene.character_ids,
            )
        )


    # --------------------------------------------------------
    # Scene membership diagnostics
    # --------------------------------------------------------

    issue_index = (
        len(issues)
        + 1
    )


    for event_id in timeline:

        event = event_map[
            event_id
        ]

        scene = scene_map[
            event.scene_id
        ]


        if (
            event.actor_id
            and event.actor_id
            in character_ids
            and event.actor_id
            not in scene.character_ids
        ):

            issues.append(
                ContinuityIssue(
                    issue_id=(
                        f"CONT-{issue_index:03d}"
                    ),

                    severity="warning",

                    code=(
                        "ACTOR_NOT_IN_SCENE_CAST"
                    ),

                    event_id=(
                        event.event_id
                    ),

                    scene_id=(
                        event.scene_id
                    ),

                    message=(
                        f"Actor {event.actor_id} "
                        "is not listed in "
                        "Scene.character_ids."
                    ),
                )
            )

            issue_index += 1


    # --------------------------------------------------------
    # Final unresolved secrets
    # --------------------------------------------------------

    unresolved_secret_ids = [
        item.knowledge_id
        for item in knowledge
        if (
            item.kind == "secret"
            and item.hidden_from
        )
    ]


    # --------------------------------------------------------
    # Update CanonState, preserving existing data.
    # --------------------------------------------------------

    for (
        character_id,
        runtime_state,
    ) in states.items():

        current = dict(
            project.canon.characters.get(
                character_id,
                {},
            )
        )

        current.update(
            {
                "last_scene_id": (
                    runtime_state.scene_id
                ),

                "last_location_id": (
                    runtime_state.location_id
                ),

                "observed_event_ids": list(
                    runtime_state.observed_event_ids
                ),

                "knowledge_ids": list(
                    runtime_state.knowledge_ids
                ),

                "secret_ids": list(
                    runtime_state.secret_ids
                ),
            }
        )

        project.canon.characters[
            character_id
        ] = current


    project.canon.unresolved_secrets = (
        list(
            unresolved_secret_ids
        )
    )


    project.canon.world[
        "state_engine_version"
    ] = "D1"


    project.canon.world[
        "state_timeline_event_ids"
    ] = list(
        timeline
    )


    project.canon.world[
        "knowledge_record_ids"
    ] = [
        item.knowledge_id
        for item in knowledge
    ]


    project.canon.world[
        "continuity_issue_ids"
    ] = [
        item.issue_id
        for item in issues
    ]


    state_result = StoryStateResult(
        project_id=(
            project.project_id
        ),

        timeline_event_ids=list(
            timeline
        ),

        characters=states,

        knowledge=knowledge,

        transitions=transitions,

        unresolved_secret_ids=(
            unresolved_secret_ids
        ),

        issues=issues,

        report={
            "mode": (
                "deterministic"
            ),

            "llm_used": False,

            "timeline_events": (
                len(
                    timeline
                )
            ),

            "transitions": (
                len(
                    transitions
                )
            ),

            "knowledge_records": (
                len(
                    knowledge
                )
            ),

            "unresolved_secrets": (
                len(
                    unresolved_secret_ids
                )
            ),

            "continuity_issues": (
                len(
                    issues
                )
            ),
        },
    )


    return StateBuildResult(
        project=project,
        state=state_result,
    )
