from __future__ import annotations

import asyncio
from pathlib import Path

from aiogram import Bot, Dispatcher

from src.bot import router
from src.catalog import build_sqlite
from src.config import load_settings


async def main() -> None:
    settings = load_settings()
    if not settings.tg_token:
        raise RuntimeError("TG_TOKEN2 is empty")

    csv_path = Path(settings.tours_csv)
    sqlite_path = Path(settings.sqlite_path)
    if csv_path.exists():
        build_sqlite(str(csv_path), str(sqlite_path))

    bot = Bot(token=settings.tg_token)
    dp = Dispatcher()
    dp.include_router(router)

    await bot.delete_webhook(drop_pending_updates=True)
    print("AI Travel Premium bot started")
    await dp.start_polling(bot)


if __name__ == "__main__":
    asyncio.run(main())
