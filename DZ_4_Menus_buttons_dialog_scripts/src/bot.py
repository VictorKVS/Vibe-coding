from __future__ import annotations

import asyncio
from pathlib import Path

from aiogram import F, Router
from aiogram.filters import CommandStart
from aiogram.fsm.context import FSMContext
from aiogram.types import CallbackQuery, FSInputFile, InputMediaPhoto, Message, ReplyKeyboardRemove

from src.agents.travel_expert import answer_with_llm
from src.catalog import find_tours, get_tour
from src.config import load_settings
from src.destinations import enabled_destinations, get_destination
from src.fsm import ExpertChat, LeadForm, TourSearch
from src.keyboards import (
    confirm_keyboard,
    contact_keyboard,
    directions_keyboard,
    hotel_keyboard,
    main_menu,
    number_keyboard,
    rest_type_keyboard,
    tour_actions,
)
from src.llm import build_gigachat_callable
from src.storage import save_lead

router = Router(name="ai-travel-mvp")

DATA_DIR = Path("data")
ASSETS_DIR = Path("assets")
DESTINATIONS_CSV = DATA_DIR / "destinations.csv"
SQLITE_PATH = DATA_DIR / "ai_travel.db"
KNOWLEDGE_DIR = Path("knowledge")

REST_LABELS = {
    "beach": "Пляжный",
    "active": "Активный",
    "culture": "Экскурсионный",
    "mixed": "Смешанный",
}


async def send_screen(message: Message, filename: str, caption: str, reply_markup=None) -> None:
    path = ASSETS_DIR / "screens" / filename
    if path.exists():
        await message.answer_photo(FSInputFile(path), caption=caption, reply_markup=reply_markup)
    else:
        await message.answer(caption, reply_markup=reply_markup)


async def send_tour_card(message: Message, tour: dict, slug: str) -> None:
    price = tour.get("price")
    price_text = f"{price:,.0f} {tour.get('currency')}".replace(",", " ") if price is not None else "цена требует проверки"
    text = (
        f"🌍 {tour.get('country')} — {tour.get('title')}\n"
        f"📍 {tour.get('city')}\n"
        f"🏨 {tour.get('hotel') or 'отель уточняется'} {tour.get('stars') or ''}★\n"
        f"🗓 {tour.get('days')} дней / {tour.get('nights')} ночей\n"
        f"💰 {price_text}\n"
        f"Статус цены: {tour.get('price_status')}"
    )
    image = ASSETS_DIR / "tours" / f"{slug}.jpg"
    if image.exists():
        await message.answer_photo(FSInputFile(image), caption=text, reply_markup=tour_actions(tour["tour_code"], slug))
    else:
        await message.answer(text, reply_markup=tour_actions(tour["tour_code"], slug))


@router.message(CommandStart())
async def start(message: Message, state: FSMContext) -> None:
    await state.clear()
    await send_screen(
        message,
        "menu.jpg",
        "✨ AI Travel Premium\n\nПодберём путешествие и расскажем о направлении на основе проверенных данных.",
        main_menu(),
    )


@router.callback_query(F.data == "menu")
async def menu_callback(call: CallbackQuery, state: FSMContext) -> None:
    await state.clear()
    await call.message.answer("✨ Главное меню", reply_markup=main_menu())
    await call.answer()


@router.callback_query(F.data == "search:start")
async def search_start(call: CallbackQuery, state: FSMContext) -> None:
    await state.clear()
    await state.set_state(TourSearch.adults)
    await send_screen(call.message, "adults.jpg", "Сколько взрослых едет?", number_keyboard("adults", [1, 2, 3, 4]))
    await call.answer()


@router.callback_query(TourSearch.adults, F.data.startswith("adults:"))
async def set_adults(call: CallbackQuery, state: FSMContext) -> None:
    value = int(call.data.split(":", 1)[1])
    await state.update_data(adults=value)
    await state.set_state(TourSearch.children)
    await send_screen(call.message, "children.jpg", "Сколько детей едет?", number_keyboard("children", [0, 1, 2, 3]))
    await call.answer()


@router.callback_query(TourSearch.children, F.data.startswith("children:"))
async def set_children(call: CallbackQuery, state: FSMContext) -> None:
    value = int(call.data.split(":", 1)[1])
    await state.update_data(children=value)
    if value == 0:
        await state.update_data(children_age="—")
        await state.set_state(TourSearch.hotel)
        await send_screen(call.message, "hotel.jpg", "Какая категория отеля предпочтительна?", hotel_keyboard())
    else:
        await state.set_state(TourSearch.children_age)
        await send_screen(call.message, "children_age.jpg", "Напишите возраст детей через запятую, например: 6, 10")
    await call.answer()


