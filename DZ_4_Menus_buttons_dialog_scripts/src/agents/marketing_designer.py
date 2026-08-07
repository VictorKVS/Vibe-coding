from __future__ import annotations

from src.catalog import get_tour

BRAND_RULES = """
AI Travel Premium: темно-синий/navy фон, золотые акценты, белая типографика,
премиальная туристическая фотография, чистая композиция, без нарисованных Telegram-кнопок.
""".strip()


def build_image_prompt(sqlite_path: str, tour_code: str, format_name: str = "telegram_ad") -> str:
    tour = get_tour(sqlite_path, tour_code)
    if not tour:
        raise ValueError(f"Tour not found: {tour_code}")

    price = tour.get("price")
    if price is None:
        price_line = "Не размещать цену: подтвержденная цена отсутствует."
    else:
        currency = tour.get("currency") or ""
        label = "цена каталога MVP" if tour.get("price_status") == "INTERNAL_MVP" else "цена"
        price_line = f"Разместить {label}: {price:,.0f} {currency}.".replace(",", " ")

    return f"""Создай рекламный визуал туристического предложения.
Бренд: AI Travel Premium.
Формат: {format_name}.
Стиль: {BRAND_RULES}

ДАННЫЕ ТУРА — использовать строго как передано, ничего не придумывать:
Название: {tour.get('title')}
Страна: {tour.get('country')}
Регион/город: {tour.get('city')}
Длительность: {tour.get('days')} дней / {tour.get('nights')} ночей
Отель: {tour.get('hotel') or 'не указан'}
Категория: {tour.get('stars') or 'не указана'}
Питание: {tour.get('meal') or 'не указано'}
{price_line}

Требования:
- логотип/название AI Travel Premium;
- сильный визуальный образ направления;
- крупное название тура;
- не добавлять несуществующие скидки, даты, авиакомпании, услуги или рейтинги;
- не рисовать Telegram-кнопки и клавиатуру;
- текст должен быть коротким и хорошо читаемым на телефоне.
""".strip()
