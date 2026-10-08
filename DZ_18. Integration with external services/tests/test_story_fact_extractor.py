import json

from father.runtime.story.fact_extractor import (
    StoryFactExtractor,
    parse_fact_payload,
)
from father.runtime.story.fact_schema import (
    validate_raw_story_facts,
)


def _fake_generate(
    _prompt,
    **_kwargs,
):

    return """
{
  "project_id": "STORY-TEST",
  "title": "Test",
  "premise": "An engineer enters a laboratory.",
  "genre": ["science fiction"],

  "characters": [
    {
      "character_id": "CHAR-ANDREY-001",
      "name": "Andrey",
      "age": 42,
      "adult_status": "adult",
      "role": "systems engineer"
    }
  ],

  "locations": [
    {
      "location_id": "LOC-LAB-001",
      "name": "Laboratory Four",
      "description": "Laboratory block."
    }
  ],

  "scenes": [
    {
      "scene_id": "SCENE-001",
      "title": "Arrival",
      "location_id": "LOC-LAB-001",
      "character_ids": [
        "CHAR-ANDREY-001"
      ],
      "event_ids": [
        "EVT-001"
      ]
    }
  ],

  "events": [
    {
      "event_id": "EVT-001",
      "scene_id": "SCENE-001",
      "actor_id": "CHAR-ANDREY-001",
      "action": "enters",
      "target_id": "",
      "location_id": "LOC-LAB-001",
      "content": "",
      "consequences": []
    }
  ],

  "relationships": [],

  "findings": [
    {
      "entity_type": "character",
      "entity_id": "CHAR-ANDREY-001",
      "field_path": "age",
      "value": 42,
      "origin": "canon",
      "source_fragment": "Andrey was forty-two years old.",
      "confidence": 1.0,
      "rationale": "Explicit statement."
    }
  ],

  "warnings": []
}
"""


def test_parse_raw_facts():

    payload = parse_fact_payload(
        _fake_generate("")
    )

    assert (
        payload["characters"][0]["name"]
        == "Andrey"
    )


def test_validate_raw_facts():

    payload = parse_fact_payload(
        _fake_generate("")
    )

    result = validate_raw_story_facts(
        payload
    )

    assert len(
        result.events
    ) == 1

    assert (
        result.findings[0].origin
        == "canon"
    )

    assert (
        result.findings[0].confidence
        == 1.0
    )


def test_fact_extractor():

    extractor = StoryFactExtractor(
        generate=_fake_generate
    )

    result = extractor.extract(
        source_text=(
            "Andrey was forty-two years old."
        ),
        project_id="STORY-TEST",
        title="Test",
        json_schema_file=None,
    )

    assert len(
        result.characters
    ) == 1

    assert len(
        result.events
    ) == 1



def test_core_fact_payload_does_not_require_findings():

    raw = """
{
  "project_id": "STORY-CORE",
  "title": "Core Story",
  "premise": "An engineer enters a laboratory.",
  "genre": ["science fiction"],

  "characters": [
    {
      "character_id": "CHAR-ANDREY-001",
      "name": "Andrey",
      "age": 42,
      "adult_status": "adult",
      "role": "systems engineer"
    }
  ],

  "locations": [
    {
      "location_id": "LOC-LAB-001",
      "name": "Laboratory",
      "description": "A laboratory."
    }
  ],

  "scenes": [
    {
      "scene_id": "SCENE-001",
      "title": "Arrival",
      "location_id": "LOC-LAB-001",
      "character_ids": [
        "CHAR-ANDREY-001"
      ],
      "event_ids": [
        "EVT-001"
      ]
    }
  ],

  "events": [
    {
      "event_id": "EVT-001",
      "scene_id": "SCENE-001",
      "actor_id": "CHAR-ANDREY-001",
      "action": "enters",
      "target_id": "",
      "location_id": "LOC-LAB-001",
      "content": "Andrey enters the laboratory.",
      "consequences": []
    }
  ],

  "relationships": [],
  "warnings": []
}
"""

    payload = parse_fact_payload(
        raw
    )

    assert (
        payload["project_id"]
        == "STORY-CORE"
    )

    assert len(
        payload["characters"]
    ) == 1

    assert len(
        payload["events"]
    ) == 1
