from father.runtime.story.provenance_extractor import (
    StoryProvenanceExtractor,
    build_provenance_prompt,
    parse_provenance_payload,
)


def _fake_generate(
    _prompt,
    **_kwargs,
):

    return """
{
  "project_id": "STORY-TEST",

  "evidence": [
    {
      "evidence_id": "EVID-001",
      "entity_type": "character",
      "entity_id": "CHAR-ANDREY-001",
      "field_path": "age",
      "value_summary": "Andrey is 42 years old.",
      "origin": "canon",
      "source_fragment": "Andrey was forty-two years old.",
      "confidence": 1.0,
      "rationale": "Age is explicitly stated."
    },

    {
      "evidence_id": "EVID-002",
      "entity_type": "event",
      "entity_id": "EVT-012",
      "field_path": "event",
      "value_summary": "Andrey withholds Lira's prior help from Marina.",
      "origin": "canon",
      "source_fragment": "Andrey did not tell Marina that Lira had already helped him.",
      "confidence": 1.0,
      "rationale": "The withholding is explicitly stated."
    },

    {
      "evidence_id": "EVID-003",
      "entity_type": "character",
      "entity_id": "CHAR-ANDREY-001",
      "field_path": "identity",
      "value_summary": "Andrey is a story character.",
      "origin": "canon",
      "source_fragment": "Andrey was forty-two years old.",
      "confidence": 1.0,
      "rationale": "The character is explicitly named."
    }
  ],

  "proposals": [
    {
      "proposal_id": "PROP-001",
      "entity_type": "character",
      "entity_id": "CHAR-ANDREY-001",
      "category": "visual",
      "value": "Use restrained posture to emphasize caution.",
      "confidence": 0.7,
      "rationale": "Visual interpretation only."
    }
  ],

  "warnings": []
}
"""


def test_parse_provenance_payload():

    result = parse_provenance_payload(
        _fake_generate("")
    )

    assert (
        len(result["evidence"])
        == 3
    )


def test_provenance_prompt_contract():

    prompt = build_provenance_prompt(
        source_text=(
            "Andrey did not tell Marina."
        ),
        core_facts={
            "project_id": "STORY-TEST",
            "characters": [],
            "locations": [],
            "events": [],
            "relationships": [],
        },
        project_id="STORY-TEST",
    )

    assert (
        "negative explicit statement is still CANON"
        in prompt
    )

    assert (
        "REQUIRED EVIDENCE PLAN"
        in prompt
    )

    assert (
        "Proposals are not evidence"
        in prompt
    )


def test_provenance_extractor():

    extractor = StoryProvenanceExtractor(
        generate=_fake_generate
    )

    result = extractor.extract(
        source_text=(
            "Andrey was forty-two years old. "
            "Andrey did not tell Marina that "
            "Lira had already helped him."
        ),
        core_facts={
            "project_id": "STORY-TEST",

            "characters": [
                {
                    "character_id": "CHAR-ANDREY-001",
                    "name": "Andrey",
                    "age": None,
                }
            ],

            "locations": [],

            "events": [
                {
                    "event_id": "EVT-012",
                }
            ],

            "relationships": [],
        },
        project_id="STORY-TEST",
        json_schema_file=None,
    )

    assert (
        result.evidence[0].origin
        == "canon"
    )

    assert (
        result.evidence[0].confidence
        == 1.0
    )

    assert (
        result.evidence[1].entity_id
        == "EVT-012"
    )

    keys = {
        (
            item.entity_id,
            item.field_path,
        )
        for item in result.evidence
    }

    assert (
        "CHAR-ANDREY-001",
        "identity",
    ) in keys

    assert (
        "EVT-012",
        "event",
    ) in keys