@router.message(TourSearch.children_age)
async def set_children_age(message: Message, state: FSMContext) -> None:
    text = (message.text or "").strip()
    if not text:
        await message.answer("Укажите возраст детей числами, например: 6, 10")
        return
    await state.update_data(children_age=text)
    await state.set_state(TourSearch.hotel)
    await send_screen(message, "hotel.jpg", "Какая категория отеля предпочтительна?", hotel_keyboard())


@router.callback_query(TourSearch.hotel, F.data.startswith("hotel:"))
async def set_hotel(call: CallbackQuery, state: FSMContext) -> None:
    value = int(call.data.split(":", 1)[1])
    await state.update_data(hotel=value)
    await state.set_state(TourSearch.dates)
    await send_screen(call.message, "dates.jpg", "Напишите даты поездки, например: 15–24 октября")
    await call.answer()


@router.message(TourSearch.dates)
async def set_dates(message: Message, state: FSMContext) -> None:
    await state.update_data(dates=(message.text or "").strip())
    await state.set_state(TourSearch.budget)
    await send_screen(message, "budget.jpg", "Укажите максимальный бюджет в рублях, например: 250000")


@router.message(TourSearch.budget)
async def set_budget(message: Message, state: FSMContext) -> None:
    raw = (message.text or "").replace(" ", "").replace("₽", "")
    if not raw.isdigit():
        await message.answer("Введите бюджет числом, например: 250000")
        return
    await state.update_data(budget=int(raw))
    await state.set_state(TourSearch.rest_type)
    await send_screen(message, "rest_type.jpg", "Какой тип отдыха вам ближе?", rest_type_keyboard())


@router.callback_query(TourSearch.rest_type, F.data.startswith("rest:"))
async def set_rest_type(call: CallbackQuery, state: FSMContext) -> None:
    value = call.data.split(":", 1)[1]
    await state.update_data(rest_type=value)
    await state.set_state(TourSearch.direction)
    items = enabled_destinations(str(DESTINATIONS_CSV))
    await send_screen(call.message, "direction.jpg", "Выберите направление.", directions_keyboard(items))
    await call.answer()


@router.callback_query(TourSearch.direction, F.data.startswith("direction:"))
async def set_direction(call: CallbackQuery, state: FSMContext) -> None:
    slug = call.data.split(":", 1)[1]
    await state.update_data(direction=slug)
    await state.set_state(TourSearch.confirm)
    data = await state.get_data()
    destination = get_destination(str(DESTINATIONS_CSV), slug) if slug != "any" else None
    direction_name = destination["country"] if destination else "Любое"
    summary = (
        "Проверьте параметры поиска:\n\n"
        f"👨 Взрослые: {data.get('adults')}\n"
        f"👶 Дети: {data.get('children')}\n"
        f"🎂 Возраст детей: {data.get('children_age')}\n"
        f"⭐ Отель: {data.get('hotel') or 'не важно'}\n"
        f"📅 Даты: {data.get('dates')}\n"
        f"💰 Бюджет: до {data.get('budget')} ₽\n"
        f"🌴 Отдых: {REST_LABELS.get(data.get('rest_type'), data.get('rest_type'))}\n"
        f"🌍 Направление: {direction_name}"
    )
    await send_screen(call.message, "confirm.jpg", summary, confirm_keyboard())
    await call.answer()


@router.callback_query(TourSearch.confirm, F.data == "confirm:no")
async def restart_search(call: CallbackQuery, state: FSMContext) -> None:
    await state.clear()
    await state.set_state(TourSearch.adults)
    await call.message.answer("Начнём заново. Сколько взрослых едет?", reply_markup=number_keyboard("adults", [1, 2, 3, 4]))
    await call.answer()


@router.callback_query(TourSearch.confirm, F.data == "confirm:yes")
async def search_tours(call: CallbackQuery, state: FSMContext) -> None:
    data = await state.get_data()
    slug = data.get("direction")
    destination = get_destination(str(DESTINATIONS_CSV), slug) if slug and slug != "any" else None
    country = destination.get("country") if destination else None
    tours = find_tours(str(SQLITE_PATH), country=country, max_price=data.get("budget")) if SQLITE_PATH.exists() else []

    if not tours:
        await send_screen(
            call.message,
            "error.jpg",
            "По заданным параметрам подтверждённых туров в каталоге пока нет. Я не буду придумывать цену или наличие. Попробуйте Непал либо измените параметры.",
            main_menu(),
        )
        await call.answer()
        return

    await send_screen(call.message, "found.jpg", f"🤖 Найдено вариантов в проверенном каталоге: {len(tours)}")
    card_slug = (destination or {}).get("slug", "nepal")
    for tour in tours[:5]:
        await send_tour_card(call.message, tour, card_slug)
    await state.clear()
    await call.answer()


