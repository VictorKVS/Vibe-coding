from father.runtime.story.extractor import (
    StoryExtractor,
    build_extraction_prompt,
    parse_json_object,
)

from father.runtime.story.run_extract import (
    main as run_extract_main,
)

from father.runtime.story.visual_language import (
    comic_design_for_traits,
)


def _fake_llm(_prompt: str) -> str:

    return """
{
  "project": {
    "project_id": "STORY-TEST",
    "title": "Test Story",
    "genre": ["science fiction"],
    "premise": "An engineer enters a laboratory.",
    "target_products": ["novel", "comic"],
    "style": {},
    "skeleton": [],
    "characters": [
      {
        "character_id": "CHAR-ANDREY-001",
        "name": "Andrey",
        "adult_status": "unknown",
        "psychology": {},
        "visual": {}
      }
    ],
    "locations": [],
    "scenes": [],
    "events": [],
    "relationships": [],
    "canon": {},
    "proposals": []
  },
  "findings": [
    {
      "entity_type": "character",
      "entity_id": "CHAR-ANDREY-001",
      "field_path": "name",
      "value": "Andrey",
      "origin": "canon",
      "source_fragment": "Andrey entered the laboratory.",
      "confidence": 1.0,
      "rationale": "Explicit source statement."
    }
  ],
  "warnings": []
}
"""


def test_parse_json_object():

    data = parse_json_object(
        'prefix {"a": 1} suffix'
    )

    assert data["a"] == 1


def test_prompt_has_provenance_rules():

    prompt = build_extraction_prompt(
        source_text="Source.",
        project_id="P1",
        title="T1",
    )

    assert "CANON" in prompt
    assert "INFERENCE" in prompt
    assert "PROPOSAL" in prompt
    assert "SOURCE STORY" in prompt


def test_story_extractor_contract():

    extractor = StoryExtractor(
        generate=_fake_llm
    )

    result = extractor.extract(
        source_text=(
            "Andrey entered the laboratory."
        ),
        project_id="STORY-TEST",
        title="Test Story",
    )

    assert (
        result.project.project_id
        == "STORY-TEST"
    )

    assert (
        result.project.characters[0].name
        == "Andrey"
    )

    assert (
        result.findings[0].origin
        == "canon"
    )


def test_comic_design_mapping():

    result = comic_design_for_traits(
        [
            "analytical",
            "reserved",
        ]
    )

    assert (
        "focused gaze"
        in result["expression"]
    )

    assert (
        "angular"
        in result["shape_language"]
    )


def test_run_extract_imports():

    assert callable(
        run_extract_main
    )



def test_parse_json_object_prefers_final_story_payload():

    raw = """
PROMPT ECHO

{
  "project": {
    "project_id": "PROMPT-EXAMPLE"
  },
  "findings": []
}

MODEL REASONING

The final answer follows.

{
  "project": {
    "project_id": "STORY-REAL"
  },
  "findings": [
    {
      "origin": "canon"
    }
  ]
}
"""

    result = parse_json_object(
        raw
    )

    assert (
        result["project"]["project_id"]
        == "STORY-REAL"
    )

    assert (
        result["findings"][0]["origin"]
        == "canon"
    )
