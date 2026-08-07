from __future__ import annotations

from gigachat import GigaChat


def build_gigachat_callable(credentials: str):
    if not credentials:
        raise RuntimeError("GIGACHAT_CREDENTIALS is empty")

    def call(prompt: str) -> str:
        with GigaChat(credentials=credentials, verify_ssl_certs=False) as giga:
            response = giga.chat(prompt)
            return response.choices[0].message.content

    return call
