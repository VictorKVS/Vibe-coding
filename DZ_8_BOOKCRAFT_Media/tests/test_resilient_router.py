from backend.model_router_resilient_app import (
    AUTO_FAILURE_TTL_SECONDS,
    _AUTO_FAILURES,
    _eligible_auto_models,
    _failure_is_active,
)


def test_auto_excludes_recently_failed_model():
    _AUTO_FAILURES.clear()
    _AUTO_FAILURES["gigachat-broken"] = {"at": 100.0, "detail": "load failed"}
    assert _failure_is_active("gigachat-broken", now=100.0)
    assert _eligible_auto_models(["gigachat-broken", "qwen-good"]) == ["qwen-good"]


def test_auto_failure_expires_after_ttl():
    _AUTO_FAILURES.clear()
    _AUTO_FAILURES["gigachat-broken"] = {"at": 100.0, "detail": "load failed"}
    assert not _failure_is_active("gigachat-broken", now=100.0 + AUTO_FAILURE_TTL_SECONDS + 1)
    assert _eligible_auto_models(["gigachat-broken", "qwen-good"]) == ["gigachat-broken", "qwen-good"]
