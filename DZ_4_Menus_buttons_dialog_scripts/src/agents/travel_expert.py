from __future__ import annotations

from typing import Callable

from src.catalog import get_tour
from src.knowledge import load_country_documents, retrieve_context, render_context

SYSTEM_RULES = """
Ты Travel Expert AI туристического сервиса AI Travel Premium.

ЖЕСТКИЕ ПРАВИЛА:
1. Не придумывай цены, даты, отели, наличие, рейтинг, перелеты и состав пакета.
2. Коммерческие параметры тура используй только из TOUR_DATA.
3. Справочные сведения используй только из KNOWLEDGE_CONTEXT.
4. Если данных нет — прямо скажи, что информации недостаточно или нужна актуальная проверка.
5. Различай VERIFIED/official facts, research conclusions и subjective/community opinions.
6. Для изменяемых визовых, транспортных, погодных и ценовых данных указывай, что требуется актуальная проверка, если контекст не подтверждает их свежесть.
7. Не выдавай INTERNAL_MVP цену за рыночную цену внешнего туроператора. Называй ее ценой каталога MVP.
8. Отвечай по-русски, понятно и без лишней воды.
""".strip()


def build_grounded_prompt(
    question: str,
    country_slug: str,
    knowledge_root: str,
    sqlite_path: str,
    tour_code: str | None = None,
) -> str:
    docs = load_country_documents(knowledge_root, country_slug)
    chunks = retrieve_context(question, docs)
    context = render_context(chunks)
    tour = get_tour(sqlite_path, tour_code) if tour_code else None

    return f"""{SYSTEM_RULES}

USER_QUESTION:
{question}

TOUR_DATA:
{tour if tour else 'NO_TOUR_SELECTED'}

KNOWLEDGE_CONTEXT:
{context if context else 'NO_RELEVANT_KNOWLEDGE_FOUND'}

Сформируй ответ, строго опираясь на эти данные.
"""


def answer_with_llm(
    question: str,
    country_slug: str,
    knowledge_root: str,
    sqlite_path: str,
    llm_callable: Callable[[str], str],
    tour_code: str | None = None,
) -> str:
    prompt = build_grounded_prompt(
        question=question,
        country_slug=country_slug,
        knowledge_root=knowledge_root,
        sqlite_path=sqlite_path,
        tour_code=tour_code,
    )
    return llm_callable(prompt)
