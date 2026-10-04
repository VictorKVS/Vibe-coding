from __future__ import annotations

from typing import Dict, List, Optional

from father.runtime.story.schema import (
    StoryProject,
)
from father.runtime.story.continuity_ledger_schema import (
    CommitmentLedgerState,
    ContinuityDirectiveBundle,
    ContinuityLedgerResult,
    GoalLedgerState,
    InjuryLedgerState,
    LedgerTransition,
    LedgerViolation,
    ObjectLedgerState,
)


def _dump(
    value,
):

    if value is None:
        return None

    if hasattr(
        value,
        "model_dump",
    ):
        return value.model_dump(
            mode="json"
        )

    return value.dict()


def build_continuity_ledgers(
    project: StoryProject,
    bundle: ContinuityDirectiveBundle,
) -> ContinuityLedgerResult:

    if (
        project.project_id
        != bundle.project_id
    ):

        raise ValueError(
            "Project/directive bundle ID mismatch."
        )


    timeline = [
        str(item)
        for item in project.canon.world.get(
            "timeline_event_ids",
            []
        )
    ]


    event_ids = {
        item.event_id
        for item in project.events
    }


    character_ids = {
        item.character_id
        for item in project.characters
    }


    position = {
        event_id: index
        for index, event_id
        in enumerate(
            timeline
        )
    }


    directive_ids = set()

    for directive in bundle.directives:

        if (
            directive.directive_id
            in directive_ids
        ):

            raise ValueError(
                "Duplicate continuity directive ID: "
                + directive.directive_id
            )

        directive_ids.add(
            directive.directive_id
        )


    ordered = sorted(
        bundle.directives,

        key=lambda item: (
            position.get(
                item.event_id,
                10 ** 9,
            ),

            item.directive_id,
        ),
    )


    objects: Dict[
        str,
        ObjectLedgerState,
    ] = {}


    injuries: Dict[
        str,
        InjuryLedgerState,
    ] = {}


    commitments: Dict[
        str,
        CommitmentLedgerState,
    ] = {}


    goals: Dict[
        str,
        GoalLedgerState,
    ] = {}


    transitions: List[
        LedgerTransition
    ] = []


    violations: List[
        LedgerViolation
    ] = []


    violation_index = 1


    def add_violation(
        code: str,
        message: str,
        directive,
        entity_id: Optional[str] = None,
        severity: str = "error",
    ) -> None:

        nonlocal violation_index

        violations.append(
            LedgerViolation(
                violation_id=(
                    f"LEDGER-{violation_index:03d}"
                ),

                severity=severity,

                code=code,

                message=message,

                directive_id=(
                    directive.directive_id
                ),

                event_id=(
                    directive.event_id
                ),

                character_id=(
                    directive.character_id
                ),

                entity_id=(
                    entity_id
                ),
            )
        )

        violation_index += 1


    # ========================================================
    # PROCESS DIRECTIVES IN CANONICAL TIMELINE ORDER
    # ========================================================

    for directive in ordered:

        if (
            directive.event_id
            not in event_ids
        ):

            add_violation(
                "UNKNOWN_EVENT",
                "Directive references unknown event.",
                directive,
            )

            continue


        if (
            directive.event_id
            not in position
        ):

            add_violation(
                "EVENT_NOT_IN_TIMELINE",
                "Directive event is absent from canonical timeline.",
                directive,
            )

            continue


        if (
            directive.character_id
            not in character_ids
        ):

            add_violation(
                "UNKNOWN_CHARACTER",
                "Directive references unknown character.",
                directive,
            )

            continue


        dtype = (
            directive.directive_type
        )


        # ====================================================
        # OBJECTS
        # ====================================================

        if dtype.startswith(
            "object_"
        ):

            object_id = (
                directive.object_id
            )

            if not object_id:

                add_violation(
                    "OBJECT_ID_REQUIRED",
                    "Object directive requires object_id.",
                    directive,
                )

                continue


            current = objects.get(
                object_id
            )

            before = _dump(
                current
            )


            if (
                dtype
                == "object_acquire"
            ):

                if (
                    current is not None
                    and current.status
                    == "destroyed"
                ):

                    add_violation(
                        "OBJECT_ACQUIRE_DESTROYED",
                        "Destroyed object cannot be acquired.",
                        directive,
                        object_id,
                    )

                    continue


                if (
                    current is not None
                    and current.owner_id
                    and current.owner_id
                    != directive.character_id
                ):

                    add_violation(
                        "OBJECT_DOUBLE_OWNERSHIP",
                        "Object is already held by another character.",
                        directive,
                        object_id,
                    )

                    continue


                objects[
                    object_id
                ] = ObjectLedgerState(
                    object_id=(
                        object_id
                    ),

                    label=(
                        directive.label
                        or (
                            current.label
                            if current
                            else ""
                        )
                    ),

                    owner_id=(
                        directive.character_id
                    ),

                    status="held",

                    acquired_event_id=(
                        directive.event_id
                    ),

                    last_event_id=(
                        directive.event_id
                    ),
                )


            elif (
                dtype
                == "object_use"
            ):

                if (
                    current is None
                    or current.status
                    != "held"
                    or current.owner_id
                    != directive.character_id
                ):

                    add_violation(
                        "OBJECT_USE_WITHOUT_POSSESSION",
                        "Character uses object without possessing it.",
                        directive,
                        object_id,
                    )

                    continue


                current.last_event_id = (
                    directive.event_id
                )


            elif (
                dtype
                == "object_release"
            ):

                if (
                    current is None
                    or current.status
                    != "held"
                    or current.owner_id
                    != directive.character_id
                ):

                    add_violation(
                        "OBJECT_RELEASE_WITHOUT_POSSESSION",
                        "Character releases object without possessing it.",
                        directive,
                        object_id,
                    )

                    continue


                current.owner_id = None
                current.status = "released"

                current.last_event_id = (
                    directive.event_id
                )


            elif (
                dtype
                == "object_destroy"
            ):

                if current is None:

                    add_violation(
                        "OBJECT_DESTROY_UNKNOWN",
                        "Unknown object cannot be destroyed.",
                        directive,
                        object_id,
                    )

                    continue


                if (
                    current.status
                    == "destroyed"
                ):

                    add_violation(
                        "OBJECT_ALREADY_DESTROYED",
                        "Object is already destroyed.",
                        directive,
                        object_id,
                    )

                    continue


                if (
                    current.owner_id
                    and current.owner_id
                    != directive.character_id
                ):

                    add_violation(
                        "OBJECT_DESTROY_NOT_OWNER",
                        "Character destroys object held by another character.",
                        directive,
                        object_id,
                    )

                    continue


                current.owner_id = None
                current.status = "destroyed"

                current.last_event_id = (
                    directive.event_id
                )


            after = _dump(
                objects.get(
                    object_id
                )
            )


            transitions.append(
                LedgerTransition(
                    directive_id=(
                        directive.directive_id
                    ),

                    event_id=(
                        directive.event_id
                    ),

                    entity_type="object",

                    entity_id=(
                        object_id
                    ),

                    before=before,

                    after=after,
                )
            )

            continue


        # ====================================================
        # INJURIES
        # ====================================================

        if dtype.startswith(
            "injury_"
        ):

            injury_id = (
                directive.injury_id
            )

            if not injury_id:

                add_violation(
                    "INJURY_ID_REQUIRED",
                    "Injury directive requires injury_id.",
                    directive,
                )

                continue


            current = injuries.get(
                injury_id
            )

            before = _dump(
                current
            )


            if (
                dtype
                == "injury_add"
            ):

                if current is not None:

                    add_violation(
                        "INJURY_DUPLICATE",
                        "Injury ID already exists.",
                        directive,
                        injury_id,
                    )

                    continue


                injuries[
                    injury_id
                ] = InjuryLedgerState(
                    injury_id=(
                        injury_id
                    ),

                    character_id=(
                        directive.character_id
                    ),

                    label=(
                        directive.label
                    ),

                    status="active",

                    created_event_id=(
                        directive.event_id
                    ),
                )


            elif (
                dtype
                == "injury_heal"
            ):

                if current is None:

                    add_violation(
                        "INJURY_HEAL_UNKNOWN",
                        "Cannot heal unknown injury.",
                        directive,
                        injury_id,
                    )

                    continue


                if (
                    current.character_id
                    != directive.character_id
                ):

                    add_violation(
                        "INJURY_CHARACTER_MISMATCH",
                        "Injury belongs to another character.",
                        directive,
                        injury_id,
                    )

                    continue


                if (
                    current.status
                    != "active"
                ):

                    add_violation(
                        "INJURY_ALREADY_HEALED",
                        "Injury is already healed.",
                        directive,
                        injury_id,
                    )

                    continue


                current.status = "healed"

                current.healed_event_id = (
                    directive.event_id
                )


            transitions.append(
                LedgerTransition(
                    directive_id=(
                        directive.directive_id
                    ),

                    event_id=(
                        directive.event_id
                    ),

                    entity_type="injury",

                    entity_id=(
                        injury_id
                    ),

                    before=before,

                    after=_dump(
                        injuries.get(
                            injury_id
                        )
                    ),
                )
            )

            continue


        # ====================================================
        # COMMITMENTS
        # ====================================================

        if dtype.startswith(
            "commitment_"
        ):

            commitment_id = (
                directive.commitment_id
            )

            if not commitment_id:

                add_violation(
                    "COMMITMENT_ID_REQUIRED",
                    "Commitment directive requires commitment_id.",
                    directive,
                )

                continue


            current = commitments.get(
                commitment_id
            )

            before = _dump(
                current
            )


            if (
                dtype
                == "commitment_open"
            ):

                if current is not None:

                    add_violation(
                        "COMMITMENT_DUPLICATE",
                        "Commitment ID already exists.",
                        directive,
                        commitment_id,
                    )

                    continue


                commitments[
                    commitment_id
                ] = CommitmentLedgerState(
                    commitment_id=(
                        commitment_id
                    ),

                    character_id=(
                        directive.character_id
                    ),

                    target_character_id=(
                        directive.target_character_id
                    ),

                    label=(
                        directive.label
                    ),

                    status="open",

                    opened_event_id=(
                        directive.event_id
                    ),
                )


            elif (
                dtype
                == "commitment_resolve"
            ):

                if current is None:

                    add_violation(
                        "COMMITMENT_RESOLVE_UNKNOWN",
                        "Cannot resolve unknown commitment.",
                        directive,
                        commitment_id,
                    )

                    continue


                if (
                    current.character_id
                    != directive.character_id
                ):

                    add_violation(
                        "COMMITMENT_CHARACTER_MISMATCH",
                        "Commitment belongs to another character.",
                        directive,
                        commitment_id,
                    )

                    continue


                if (
                    current.status
                    != "open"
                ):

                    add_violation(
                        "COMMITMENT_ALREADY_RESOLVED",
                        "Commitment is already resolved.",
                        directive,
                        commitment_id,
                    )

                    continue


                if (
                    directive.resolution
                    not in {
                        "fulfilled",
                        "broken",
                        "cancelled",
                    }
                ):

                    add_violation(
                        "COMMITMENT_RESOLUTION_INVALID",
                        "Commitment resolution must be fulfilled, broken, or cancelled.",
                        directive,
                        commitment_id,
                    )

                    continue


                current.status = (
                    directive.resolution
                )

                current.resolved_event_id = (
                    directive.event_id
                )


            transitions.append(
                LedgerTransition(
                    directive_id=(
                        directive.directive_id
                    ),

                    event_id=(
                        directive.event_id
                    ),

                    entity_type="commitment",

                    entity_id=(
                        commitment_id
                    ),

                    before=before,

                    after=_dump(
                        commitments.get(
                            commitment_id
                        )
                    ),
                )
            )

            continue


        # ====================================================
        # GOALS
        # ====================================================

        if dtype.startswith(
            "goal_"
        ):

            goal_id = (
                directive.goal_id
            )

            if not goal_id:

                add_violation(
                    "GOAL_ID_REQUIRED",
                    "Goal directive requires goal_id.",
                    directive,
                )

                continue


            current = goals.get(
                goal_id
            )

            before = _dump(
                current
            )


            if (
                dtype
                == "goal_open"
            ):

                if current is not None:

                    add_violation(
                        "GOAL_DUPLICATE",
                        "Goal ID already exists.",
                        directive,
                        goal_id,
                    )

                    continue


                goals[
                    goal_id
                ] = GoalLedgerState(
                    goal_id=(
                        goal_id
                    ),

                    character_id=(
                        directive.character_id
                    ),

                    label=(
                        directive.label
                    ),

                    status="active",

                    opened_event_id=(
                        directive.event_id
                    ),
                )


            elif (
                dtype
                == "goal_resolve"
            ):

                if current is None:

                    add_violation(
                        "GOAL_RESOLVE_UNKNOWN",
                        "Cannot resolve unknown goal.",
                        directive,
                        goal_id,
                    )

                    continue


                if (
                    current.character_id
                    != directive.character_id
                ):

                    add_violation(
                        "GOAL_CHARACTER_MISMATCH",
                        "Goal belongs to another character.",
                        directive,
                        goal_id,
                    )

                    continue


                if (
                    current.status
                    != "active"
                ):

                    add_violation(
                        "GOAL_ALREADY_RESOLVED",
                        "Goal is already resolved.",
                        directive,
                        goal_id,
                    )

                    continue


                if (
                    directive.resolution
                    not in {
                        "achieved",
                        "failed",
                        "abandoned",
                    }
                ):

                    add_violation(
                        "GOAL_RESOLUTION_INVALID",
                        "Goal resolution must be achieved, failed, or abandoned.",
                        directive,
                        goal_id,
                    )

                    continue


                current.status = (
                    directive.resolution
                )

                current.resolved_event_id = (
                    directive.event_id
                )


            transitions.append(
                LedgerTransition(
                    directive_id=(
                        directive.directive_id
                    ),

                    event_id=(
                        directive.event_id
                    ),

                    entity_type="goal",

                    entity_id=(
                        goal_id
                    ),

                    before=before,

                    after=_dump(
                        goals.get(
                            goal_id
                        )
                    ),
                )
            )

            continue


    # ========================================================
    # FINAL REPORT
    # ========================================================

    errors = [
        item
        for item in violations
        if item.severity
        == "error"
    ]


    open_injuries = [
        item.injury_id
        for item in injuries.values()
        if item.status
        == "active"
    ]


    open_commitments = [
        item.commitment_id
        for item in commitments.values()
        if item.status
        == "open"
    ]


    active_goals = [
        item.goal_id
        for item in goals.values()
        if item.status
        == "active"
    ]


    return ContinuityLedgerResult(
        project_id=(
            project.project_id
        ),

        objects=objects,

        injuries=injuries,

        commitments=commitments,

        goals=goals,

        transitions=transitions,

        violations=violations,

        report={
            "mode": (
                "deterministic"
            ),

            "llm_used": False,

            "directives": len(
                bundle.directives
            ),

            "objects": len(
                objects
            ),

            "injuries": len(
                injuries
            ),

            "commitments": len(
                commitments
            ),

            "goals": len(
                goals
            ),

            "open_injuries": (
                open_injuries
            ),

            "open_commitments": (
                open_commitments
            ),

            "active_goals": (
                active_goals
            ),

            "violations": len(
                violations
            ),

            "errors": len(
                errors
            ),

            "passed": (
                len(
                    errors
                )
                == 0
            ),
        },
    )
