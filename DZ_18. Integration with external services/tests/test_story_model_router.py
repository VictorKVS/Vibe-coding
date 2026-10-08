import pytest

from father.runtime.story.model_router import (
    route_story_model,
)


def test_auto_writer_uses_8b():
    spec = route_story_model(
        task="creative_write",
    )

    assert spec.short_name == "8b"


def test_auto_extractor_uses_14b():
    spec = route_story_model(
        task="story_extract",
    )

    assert spec.short_name == "14b"


def test_fast_router_uses_3b():
    spec = route_story_model(
        task="route",
    )

    assert spec.short_name == "3b"


def test_manual_override():
    spec = route_story_model(
        task="creative_write",
        mode="manual",
        manual_model="14b",
    )

    assert spec.short_name == "14b"


def test_unknown_manual_model():
    with pytest.raises(
        ValueError
    ):
        route_story_model(
            task="creative_write",
            mode="manual",
            manual_model="99b",
        )
