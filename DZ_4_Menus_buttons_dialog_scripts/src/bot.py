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
from src.destinations import enabled_destinations, get_destination, load_destinations
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

router = Router(name="ai-travel-premium")

DATA_DIR = Path("data")
ASSETS_DIR = Path("assets")
DESTINATIONS_CSV = DATA_DIR / "destinations.csv"
SQLITE_PATH = DATA_DIR / "ai_travel.db"
KNOWLEDGE_DIR = Path("knowledge")

REST_LABELS = {
    "beach": "Пляжный",
    "active": "Активный / горы",
    "culture": "Экскурсионный",
    "mixed": "Смешанный",
}


def progress(step: int) -> str:
    return "●" * step + "○" * (7 - step)


async def send_photo_or_text(message: Message, relative_path: str, caption: str, reply_markup=None) -> None:
    path = ASSETS_DIR / relative_path
    if path.exists():
        await message.answer_photo(FSInputFile(path), caption=caption, reply_markup=reply_markup)
    else:
        await message.answer(caption, reply_markup=reply_markup)


async def send_screen(message: Message, filename: str, caption: str, reply_markup=None) -> None:
    await send_photo_or_text(message, f"screens/{filename}", caption, reply_markup)


async def send_step_visual(message: Message, step: int, caption: str, reply_markup=None) -> None:
    visual_map = {
        1: "gallery/photo1.jpg",
        2: "gallery/photo2.jpg",
        3: "screens/hotel.jpg",
        4: "gallery/photo3.jpg",
        5: "gallery/photo4.jpg",
        6: "screens/rest_type.jpg",
        7: "screens/direction.jpg",
    }
    await send_photo_or_text(message, visual_map[step], caption, reply_markup)


async def send_tour_card(message: Message, tour: dict, slug: str) -> None:
    price = tour.get("price")
    price_text = f"{price:,.0f} {tour.get('currency')}".replace(",", " ") if price is not None else "по запросу"
    featured = "⭐ ЗВЕЗДА MVP\n" if slug == "nepal" else ""
    status = "цена каталога MVP" if tour.get("price_status") == "INTERNAL_MVP" else "параметры требуют подтверждения"
    text = (
        f"{featured}🌍 {tour.get('country')} — {tour.get('title')}\n\n"
        f"📍 {tour.get('city')}\n"
        f"🏨 {tour.get('hotel') or 'отель уточняется'} {tour.get('stars') or ''}★\n"
        f"🍽 {tour.get('meal') or 'питание уточняется'}\n"
        f"🗓 {tour.get('days')} дней / {tour.get('nights')} ночей\n"
        f"💰 {price_text}\n\n"
        f"ℹ️ {status}"
    )
    await send_photo_or_text(message, f"tours/{slug}.jpg", text, tour_actions(tour["tour_code"], slug))


@router.message(CommandStart())
async def start(message: Message, state: FSMContext) -> None:
    await state.clear()
    await send_photo_or_text(
        message,
        "tours/nepal.jpg",
        "✨ AI TRAVEL PREMIUM\n\n"
        "Персональный AI-консультант по путешествиям.\n"
        "17 визуальных направлений, проверяемый каталог и AI-эксперт.\n\n"
        "⭐ Непал — главное демонстрационное направление MVP: подробная база знаний, галерея и AI-консультация.",
        main_menu(),
    )


@router.callback_query(F.data == "menu")
async def menu_callback(call: CallbackQuery, state: FSMContext) -> None:
    await state.clear()
    await send_photo_or_text(call.message, "tours/nepal.jpg", "✨ Главное меню AI Travel Premium", main_menu())
    await call.answer()


@router.callback_query(F.data == "showcase")
async def showcase(call: CallbackQuery) -> None:
    items = load_destinations(str(DESTINATIONS_CSV))
    media: list[InputMediaPhoto] = []
    for item in items:
        image = ASSETS_DIR / "tours" / item.get("image_file", "")
        if not image.exists():
            continue
        label = "⭐ Непал — подробный MVP" if item.get("slug") == "nepal" else f"🌍 {item.get('country')}"
        caption = f"{label}\n{item.get('primary_city_or_region')}"
        media.append(InputMediaPhoto(media=FSInputFile(image), caption=caption))
    for i in range(0, len(media), 10):
        await call.message.answer_media_group(media[i:i + 10])
    await call.message.answer("⭐ Непал проработан подробно. Остальные направления уже представлены визуально и постепенно получают проверенную базу знаний.", reply_markup=main_menu())
    await call.answer()


