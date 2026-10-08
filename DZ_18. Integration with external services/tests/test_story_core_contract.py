from father.runtime.story.fact_extractor import (
    build_fact_prompt,
)
from father.runtime.story.fact_schema import (
    FACT_JSON_SCHEMA,
)


def test_character_contract_requires_age_key():

    character_schema = (
        FACT_JSON_SCHEMA
        ["properties"]
        ["characters"]
        ["items"]
    )

    assert (
        "age"
        in character_schema["required"]
    )


def test_core_prompt_requires_atomic_events():

    prompt = build_fact_prompt(
        source_text="Test source.",
        project_id="P1",
        title="T1",
    )

    assert (
        "distinct factual actions"
        in prompt
    )

    assert (
        "receiving a warning"
        in prompt
    )

    assert (
        "deliberately withholding information"
        in prompt
    )

    assert (
        "extract the exact age"
        in prompt
    )
