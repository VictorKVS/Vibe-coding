from backend.model_router_app import AUTO_MODEL_ID, _is_chat_model, choose_model


def test_manual_model_choice_is_preserved():
    route = choose_model(
        "mistral-7b-instruct",
        [{"role": "user", "content": "Привет"}],
        ["mistral-7b-instruct", "qwen2.5-coder"],
    )
    assert route["model"] == "mistral-7b-instruct"
    assert route["mode"] == "manual"


def test_auto_prefers_mistral_for_general_text():
    route = choose_model(
        AUTO_MODEL_ID,
        [{"role": "user", "content": "Объясни кратко идею этого текста."}],
        ["llava-v1.6-mistral-7b", "qwen2.5-14b", "mistral-7b-instruct"],
    )
    assert route["model"] == "mistral-7b-instruct"
    assert route["mode"] == "auto"


def test_auto_prefers_coder_for_code_request():
    route = choose_model(
        AUTO_MODEL_ID,
        [{"role": "user", "content": "Исправь Python traceback и функцию def parse()."}],
        ["mistral-7b-instruct", "qwen2.5-coder-14b"],
    )
    assert route["model"] == "qwen2.5-coder-14b"


def test_auto_prefers_vision_for_image_request():
    route = choose_model(
        AUTO_MODEL_ID,
        [
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": "Что изображено?"},
                    {"type": "image_url", "image_url": {"url": "data:image/png;base64,AAAA"}},
                ],
            }
        ],
        ["mistral-7b-instruct", "llava-v1.6-mistral-7b"],
    )
    assert route["model"] == "llava-v1.6-mistral-7b"


def test_auto_prefers_long_context_model():
    route = choose_model(
        AUTO_MODEL_ID,
        [{"role": "user", "content": "А" * 13000}],
        ["mistral-7b-instruct", "qwen2.5-14b-128k"],
    )
    assert route["model"] == "qwen2.5-14b-128k"


def test_auto_prefers_russian_prose_model():
    route = choose_model(
        AUTO_MODEL_ID,
        [{"role": "user", "content": "Отредактируй литературный стиль этого рассказа и диалог персонажа."}],
        ["qwen2.5-14b", "mistral-7b-instruct", "gigachat3-10b"],
    )
    assert route["model"] == "gigachat3-10b"


def test_manual_missing_model_is_rejected():
    try:
        choose_model(
            "missing-model",
            [{"role": "user", "content": "test"}],
            ["mistral-7b-instruct"],
        )
    except ValueError as error:
        assert str(error) == "model-not-loaded"
    else:
        raise AssertionError("missing manual model must fail")


def test_auto_vision_requires_loaded_vision_model():
    try:
        choose_model(
            AUTO_MODEL_ID,
            [{"role": "user", "content": [{"type": "image_url", "image_url": {"url": "x"}}]}],
            ["mistral-7b-instruct", "qwen2.5-14b"],
        )
    except ValueError as error:
        assert str(error) == "capability-not-loaded"
    else:
        raise AssertionError("vision request without vision model must fail")


def test_non_chat_service_models_are_excluded():
    assert not _is_chat_model("whisper-large-v3-turbo")
    assert not _is_chat_model("text-embedding-bge-m3")
    assert not _is_chat_model("text-embedding-nomic-embed-text-v1.5")
    assert _is_chat_model("llava-1.6-mistral-7b")
    assert _is_chat_model("qwen2.5-coder-14b-instruct")


def test_choose_model_ignores_non_chat_candidates():
    route = choose_model(
        AUTO_MODEL_ID,
        [{"role": "user", "content": "Коротко объясни этот текст."}],
        ["whisper-large-v3-turbo", "text-embedding-bge-m3", "llava-1.6-mistral-7b"],
    )
    assert route["model"] == "llava-1.6-mistral-7b"