@router.callback_query(F.data == "featured:nepal")
async def featured_nepal(call: CallbackQuery) -> None:
    tour = get_tour(str(SQLITE_PATH), "NP-001") if SQLITE_PATH.exists() else None
    if tour:
        await send_tour_card(call.message, tour, "nepal")
    else:
        await send_photo_or_text(call.message, "tours/nepal.jpg", "⭐ Непал — звезда AI Travel Premium. Каталог сейчас инициализируется.", main_menu())
    await call.answer()


@router.callback_query(F.data == "search:start")
async def search_start(call: CallbackQuery, state: FSMContext) -> None:
    await state.clear()
    await state.set_state(TourSearch.adults)
    await send_step_visual(call.message, 1, f"Шаг 1 из 7\n{progress(1)}\n\nСколько взрослых едет?", number_keyboard("adults", [1, 2, 3, 4]))
    await call.answer()


@router.callback_query(TourSearch.adults, F.data.startswith("adults:"))
async def set_adults(call: CallbackQuery, state: FSMContext) -> None:
    await state.update_data(adults=int(call.data.split(":", 1)[1]))
    await state.set_state(TourSearch.children)
    await send_step_visual(call.message, 2, f"Шаг 2 из 7\n{progress(2)}\n\nСколько детей едет?", number_keyboard("children", [0, 1, 2, 3]))
    await call.answer()


@router.callback_query(TourSearch.children, F.data.startswith("children:"))
async def set_children(call: CallbackQuery, state: FSMContext) -> None:
    value = int(call.data.split(":", 1)[1])
    await state.update_data(children=value)
    if value == 0:
        await state.update_data(children_age="—")
        await state.set_state(TourSearch.hotel)
        await send_step_visual(call.message, 3, f"Шаг 3 из 7\n{progress(3)}\n\nКакой уровень отеля?", hotel_keyboard())
    else:
        await state.set_state(TourSearch.children_age)
        await send_photo_or_text(call.message, "gallery/photo5.jpg", f"Укажите {value} возраст(а) через запятую.\nНапример: 6, 12")
    await call.answer()


@router.message(TourSearch.children_age)
async def set_children_age(message: Message, state: FSMContext) -> None:
    text = (message.text or "").strip()
    if not text:
        await message.answer("Укажите возраст детей числами, например: 6, 12")
        return
    await state.update_data(children_age=text)
    await state.set_state(TourSearch.hotel)
    await send_step_visual(message, 3, f"Шаг 3 из 7\n{progress(3)}\n\nКакой уровень отеля?", hotel_keyboard())


@router.callback_query(TourSearch.hotel, F.data.startswith("hotel:"))
async def set_hotel(call: CallbackQuery, state: FSMContext) -> None:
    await state.update_data(hotel=int(call.data.split(":", 1)[1]))
    await state.set_state(TourSearch.dates)
    await send_step_visual(call.message, 4, f"Шаг 4 из 7\n{progress(4)}\n\nКогда планируете поездку?\nНапример: 10–20 октября.")
    await call.answer()


@router.message(TourSearch.dates)
async def set_dates(message: Message, state: FSMContext) -> None:
    await state.update_data(dates=(message.text or "").strip())
    await state.set_state(TourSearch.budget)
    await send_step_visual(message, 5, f"Шаг 5 из 7\n{progress(5)}\n\nКакой максимальный бюджет?\nВведите сумму в рублях, например: 250000")


@router.message(TourSearch.budget)
async def set_budget(message: Message, state: FSMContext) -> None:
    raw = (message.text or "").replace(" ", "").replace("₽", "")
    if not raw.isdigit():
        await message.answer("Введите бюджет числом, например: 250000")
        return
    await state.update_data(budget=int(raw))
    await state.set_state(TourSearch.rest_type)
    await send_step_visual(message, 6, f"Шаг 6 из 7\n{progress(6)}\n\nКакой тип отдыха?", rest_type_keyboard())


