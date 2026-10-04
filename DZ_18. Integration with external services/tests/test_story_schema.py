from father.runtime.story.schema import (
    CharacterCard,
    LocationCard,
    ResearchProposal,
    SceneCard,
    StoryEvent,
    StoryProject,
    StorySkeletonNode,
)


def test_story_project_minimum():
    project = StoryProject(
        project_id="STORY-001",
        title="Test Story",
        premise="Engineer enters abandoned laboratory.",
    )

    assert project.project_id == "STORY-001"
    assert "novel" in project.target_products
    assert "comic" in project.target_products


def test_character_card():
    hero = CharacterCard(
        character_id="HERO-001",
        name="Andrey",
        age=42,
        adult_status="adult",
    )

    hero.psychology.dominant_traits.extend(
        [
            "analytical",
            "reserved",
        ]
    )

    hero.visual.shape_language.extend(
        [
            "rectangular",
            "angular",
        ]
    )

    assert hero.age == 42
    assert "analytical" in (
        hero.psychology.dominant_traits
    )


def test_story_entities_link():
    node = StorySkeletonNode(
        node_id="NODE-INTRO",
        title="Arrival",
        function="introduction",
    )

    location = LocationCard(
        location_id="LOC-001",
        name="Laboratory",
    )

    scene = SceneCard(
        scene_id="SCENE-001",
        title="Arrival at the complex",
        skeleton_node_id=node.node_id,
        location_id=location.location_id,
        character_ids=["HERO-001"],
    )

    event = StoryEvent(
        event_id="EVT-001",
        scene_id=scene.scene_id,
        actor_id="HERO-001",
        action="entered",
        location_id=location.location_id,
    )

    assert event.scene_id == "SCENE-001"
    assert event.action == "entered"


def test_research_does_not_change_canon():
    proposal = ResearchProposal(
        proposal_id="PROP-001",
        category="plot",
        problem="Conflict resolves too quickly.",
        options=[
            "Add failed negotiation.",
            "Add conflicting evidence.",
        ],
    )

    assert proposal.status == "open"
    assert proposal.canon_changed is False
