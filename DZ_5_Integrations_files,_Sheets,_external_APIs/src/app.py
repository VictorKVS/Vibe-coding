from __future__ import annotations

import asyncio
import re
import uuid
from pathlib import Path

import aiohttp
import gdown
from aiogram import Bot, Dispatcher, F, Router
from aiogram.exceptions import TelegramBadRequest
from aiogram.filters import CommandStart
from aiogram.types import CallbackQuery, FSInputFile, InlineKeyboardButton, InlineKeyboardMarkup, Message

from .assets import screen_path, validate_assets
from .config import DOWNLOADS_DIR, NORMALIZED_DIR, PROTOCOLS_DIR, TRANSCRIPTS_DIR, Settings
from .ingestion import create_artifact
from .progress import ProgressReporter, render_progress
from .router import route_artifact
from .services import analyze_transcript, answer_from_transcript, append_to_sheets, assemblyai_transcribe, build_protocol_pdf

router = Router()
SETTINGS: Settings | None = None
CHAT_STATE: dict[int, dict] = {}
LOCKS: dict[int, asyncio.Lock] = {}


def kb_start() -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text="📎 Отправить запись", callback_data="help_upload")],
        [InlineKeyboardButton(text="ℹ️ Как это работает", callback_data="how_it_works")],
    ])


def kb_ready() -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text="📄 Скачать PDF", callback_data="download_pdf")],
        [InlineKeyboardButton(text="💬 Задать вопрос", callback_data="ask_ai")],
        [InlineKeyboardButton(text="🔄 Новая запись", callback_data="new_record")],
    ])


async def send_stage(message: Message, stage: str, caption: str | None = None, reply_markup=None):
    path = screen_path(stage, "phone")
    return await message.answer_photo(FSInputFile(path), caption=caption, reply_markup=reply_markup)


def _media_from_message(message: Message):
    if message.voice:
        return message.voice.file_id, "voice.ogg", message.voice.mime_type or "audio/ogg"
    if message.audio:
        return message.audio.file_id, message.audio.file_name or "audio", message.audio.mime_type
    if message.video:
        return message.video.file_id, message.video.file_name or "video.mp4", message.video.mime_type or "video/mp4"
    if message.video_note:
        return message.video_note.file_id, "video_note.mp4", "video/mp4"
    if message.document:
        return message.document.file_id, message.document.file_name or "document", message.document.mime_type
    raise ValueError("No file in message")


def _url_from_text(text: str) -> str | None:
    m = re.search(r"https?://\S+", text or "")
    return m.group(0).rstrip(").,;\"'") if m else None


async def _download_url(url: str, out_path: Path):
    if "drive.google.com" in url:
        result = await asyncio.to_thread(gdown.download, url=url, output=str(out_path), quiet=True, fuzzy=True)
        if not result or not out_path.exists() or out_path.stat().st_size == 0:
            raise RuntimeError("Google Drive download failed")
        return
    timeout = aiohttp.ClientTimeout(total=None)
    async with aiohttp.ClientSession(timeout=timeout) as session:
        async with session.get(url, allow_redirects=True, headers={"User-Agent": "Mozilla/5.0"}) as r:
            if r.status >= 400:
                raise RuntimeError(f"HTTP {r.status}")
            with out_path.open("wb") as f:
                async for chunk in r.content.iter_chunked(1024 * 1024):
                    f.write(chunk)


async def _process_local(message: Message, local_path: Path, source: str, declared_mime: str | None):
    assert SETTINGS is not None
    chat_id = message.chat.id
    lock = LOCKS.setdefault(chat_id, asyncio.Lock())
    async with lock:
        await send_stage(message, "file_received", "Файл получен ✅\nПодготавливаю запись к обработке.")
        progress_message = await message.answer(render_progress("received"))
        reporter = ProgressReporter(progress_message.edit_text)
        try:
            await reporter.set("downloaded")
            artifact = await asyncio.to_thread(
                create_artifact,
                local_path,
                source=source,
                original_name=local_path.name,
                declared_mime=declared_mime,
            )
            routed = await asyncio.to_thread(route_artifact, local_path, NORMALIZED_DIR / artifact.id)

            if routed["kind"] != "media":
                await progress_message.edit_text("Файл принят и классифицирован.\nДля задания транскрибация выполняется только для аудио/видео.")
                return

            await reporter.set("normalized")
            await send_stage(message, "transcription", "Транскрибация записи")
            audio_path = Path(routed["normalized_audio"])
            transcript, language = await assemblyai_transcribe(audio_path, SETTINGS.assemblyai_api_key)
            if not transcript:
                raise RuntimeError("Empty transcript")
            await reporter.set("transcribed")

            transcript_path = TRANSCRIPTS_DIR / f"{artifact.id}.txt"
            transcript_path.write_text(transcript, encoding="utf-8")
            await reporter.set("saved")

            # Требование задания: отдельное сообщение, один раз, сразу после сохранения текста.
            await message.answer("Транскрибация завершена успешно.")

            await send_stage(message, "analysis", "AI анализирует встречу")
            analysis = await asyncio.to_thread(analyze_transcript, SETTINGS, transcript)
            await reporter.set("analyzed")

            sheets_ok, sheets_error = await asyncio.to_thread(append_to_sheets, SETTINGS, analysis)
            if not sheets_ok:
                await message.answer(sheets_error)
            await reporter.set("sheets")

            pdf_path = PROTOCOLS_DIR / f"{artifact.id}.pdf"
            await asyncio.to_thread(build_protocol_pdf, pdf_path, transcript, analysis, source)
            await reporter.set("ready")

            CHAT_STATE[chat_id] = {
                "artifact_id": artifact.id,
                "transcript": transcript,
                "transcript_path": str(transcript_path),
                "language": language,
                "analysis": analysis,
                "pdf_path": str(pdf_path),
                "qa_mode": False,
            }
            await send_stage(
                message,
                "ready",
                "Протокол готов ✅\nРезультаты сохранены.",
                reply_markup=kb_ready(),
            )
        except Exception as e:
            await progress_message.edit_text(f"Обработка остановлена.\nОшибка: {type(e).__name__}")
            await message.answer("Не удалось завершить обработку. Проверьте формат файла или доступ к внешнему сервису.")


