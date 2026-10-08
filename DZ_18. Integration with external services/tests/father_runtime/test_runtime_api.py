from fastapi.testclient import TestClient

import father.runtime.api.app as runtime_api
from father.runtime.core.registry import FatherRegistry


client = TestClient(runtime_api.app)


def test_root_reports_ready():
    response = client.get("/")

    assert response.status_code == 200

    data = response.json()

    assert data["name"] == "FATHER Runtime"
    assert data["status"] == "ready"


def test_health_reports_runtime_services(monkeypatch):
    monkeypatch.setattr(
        runtime_api,
        "service_alive",
        lambda url: True,
    )

    response = client.get("/api/father/health")

    assert response.status_code == 200

    data = response.json()

    assert data["father"] == "ready"

    assert data["services"]["llm"]["status"] == "ready"
    assert data["services"]["stt"]["status"] == "ready"
    assert data["services"]["tts"]["status"] == "ready"
    assert data["services"]["image"]["status"] == "ready"


def test_registry_contains_core_models():
    registry = FatherRegistry()

    models = registry.models.get(
        "models",
        {},
    )

    expected = {
        "local_llm",
        "faster_whisper",
        "local_tts",
        "comfyui",
        "qwen3_embedding",
        "qwen3_reranker",
    }

    assert expected.issubset(models.keys())


def test_chat_routes_to_ollama(monkeypatch):
    class FakeResponse:
        def raise_for_status(self):
            return None

        def json(self):
            return {
                "message": {
                    "content": "READY",
                }
            }

    def fake_post(url, json, timeout):
        assert url == (
            "http://127.0.0.1:11434/api/chat"
        )

        assert json["model"] == runtime_api.DEFAULT_LLM
        assert json["stream"] is False

        return FakeResponse()

    monkeypatch.setattr(
        runtime_api.httpx,
        "post",
        fake_post,
    )

    response = client.post(
        "/api/father/chat",
        json={
            "agent": "alina",
            "message": "test",
        },
    )

    assert response.status_code == 200

    data = response.json()

    assert data["status"] == "completed"
    assert data["agent"] == "alina"
    assert data["answer"] == "READY"


def test_comfyui_workflow_uses_requested_scene():
    request = runtime_api.ImageRequest(
        prompt="FATHER control center",
        width=768,
        height=512,
    )

    workflow = runtime_api.comfy_workflow(
        request
    )

    assert (
        workflow["4"]["inputs"]["ckpt_name"]
        == runtime_api.DEFAULT_CHECKPOINT
    )

    assert (
        workflow["5"]["inputs"]["width"]
        == 768
    )

    assert (
        workflow["5"]["inputs"]["height"]
        == 512
    )

    assert (
        workflow["6"]["inputs"]["text"]
        == "FATHER control center"
    )

def test_analyze_image_routes_to_multimodal_ollama(
    monkeypatch,
):
    class FakeResponse:
        def raise_for_status(self):
            return None

        def json(self):
            return {
                "message": {
                    "content": "Vision READY",
                }
            }

    def fake_post(url, json, timeout):
        assert url == (
            "http://127.0.0.1:11434/api/chat"
        )

        assert json["model"] == runtime_api.DEFAULT_LLM

        user_message = json["messages"][1]

        assert user_message["content"] == "Analyze"
        assert len(user_message["images"]) == 1
        assert user_message["images"][0]

        return FakeResponse()

    monkeypatch.setattr(
        runtime_api.httpx,
        "post",
        fake_post,
    )

    response = client.post(
        "/api/father/analyze-image",
        data={
            "prompt": "Analyze",
        },
        files={
            "image": (
                "test.png",
                b"\x89PNG\r\n\x1a\nTEST",
                "image/png",
            ),
        },
    )

    assert response.status_code == 200

    data = response.json()

    assert data["status"] == "completed"
    assert data["agent"] == "alina-vision"
    assert data["provider"] == "ollama"
    assert data["answer"] == "Vision READY"

def test_chat_retries_when_russian_response_is_cjk(
    monkeypatch,
):
    calls = []

    class FakeResponse:
        def __init__(self, answer):
            self.answer = answer

        def raise_for_status(self):
            return None

        def json(self):
            return {
                "message": {
                    "content": self.answer,
                }
            }

    def fake_post(url, json, timeout):
        calls.append(json)

        if len(calls) == 1:
            return FakeResponse(
                "\u4f60\u597d"
            )

        return FakeResponse(
            "\u0413\u043e\u0442\u043e\u0432\u0430 "
            "\u043a \u0440\u0430\u0431\u043e\u0442\u0435."
        )

    monkeypatch.setattr(
        runtime_api.httpx,
        "post",
        fake_post,
    )

    response = client.post(
        "/api/father/chat",
        json={
            "agent": "alina",
            "message": (
                "\u041e\u0442\u0432\u0435\u0442\u044c "
                "\u043f\u043e-\u0440\u0443\u0441\u0441\u043a\u0438."
            ),
        },
    )

    assert response.status_code == 200

    data = response.json()

    assert len(calls) == 2
    assert data["language_guard"]["retry"] is True
    assert data["language_guard"]["russian_request"] is True
    assert not runtime_api.contains_cjk(
        data["answer"]
    )
