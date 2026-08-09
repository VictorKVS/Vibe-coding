from __future__ import annotations

import asyncio
import datetime as dt
import html
import json
import re
from pathlib import Path

import aiohttp
import dateparser
import gspread
from google.oauth2.service_account import Credentials
from openai import OpenAI
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

from .config import Settings

ASSEMBLYAI_BASE = "https://api.assemblyai.com/v2"


async def assemblyai_transcribe(audio_path: Path, api_key: str) -> tuple[str, str | None]:
    headers = {"authorization": api_key}
    timeout = aiohttp.ClientTimeout(total=None)
    async with aiohttp.ClientSession(timeout=timeout) as session:
        with audio_path.open("rb") as f:
            async with session.post(f"{ASSEMBLYAI_BASE}/upload", headers=headers, data=f) as r:
                data = await r.json(content_type=None)
                if r.status >= 400:
                    raise RuntimeError(f"AssemblyAI upload failed: {r.status} {data}")
                upload_url = data["upload_url"]

        payload = {
            "audio_url": upload_url,
            "speech_models": ["universal-3-pro", "universal-2"],
            "language_detection": True,
            "speaker_labels": True,
            "punctuate": True,
            "format_text": True,
        }
        headers_json = {**headers, "content-type": "application/json"}
        async with session.post(f"{ASSEMBLYAI_BASE}/transcript", headers=headers_json, json=payload) as r:
            data = await r.json(content_type=None)
            if r.status >= 400:
                raise RuntimeError(f"AssemblyAI submit failed: {r.status} {data}")
            tid = data["id"]

        while True:
            await asyncio.sleep(4)
            async with session.get(f"{ASSEMBLYAI_BASE}/transcript/{tid}", headers=headers) as r:
                data = await r.json(content_type=None)
                if r.status >= 400:
                    raise RuntimeError(f"AssemblyAI poll failed: {r.status} {data}")
                if data.get("status") == "completed":
                    return (data.get("text") or "").strip(), data.get("language_code")
                if data.get("status") == "error":
                    raise RuntimeError(data.get("error") or "AssemblyAI transcription error")


def _extract_json(text: str) -> dict:
    text = text.strip()
    try:
        return json.loads(text)
    except Exception:
        m = re.search(r"\{.*\}", text, flags=re.S)
        if not m:
            raise ValueError("LLM returned no JSON")
        return json.loads(m.group(0))


def analyze_transcript(settings: Settings, transcript: str) -> dict:
    client = OpenAI(api_key=settings.openai_api_key)
    instructions = (
        "Ты — секретарь встреч. Анализируй только предоставленный транскрипт. "
        "Верни только JSON: {\"summary\":str,\"tasks\":[{\"task\":str,\"assignee\":str}],"
        "\"next_meeting_date\":str}. Если задач нет: task и assignee = 'не указана'. "
        "Если ответственный неясен — 'не указана'. Если следующая встреча не обсуждалась — 'не указана'. "
        "Если дата была приблизительной, добавь '(примерно)'."
    )
    response = client.responses.create(
        model=settings.openai_model,
        instructions=instructions,
        input=transcript[:120000],
    )
    data = _extract_json(response.output_text or "")
    tasks = data.get("tasks") if isinstance(data.get("tasks"), list) else []
    clean_tasks = []
    for item in tasks:
        if isinstance(item, dict):
            clean_tasks.append({
                "task": str(item.get("task") or "не указана"),
                "assignee": str(item.get("assignee") or "не указана"),
            })
    if not clean_tasks:
        clean_tasks = [{"task": "не указана", "assignee": "не указана"}]
    return {
        "summary": str(data.get("summary") or "не указана"),
        "tasks": clean_tasks,
        "next_meeting_date": str(data.get("next_meeting_date") or "не указана"),
    }


