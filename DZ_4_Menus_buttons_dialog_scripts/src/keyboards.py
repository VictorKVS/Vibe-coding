from aiogram.types import InlineKeyboardButton, InlineKeyboardMarkup, KeyboardButton, ReplyKeyboardMarkup


def main_menu() -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text="🧭 Подобрать тур", callback_data="search:start")],
        [InlineKeyboardButton(text="💡 Есть идея путешествия", callback_data="idea:start")],
        [InlineKeyboardButton(text="🤖 AI-консультант", callback_data="expert:nepal")],
        [InlineKeyboardButton(text="ℹ️ О сервисе", callback_data="about")],
    ])


def number_keyboard(prefix: str, values: list[int]) -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text=str(v), callback_data=f"{prefix}:{v}") for v in values]
    ])


def hotel_keyboard() -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text="3★", callback_data="hotel:3"), InlineKeyboardButton(text="4★", callback_data="hotel:4"), InlineKeyboardButton(text="5★", callback_data="hotel:5")],
        [InlineKeyboardButton(text="Не важно", callback_data="hotel:0")],
    ])


def rest_type_keyboard() -> InlineKeyboardMarkup:
    values = [("🏖 Пляжный", "beach"), ("🏔 Активный", "active"), ("🏛 Экскурсионный", "culture"), ("✨ Смешанный", "mixed")]
    return InlineKeyboardMarkup(inline_keyboard=[[InlineKeyboardButton(text=t, callback_data=f"rest:{v}")] for t, v in values])


def confirm_keyboard() -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text="✅ Искать туры", callback_data="confirm:yes")],
        [InlineKeyboardButton(text="✏️ Изменить", callback_data="confirm:no")],
    ])


def tour_actions(tour_code: str, slug: str) -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text="🖼 Галерея", callback_data=f"gallery:{slug}")],
        [InlineKeyboardButton(text="🤖 Спросить AI", callback_data=f"expert:{slug}:{tour_code}")],
        [InlineKeyboardButton(text="✅ Выбрать тур", callback_data=f"lead:{tour_code}")],
        [InlineKeyboardButton(text="🏠 Главное меню", callback_data="menu")],
    ])


def contact_keyboard() -> ReplyKeyboardMarkup:
    return ReplyKeyboardMarkup(
        keyboard=[[KeyboardButton(text="📱 Поделиться контактом", request_contact=True)]],
        resize_keyboard=True,
        one_time_keyboard=True,
    )
