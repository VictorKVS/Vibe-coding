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