def answer_from_transcript(settings: Settings, transcript: str, question: str) -> str:
    client = OpenAI(api_key=settings.openai_api_key)
    response = client.responses.create(
        model=settings.openai_model,
        instructions=(
            "Отвечай строго по транскрипту встречи. Не используй внешние знания. "
            "Если ответа в транскрипте нет, ответь точно: 'В записи это не обсуждалось.'"
        ),
        input=f"ТРАНСКРИПТ:\n{transcript[:115000]}\n\nВОПРОС:\n{question[:4000]}",
    )
    answer = (response.output_text or "").strip()
    return answer or "В записи это не обсуждалось."


def append_to_sheets(settings: Settings, analysis: dict) -> tuple[bool, str]:
    info = settings.google_service_account()
    email = info.get("client_email", "")
    try:
        creds = Credentials.from_service_account_info(
            info, scopes=["https://www.googleapis.com/auth/spreadsheets"]
        )
        gc = gspread.authorize(creds)
        ws = gc.open_by_key(settings.google_sheets_id).worksheet(settings.sheets_name)
        today = dt.date.today().isoformat()
        rows = [
            [today, analysis["summary"], t["task"], t["assignee"], analysis["next_meeting_date"]]
            for t in analysis["tasks"]
        ]
        ws.append_rows(rows, value_input_option="USER_ENTERED")
        return True, ""
    except Exception as e:
        suffix = f" Дайте доступ сервисному аккаунту: {email}" if email else ""
        return False, f"Не смог записать данные в Google Sheets из-за отсутствия доступа.{suffix}\nОшибка: {type(e).__name__}"


def _font() -> tuple[str, str]:
    regular = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
    bold = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
    pdfmetrics.registerFont(TTFont("DZ5Font", regular))
    pdfmetrics.registerFont(TTFont("DZ5FontBold", bold if Path(bold).exists() else regular))
    return "DZ5Font", "DZ5FontBold"


def build_protocol_pdf(path: Path, transcript: str, analysis: dict, source_label: str) -> None:
    reg, bold = _font()
    styles = getSampleStyleSheet()
    body = ParagraphStyle("body", parent=styles["Normal"], fontName=reg, fontSize=10, leading=14)
    h1 = ParagraphStyle("h1", parent=styles["Heading1"], fontName=bold, fontSize=16, leading=20)
    h2 = ParagraphStyle("h2", parent=styles["Heading2"], fontName=bold, fontSize=12, leading=16)
    doc = SimpleDocTemplate(str(path), pagesize=A4, leftMargin=16*mm, rightMargin=16*mm, topMargin=14*mm, bottomMargin=14*mm)
    story = [Paragraph("Протокол встречи", h1), Paragraph(f"Источник: {html.escape(source_label)}", body), Spacer(1, 8)]
    story += [Paragraph("Саммари", h2), Paragraph(html.escape(analysis["summary"]).replace("\n", "<br/>"), body), Spacer(1, 8)]
    table_data = [["№", "Задача", "Ответственный"]]
    for i, task in enumerate(analysis["tasks"], 1):
        table_data.append([str(i), task["task"], task["assignee"]])
    table = Table(table_data, colWidths=[10*mm, 110*mm, 45*mm])
    table.setStyle(TableStyle([
        ("FONTNAME", (0,0), (-1,-1), reg), ("FONTNAME", (0,0), (-1,0), bold),
        ("BACKGROUND", (0,0), (-1,0), colors.lightgrey), ("GRID", (0,0), (-1,-1), 0.4, colors.grey),
        ("VALIGN", (0,0), (-1,-1), "TOP"), ("FONTSIZE", (0,0), (-1,-1), 9),
    ]))
    story += [Paragraph("Задачи", h2), table, Spacer(1, 8), Paragraph("Дата следующей встречи", h2), Paragraph(html.escape(analysis["next_meeting_date"]), body), Spacer(1, 12), Paragraph("Транскрипт", h2)]
    for block in transcript.split("\n\n"):
        if block.strip():
            story += [Paragraph(html.escape(block.strip()).replace("\n", "<br/>"), body), Spacer(1, 5)]
    doc.build(story)