@router.message(CommandStart())
async def start(message: Message):
    await send_stage(
        message,
        "start",
        "AI-Секретарь встреч\n\nПришлите аудио, видео или ссылку на запись. После обработки я подготовлю протокол и сохраню результаты.",
        reply_markup=kb_start(),
    )


@router.callback_query(F.data == "help_upload")
async def help_upload(callback: CallbackQuery):
    await callback.answer()
    await callback.message.answer("Пришлите аудио/видео файлом или отправьте публичную ссылку Google Drive / прямую ссылку.")


@router.callback_query(F.data == "how_it_works")
async def how_it_works(callback: CallbackQuery):
    await callback.answer()
    await callback.message.answer("Файл → нормализация → транскрибация → сохранение текста → AI-анализ → Google Sheets → PDF-протокол.")


@router.callback_query(F.data == "download_pdf")
async def download_pdf(callback: CallbackQuery):
    await callback.answer()
    state = CHAT_STATE.get(callback.message.chat.id)
    if not state or not Path(state["pdf_path"]).exists():
        await callback.message.answer("PDF пока недоступен.")
        return
    await callback.message.answer_document(FSInputFile(state["pdf_path"]), caption="Протокол встречи")


@router.callback_query(F.data == "ask_ai")
async def ask_ai(callback: CallbackQuery):
    await callback.answer()
    state = CHAT_STATE.get(callback.message.chat.id)
    if not state:
        await callback.message.answer("Сначала пришлите запись.")
        return
    state["qa_mode"] = True
    await send_stage(callback.message, "ai_consultant", "AI-консультант активирован. Задайте вопрос по последней встрече.")


@router.callback_query(F.data == "new_record")
async def new_record(callback: CallbackQuery):
    await callback.answer()
    CHAT_STATE.pop(callback.message.chat.id, None)
    await callback.message.answer("Готов принять новую запись.")


@router.message(F.voice | F.audio | F.video | F.video_note | F.document)
async def media(message: Message, bot: Bot):
    file_id, name, mime = _media_from_message(message)
    safe_name = re.sub(r"[^0-9A-Za-zА-Яа-я._-]+", "_", name)[:150]
    path = DOWNLOADS_DIR / f"{uuid.uuid4().hex}_{safe_name}"
    try:
        await bot.download(file_id, destination=path)
    except TelegramBadRequest as e:
        if "too big" in str(e).lower():
            await message.answer("Файл слишком большой для стандартной загрузки Telegram. Пришлите публичную ссылку Google Drive или прямую ссылку на файл.")
            return
        raise
    asyncio.create_task(_process_local(message, path, "telegram", mime))


@router.message(F.text)
async def text(message: Message):
    assert SETTINGS is not None
    text_value = (message.text or "").strip()
    url = _url_from_text(text_value)
    if url:
        suffix = Path(url.split("?", 1)[0]).suffix or ".bin"
        path = DOWNLOADS_DIR / f"{uuid.uuid4().hex}{suffix}"
        await message.answer("Ссылку получил ✅ Сейчас загружу файл.")
        try:
            await _download_url(url, path)
        except Exception:
            await message.answer("Не смог скачать файл по ссылке. Проверьте, что доступ открыт для просмотра по ссылке.")
            return
        asyncio.create_task(_process_local(message, path, "url", None))
        return

    state = CHAT_STATE.get(message.chat.id)
    if not state:
        await message.answer("Я пока не получал запись. Пришлите аудио/видео.")
        return
    if not state.get("qa_mode"):
        state["qa_mode"] = True
        await send_stage(message, "ai_consultant", "AI-консультант активирован. Отвечаю только по последней встрече.")
    answer = await asyncio.to_thread(answer_from_transcript, SETTINGS, state["transcript"], text_value)
    await message.answer(answer)


async def main():
    global SETTINGS
    SETTINGS = Settings.from_colab()
    assets = validate_assets()
    print("Assets ready:", assets)
    bot = Bot(SETTINGS.telegram_token)
    dp = Dispatcher()
    dp.include_router(router)
    try:
        await dp.start_polling(bot, allowed_updates=["message", "callback_query"])
    finally:
        await bot.session.close()


if __name__ == "__main__":
    asyncio.run(main())
