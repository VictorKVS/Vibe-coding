"""Local, cancellable Whisper service for bounded PCM segments. No content logging."""
import asyncio
import io
import json
import os
from pathlib import Path
import tempfile
import time
import wave
from contextlib import asynccontextmanager

from fastapi import FastAPI, File, HTTPException, Request, UploadFile

ROOT = Path(__file__).resolve().parents[1]
app = FastAPI(title="BOOK.CRAFT Recorder STT")
lock = asyncio.Lock()
WAIT_SECONDS = 330


@asynccontextmanager
async def recognition_slot(request):
    """Wait without starting a second Whisper; cancellation never owns the lock."""
    deadline = time.monotonic() + WAIT_SECONDS
    acquired = False
    try:
        while not acquired:
            if await request.is_disconnected():
                raise HTTPException(499, "Ожидание распознавания отменено.")
            if time.monotonic() >= deadline:
                raise HTTPException(504, "Очередь распознавания занята слишком долго. Повторите позже.")
            try:
                await asyncio.wait_for(lock.acquire(), timeout=.25)
                acquired = True
            except asyncio.TimeoutError:
                pass
        yield
    finally:
        if acquired:
            lock.release()


def runtime():
    config_path = ROOT / ".runtime" / "recorder-stt.json"
    config = json.loads(config_path.read_text(encoding="utf-8-sig")) if config_path.is_file() else {}
    exe = Path(os.getenv("WHISPER_CPP_EXE") or config.get("executable", "tools/whisper/Release/whisper-cli.exe"))
    model = Path(os.getenv("WHISPER_MODEL_PATH") or config.get("model", "tools/whisper/ggml-small.bin"))
    if not exe.is_absolute(): exe = ROOT / exe
    if not model.is_absolute(): model = ROOT / model
    return exe, model


@app.get("/health")
def health():
    exe, model = runtime()
    return {"ready": exe.is_file() and model.is_file(), "busy": lock.locked(), "version": "3.2.1", "model": model.name, "engine": "whisper.cpp", "segment_seconds": 30}


def validate_audio(data):
    try:
        with wave.open(io.BytesIO(data), "rb") as reader:
            duration = reader.getnframes() / reader.getframerate()
            if reader.getnchannels() != 1 or reader.getframerate() != 16000 or reader.getsampwidth() != 2 or not 0 < duration <= 31:
                raise ValueError("Invalid segment")
            if len(reader.readframes(reader.getnframes())) != reader.getnframes() * 2:
                raise ValueError("Truncated PCM")
        return duration
    except (wave.Error, EOFError, ValueError, ZeroDivisionError) as error:
        raise HTTPException(422, "Нужен сегмент WAV: 16 кГц, моно, PCM16, до 30 секунд.") from error


@app.post("/segment")
async def segment(request: Request, audio: UploadFile = File(...)):
    data = await audio.read(1_100_001)
    await audio.close()
    if len(data) > 1_100_000: raise HTTPException(413, "Сегмент слишком большой.")
    duration = validate_audio(data)
    exe, model = runtime()
    if not exe.is_file() or not model.is_file():
        raise HTTPException(503, "Whisper или модель не найдены. Проверьте локальную конфигурацию.")
    async with recognition_slot(request):
        with tempfile.TemporaryDirectory(prefix="bookcraft-recorder-") as folder:
            source = Path(folder) / "segment.wav"
            output = Path(folder) / "result"
            source.write_bytes(data)
            process = None
            started = time.monotonic()
            try:
                process = await asyncio.create_subprocess_exec(
                    str(exe), "-m", str(model), "-f", str(source), "-l", "ru",
                    "-otxt", "-of", str(output), "-t", "4",
                    stdout=asyncio.subprocess.DEVNULL, stderr=asyncio.subprocess.DEVNULL,
                    creationflags=0x08000000 if os.name == "nt" else 0,
                )
                while process.returncode is None:
                    if await request.is_disconnected(): raise HTTPException(499, "Распознавание отменено.")
                    if time.monotonic() - started > 300: raise HTTPException(504, "Whisper не обработал сегмент за 5 минут.")
                    try: await asyncio.wait_for(process.wait(), timeout=.25)
                    except asyncio.TimeoutError: pass
                result = output.with_suffix(".txt")
                if process.returncode or not result.is_file(): raise HTTPException(502, "Whisper завершился с ошибкой. Повторите сегмент.")
                return {"text": result.read_text(encoding="utf-8-sig").strip(), "duration": duration, "elapsed_seconds": round(time.monotonic() - started, 2)}
            except OSError as error:
                raise HTTPException(503, "Не удалось запустить локальный Whisper.") from error
            finally:
                if process and process.returncode is None:
                    process.kill()
                    await process.wait()
