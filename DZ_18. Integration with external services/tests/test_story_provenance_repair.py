from father.runtime.story.provenance_extractor import (
    StoryProvenanceExtractor,
    build_required_evidence_plan,
    missing_required_evidence,
)
from father.runtime.story.provenance_schema import (
    StoryProvenanceResult,
)


def test_required_plan_includes_explicit_age():

    facts = {
        "characters": [
            {
                "character_id": "CHAR-ANDREY-001",
                "name": "Andrey",
                "age": 42,
            },
            {
                "character_id": "CHAR-LIRA-001",
                "name": "Lira",
                "age": None,
            },
        ],

        "locations": [],
        "events": [],
        "relationships": [],
    }

    plan = build_required_evidence_plan(
        facts
    )

    keys = {
        (
            item["entity_id"],
            item["field_path"],
        )
        for item in plan
    }

    assert (
        "CHAR-ANDREY-001",
        "identity",
    ) in keys

    assert (
        "CHAR-ANDREY-001",
        "age",
    ) in keys

    assert (
        "CHAR-LIRA-001",
        "age",
    ) not in keys


def test_missing_evidence_detects_age():

    facts = {
        "characters": [
            {
                "character_id": "CHAR-ANDREY-001",
                "age": 42,
            },
        ],

        "locations": [],
        "events": [],
        "relationships": [],
    }

    result = StoryProvenanceResult(
        project_id="P1",

        evidence=[
            {
                "evidence_id": "EVID-001",
                "entity_type": "character",
                "entity_id": "CHAR-ANDREY-001",
                "field_path": "identity",
                "value_summary": "Andrey exists.",
                "origin": "canon",
                "source_fragment": "Andrey entered.",
                "confidence": 1.0,
                "rationale": "Explicit.",
            }
        ],

        proposals=[],
        warnings=[],
    )

    missing = missing_required_evidence(
        core_facts=facts,
        result=result,
    )

    assert missing == [
        {
            "entity_type": "character",
            "entity_id": "CHAR-ANDREY-001",
            "field_path": "age",
        }
    ]


def test_provenance_auto_repairs_missing_age():

    calls = []

    def fake_generate(
        prompt,
        **_kwargs,
    ):

        calls.append(
            prompt
        )

        if (
            "MISSING REQUIRED EVIDENCE"
            in prompt
        ):

            return """
{
  "project_id": "P1",

  "evidence": [
    {
      "evidence_id": "TEMP-AGE",
      "entity_type": "character",
      "entity_id": "CHAR-ANDREY-001",
      "field_path": "age",
      "value_summary": "Andrey is 42 years old.",
      "origin": "canon",
      "source_fragment": "Andrey was forty-two years old.",
      "confidence": 1.0,
      "rationale": "Age is explicitly stated."
    }
  ],

  "proposals": [],
  "warnings": []
}
"""

        return """
{
  "project_id": "P1",

  "evidence": [
    {
      "evidence_id": "EVID-001",
      "entity_type": "character",
      "entity_id": "CHAR-ANDREY-001",
      "field_path": "identity",
      "value_summary": "Andrey is a character.",
      "origin": "canon",
      "source_fragment": "Andrey was forty-two years old.",
      "confidence": 1.0,
      "rationale": "Explicit character reference."
    }
  ],

  "proposals": [],
  "warnings": []
}
"""

    facts = {
        "characters": [
            {
                "character_id": "CHAR-ANDREY-001",
                "name": "Andrey",
                "age": 42,
            },
        ],

        "locations": [],
        "events": [],
        "relationships": [],
    }

    extractor = StoryProvenanceExtractor(
        generate=fake_generate
    )

    result = extractor.extract(
        source_text=(
            "Andrey was forty-two years old."
        ),
        core_facts=facts,
        project_id="P1",
        json_schema_file=None,
    )

    assert len(
        calls
    ) == 2

    assert extractor.repair_used is True

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
        "CHAR-ANDREY-001",
        "age",
    ) in keys