@router.callback_query(F.data.startswith("gallery:"))
async def show_gallery(call: CallbackQuery) -> None:
    slug = call.data.split(":", 1)[1]
    preferred = ASSETS_DIR / "gallery" / slug
    fallback = ASSETS_DIR / "gallery"
    gallery_dir = preferred if preferred.exists() else fallback
    photos = sorted([p for p in gallery_dir.glob("*.*") if p.suffix.lower() in {".jpg", ".jpeg", ".png", ".webp"}]) if gallery_dir.exists() else []
    if not photos:
        await call.message.answer("Галерея для этого направления пока не найдена в assets/gallery.")
        await call.answer()
        return
    media = []
    for index, photo in enumerate(photos[:10]):
        media.append(InputMediaPhoto(media=FSInputFile(photo), caption="Галерея тура" if index == 0 else None))
    await call.message.answer_media_group(media)
    await call.answer()


@router.callback_query(F.data.startswith("expert:"))
async def expert_entry(call: CallbackQuery, state: FSMContext) -> None:
    parts = call.data.split(":")
    slug = parts[1]
    tour_code = parts[2] if len(parts) > 2 else None
    destination = get_destination(str(DESTINATIONS_CSV), slug)
    if not destination or destination.get("knowledge_status") != "DETAILED":
        await call.message.answer("По этому направлению база знаний ещё не прошла подробную проверку. Для MVP полностью доступен эксперт по Непалу.")
        await call.answer()
        return
    await state.set_state(ExpertChat.active)
    await state.update_data(expert_slug=slug, expert_tour_code=tour_code)
    await send_screen(call.message, "ai.jpg", "🤖 Travel Expert AI готов. Задайте вопрос по Непалу: сезон, климат, треккинг, еда, транспорт, достопримечательности, правила поездки.")
    await call.answer()


@router.message(ExpertChat.active, F.text)
async def expert_question(message: Message, state: FSMContext) -> None:
    data = await state.get_data()
    settings = load_settings()
    if not settings.gigachat_credentials:
        await message.answer("GIGACHAT_CREDENTIALS не задан. В Colab добавьте секрет и перезапустите бота.")
        return
    question = (message.text or "").strip()
    try:
        llm_callable = build_gigachat_callable(settings.gigachat_credentials)
        answer = await asyncio.to_thread(
            answer_with_llm,
            question,
            data.get("expert_slug", "nepal"),
            str(KNOWLEDGE_DIR),
            str(SQLITE_PATH),
            llm_callable,
            data.get("expert_tour_code"),
        )
    except Exception as exc:
        await message.answer(f"AI-консультант временно недоступен: {type(exc).__name__}. Попробуйте ещё раз позже.")
        return
    await message.answer(answer)


@router.callback_query(F.data.startswith("lead:"))
async def lead_start(call: CallbackQuery, state: FSMContext) -> None:
    tour_code = call.data.split(":", 1)[1]
    tour = get_tour(str(SQLITE_PATH), tour_code) if SQLITE_PATH.exists() else None
    if not tour:
        await call.message.answer("Тур не найден в каталоге.")
        await call.answer()
        return
    await state.set_state(LeadForm.waiting_contact)
    await state.update_data(lead_tour_code=tour_code)
    await send_screen(call.message, "manager.jpg", "Оставьте контакт, чтобы менеджер получил выбранный тур и параметры заявки.")
    await call.message.answer("Нажмите кнопку ниже.", reply_markup=contact_keyboard())
    await call.answer()


@router.message(LeadForm.waiting_contact, F.contact)
async def lead_contact(message: Message, state: FSMContext) -> None:
    data = await state.get_data()
    tour_code = data.get("lead_tour_code")
    contact = message.contact
    user = message.from_user
    lead_id = save_lead(
        str(SQLITE_PATH),
        telegram_user_id=user.id if user else None,
        telegram_username=user.username if user else None,
        first_name=user.first_name if user else None,
        last_name=user.last_name if user else None,
        phone_number=contact.phone_number,
        tour_code=tour_code,
    )
    await state.clear()
    await message.answer("Контакт получен.", reply_markup=ReplyKeyboardRemove())
    await send_screen(
        message,
        "success.jpg",
        f"✅ Заявка #{lead_id} принята. Тур: {tour_code}. Менеджер увидит её в базе MVP.",
        main_menu(),
    )


@router.callback_query(F.data == "about")
async def about(call: CallbackQuery) -> None:
    await send_screen(call.message, "about.jpg", "AI Travel Premium — Telegram MVP с проверенным каталогом, RAG-базой знаний и специализированными AI-агентами.", main_menu())
    await call.answer()