@router.callback_query(TourSearch.rest_type, F.data.startswith("rest:"))
async def set_rest_type(call: CallbackQuery, state: FSMContext) -> None:
    await state.update_data(rest_type=call.data.split(":", 1)[1])
    await state.set_state(TourSearch.direction)
    await send_step_visual(call.message, 7, f"Шаг 7 из 7\n{progress(7)}\n\nВыберите направление.\n⭐ Непал — полностью проработанный вариант MVP.", directions_keyboard(enabled_destinations(str(DESTINATIONS_CSV))))
    await call.answer()


@router.callback_query(TourSearch.direction, F.data.startswith("direction:"))
async def set_direction(call: CallbackQuery, state: FSMContext) -> None:
    slug = call.data.split(":", 1)[1]
    await state.update_data(direction=slug)
    await state.set_state(TourSearch.confirm)
    data = await state.get_data()
    destination = get_destination(str(DESTINATIONS_CSV), slug) if slug != "any" else None
    direction_name = destination["country"] if destination else "Любое"

    if destination:
        marker = "⭐ Подробный AI-профиль" if slug == "nepal" else "Визуальная карточка направления"
        await send_photo_or_text(call.message, f"tours/{slug}.jpg", f"{marker}\n🌍 Вы выбрали: {direction_name}")

    summary = (
        "✅ Проверьте анкету\n\n"
        f"👨 Взрослые: {data.get('adults')}\n"
        f"👶 Дети: {data.get('children')}\n"
        f"🎂 Возраст детей: {data.get('children_age')}\n"
        f"⭐ Отель: {data.get('hotel') or 'не важно'}\n"
        f"📅 Даты: {data.get('dates')}\n"
        f"💰 Бюджет: до {data.get('budget')} ₽\n"
        f"🌴 Отдых: {REST_LABELS.get(data.get('rest_type'), data.get('rest_type'))}\n"
        f"🌍 Направление: {direction_name}"
    )
    await call.message.answer(summary, reply_markup=confirm_keyboard())
    await call.answer()


@router.callback_query(TourSearch.confirm, F.data == "confirm:no")
async def restart_search(call: CallbackQuery, state: FSMContext) -> None:
    await state.clear()
    await state.set_state(TourSearch.adults)
    await send_step_visual(call.message, 1, f"Шаг 1 из 7\n{progress(1)}\n\nНачнём заново. Сколько взрослых?", number_keyboard("adults", [1, 2, 3, 4]))
    await call.answer()


@router.callback_query(TourSearch.confirm, F.data == "confirm:yes")
async def search_tours(call: CallbackQuery, state: FSMContext) -> None:
    data = await state.get_data()
    slug = data.get("direction")
    destination = get_destination(str(DESTINATIONS_CSV), slug) if slug and slug != "any" else None
    country = destination.get("country") if destination else None

    await send_screen(call.message, "search.jpg", "🤖 AI анализирует анкету и проверенный каталог…")
    tours = find_tours(str(SQLITE_PATH), country=country, max_price=data.get("budget")) if SQLITE_PATH.exists() else []

    if not tours:
        if destination:
            await send_photo_or_text(
                call.message,
                f"tours/{slug}.jpg",
                f"🌍 {destination.get('country')}\n\nКарточка направления готова, но подтверждённого коммерческого предложения под вашу анкету пока нет. Я не придумываю цену и наличие.\n\n⭐ Для полного демонстрационного сценария выберите Непал.",
                main_menu(),
            )
        else:
            await call.message.answer("Подтверждённых предложений по заданным параметрам пока нет.", reply_markup=main_menu())
        await state.clear()
        await call.answer()
        return

    await call.message.answer(f"🤖 Найдено проверенных вариантов: {len(tours)}")
    card_slug = (destination or {}).get("slug", "nepal")
    for tour in tours[:5]:
        await send_tour_card(call.message, tour, card_slug)
    await state.clear()
    await call.answer()


@router.callback_query(F.data.startswith("gallery:"))
async def show_gallery(call: CallbackQuery) -> None:
    slug = call.data.split(":", 1)[1]
    if slug != "nepal":
        await call.message.answer("Полная фотогалерея в MVP подготовлена для Непала. Карточка этого направления уже доступна в витрине.")
        await call.answer()
        return

    await send_screen(call.message, "gallery.jpg", "⭐ Непал — галерея путешествия\nГималаи, культура, маршруты и атмосфера поездки.")
    gallery_dir = ASSETS_DIR / "gallery"
    photos = sorted(p for p in gallery_dir.glob("photo*.*") if p.suffix.lower() in {".jpg", ".jpeg", ".png", ".webp"})
    if photos:
        media = [InputMediaPhoto(media=FSInputFile(photo), caption="🇳🇵 Непал — AI Travel Premium" if i == 0 else None) for i, photo in enumerate(photos[:10])]
        await call.message.answer_media_group(media)
    await call.message.answer("Хотите узнать про сезон, климат, треккинг, еду, транспорт или что привезти из Непала?", reply_markup=tour_actions("NP-001", "nepal"))
    await call.answer()


