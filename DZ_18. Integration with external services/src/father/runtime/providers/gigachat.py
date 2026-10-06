import json
import os
import ssl
import time
import uuid

import httpx


GIGACHAT_OAUTH_URL = (
    "https://ngw.devices.sberbank.ru:9443/api/v2/oauth"
)

GIGACHAT_API_URL = "https://api.giga.chat/v1"

_token_cache = {
    "access_token": None,
    "expires_at": 0,
}


def is_configured() -> bool:
    return bool(
        os.environ.get("GIGACHAT_CREDENTIALS")
        and os.environ.get("GIGACHAT_CA_BUNDLE_FILE")
    )


def _ssl_context():
    ca_bundle = os.environ.get(
        "GIGACHAT_CA_BUNDLE_FILE"
    )

    if not ca_bundle:
        raise RuntimeError(
            "GIGACHAT_CA_BUNDLE_FILE is not configured."
        )

    return ssl.create_default_context(
        cafile=ca_bundle
    )


def _client(timeout=120):
    return httpx.Client(
        verify=_ssl_context(),
        timeout=timeout,
    )


def get_access_token() -> str:
    now_ms = int(time.time() * 1000)

    token = _token_cache.get("access_token")
    expires_at = int(
        _token_cache.get("expires_at") or 0
    )

    if (
        token
        and expires_at
        and now_ms < expires_at - 60000
    ):
        return token

    credentials = os.environ.get(
        "GIGACHAT_CREDENTIALS"
    )

    if not credentials:
        raise RuntimeError(
            "GIGACHAT_CREDENTIALS is not configured."
        )

    scope = os.environ.get(
        "GIGACHAT_SCOPE",
        "GIGACHAT_API_PERS",
    )

    with _client(timeout=30) as client:
        response = client.post(
            GIGACHAT_OAUTH_URL,
            headers={
                "Authorization": (
                    f"Basic {credentials}"
                ),
                "RqUID": str(uuid.uuid4()),
                "Accept": "application/json",
                "Content-Type": (
                    "application/"
                    "x-www-form-urlencoded"
                ),
            },
            data={
                "scope": scope,
            },
        )

        response.raise_for_status()

        data = response.json()

    token = data["access_token"]
    expires_at = int(
        data.get("expires_at")
        or (now_ms + 25 * 60 * 1000)
    )

    _token_cache["access_token"] = token
    _token_cache["expires_at"] = expires_at

    return token


def model_for_profile(profile: str) -> str:
    if profile == "pro":
        return os.environ.get(
            "GIGACHAT_PRO_MODEL",
            "GigaChat-2-Pro",
        )

    return os.environ.get(
        "GIGACHAT_FAST_MODEL",
        "GigaChat-2",
    )


def stream_chat(
    message: str,
    system_prompt: str,
    profile: str = "fast",
):
    model = model_for_profile(profile)
    token = get_access_token()

    payload = {
        "model": model,
        "messages": [
            {
                "role": "system",
                "content": system_prompt,
            },
            {
                "role": "user",
                "content": message,
            },
        ],
        "stream": True,
    }

    headers = {
        "Authorization": f"Bearer {token}",
        "Accept": "text/event-stream",
        "Content-Type": "application/json",
    }

    with _client(timeout=180) as client:
        with client.stream(
            "POST",
            (
                f"{GIGACHAT_API_URL}"
                "/chat/completions"
            ),
            headers=headers,
            json=payload,
        ) as response:

            response.raise_for_status()

            for line in response.iter_lines():
                if not line:
                    continue

                if not line.startswith("data:"):
                    continue

                raw = line[5:].strip()

                if raw == "[DONE]":
                    break

                try:
                    data = json.loads(raw)
                except json.JSONDecodeError:
                    continue

                content = (
                    data
                    .get("choices", [{}])[0]
                    .get("delta", {})
                    .get("content", "")
                )

                if content:
                    yield content
