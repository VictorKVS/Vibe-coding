from __future__ import annotations

from dataclasses import dataclass
from typing import Dict, Literal


StoryTask = Literal[
    "route",
    "creative_write",
    "rewrite",
    "dialogue",
    "story_extract",
    "story_architecture",
    "character_analysis",
    "continuity",
    "research_analysis",
    "prompt_compile",
    "critique",
]


ModelMode = Literal[
    "auto",
    "manual",
]


@dataclass(frozen=True)
class StoryModelSpec:
    model_id: str
    short_name: str
    folder: str
    role: str
    temperature: float
    max_tokens: int


STORY_MODELS: Dict[str, StoryModelSpec] = {
    "3b": StoryModelSpec(
        model_id="MODEL-MINISTRAL-3B-INSTRUCT-Q4",
        short_name="3b",
        folder="ministral-3b-instruct-q4",
        role="fast-router",
        temperature=0.1,
        max_tokens=512,
    ),

    "8b": StoryModelSpec(
        model_id="MODEL-MINISTRAL-8B-INSTRUCT-Q4",
        short_name="8b",
        folder="ministral-8b-instruct-q4",
        role="creative-writer",
        temperature=0.75,
        max_tokens=4096,
    ),

    "14b": StoryModelSpec(
        model_id="MODEL-MINISTRAL-14B-REASONING-Q4",
        short_name="14b",
        folder="ministral-14b-reasoning-q4",
        role="story-analyst",
        temperature=0.2,
        max_tokens=4096,
    ),
}


AUTO_ROUTES: Dict[str, str] = {
    "route": "3b",

    "creative_write": "8b",
    "rewrite": "8b",
    "dialogue": "8b",

    "story_extract": "14b",
    "story_architecture": "14b",
    "character_analysis": "14b",
    "continuity": "14b",
    "research_analysis": "14b",
    "prompt_compile": "14b",
    "critique": "14b",
}


def route_story_model(
    task: StoryTask,
    mode: ModelMode = "auto",
    manual_model: str | None = None,
) -> StoryModelSpec:

    if mode == "manual":
        if not manual_model:
            raise ValueError(
                "manual_model is required in manual mode"
            )

        if manual_model not in STORY_MODELS:
            raise ValueError(
                f"Unknown story model: {manual_model}"
            )

        return STORY_MODELS[
            manual_model
        ]

    key = AUTO_ROUTES.get(
        task
    )

    if not key:
        raise ValueError(
            f"No automatic model route for task: {task}"
        )

    return STORY_MODELS[key]