@router.callback_query(F.data.startswith("expert:"))
async def expert_entry(call: CallbackQuery, state: FSMContext) -> None:
    parts = call.data.split(":")
    slug = parts[1]
    tour_code = parts[2] if len(parts) > 2 else None
    destination = get_destination(str(DESTINATIONS_CSV), slug)
    if not destination or destination.get("knowledge_status") != "DETAILED":
        await call.message.answer("По этому направлению экспертная база ещё наполняется. ⭐ Полный AI-консультант MVP доступен по Непалу.", reply_markup=main_menu())
        await call.answer()
        return
    await state.set_state(ExpertChat.active)
    await state.update_data(expert_slug=slug, expert_tour_code=tour_code)
    await send_photo_or_text(
        call.message,
        "gallery/photo6.jpg",
        "🤖 Персональный Travel Expert AI активирован\n\n"
        "🇳🇵 Непал — подробная проверяемая база знаний.\n"
        "Спросите про климат и сезоны, треккинг, достопримечательности, кухню, транспорт, визовые вопросы, сувениры или выбранный тур.",
    )
    await call.answer()


@router.message(ExpertChat.active, F.text)
async def expert_question(message: Message, state: FSMContext) -> None:
    data = await state.get_data()
    settings = load_settings()
    if not settings.gigachat_credentials:
        await message.answer("GIGACHAT_CREDENTIALS не задан. Добавьте секрет в Colab и перезапустите бота.")
        return
    try:
        answer = await asyncio.to_thread(
            answer_with_llm,
            (message.text or "").strip(),
            data.get("expert_slug", "nepal"),
            str(KNOWLEDGE_DIR),
            str(SQLITE_PATH),
            build_gigachat_callable(settings.gigachat_credentials),
            data.get("expert_tour_code"),
        )
        await message.answer(answer)
    except Exception as exc:
        await message.answer(f"AI-консультант временно недоступен: {type(exc).__name__}. Попробуйте ещё раз.")


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
    slug = "nepal" if tour_code == "NP-001" else "nepal"
    await send_photo_or_text(call.message, f"tours/{slug}.jpg", f"✅ Вы выбрали: {tour.get('title')}\n\nОставьте контакт — заявка будет записана в SQLite и доступна менеджеру.")
    await call.message.answer("Нажмите кнопку ниже.", reply_markup=contact_keyboard())
    await call.answer()


@router.message(LeadForm.waiting_contact, F.contact)
async def lead_contact(message: Message, state: FSMContext) -> None:
    data = await state.get_data()
    contact = message.contact
    user = message.from_user
    lead_id = save_lead(
        str(SQLITE_PATH),
        telegram_user_id=user.id if user else None,
        telegram_username=user.username if user else None,
        first_name=user.first_name if user else None,
        last_name=user.last_name if user else None,
        phone_number=contact.phone_number,
        tour_code=data.get("lead_tour_code"),
    )
    await state.clear()
    await message.answer("Контакт получен.", reply_markup=ReplyKeyboardRemove())
    await send_photo_or_text(
        message,
        "gallery/photo1.jpg",
        f"✅ Заявка #{lead_id} принята!\n\nМенеджер получит выбранный тур и ваш контакт.\nСпасибо, что путешествуете с AI Travel Premium.",
        main_menu(),
    )


@router.callback_query(F.data == "about")
async def about(call: CallbackQuery) -> None:
    await send_photo_or_text(
        call.message,
        "tours/nepal.jpg",
        "AI Travel Premium — Telegram MVP с 17 визуальными направлениями, SQLite-каталогом, RAG-базой знаний и специализированными AI-агентами.\n\n⭐ Непал — эталонное направление с полной AI-консультацией.",
        main_menu(),
    )
    await call.answer()
