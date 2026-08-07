from __future__ import annotations

import re
from pathlib import Path


def _tokens(text: str) -> set[str]:
    return set(re.findall(r"[A-Za-zА-Яа-яЁё0-9]+", text.lower()))


def load_country_documents(knowledge_root: str, country_slug: str) -> list[dict]:
    base = Path(knowledge_root) / country_slug
    docs = []
    if not base.exists():
        return docs
    for path in sorted(base.glob("*.md")):
        docs.append({"source": str(path), "text": path.read_text(encoding="utf-8")})
    return docs


def retrieve_context(question: str, documents: list[dict], top_k: int = 4) -> list[dict]:
    q = _tokens(question)
    scored = []
    for doc in documents:
        d = _tokens(doc["text"])
        score = len(q & d)
        if score:
            scored.append((score, doc))
    scored.sort(key=lambda x: x[0], reverse=True)
    return [doc for _, doc in scored[:top_k]]


def render_context(chunks: list[dict], max_chars: int = 9000) -> str:
    parts = []
    used = 0
    for chunk in chunks:
        block = f"\nSOURCE: {chunk['source']}\n{chunk['text']}\n"
        if used + len(block) > max_chars:
            break
        parts.append(block)
        used += len(block)
    return "\n".join(parts)
