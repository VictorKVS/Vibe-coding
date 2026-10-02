import importlib.util

modules = {
    "faster_whisper": "VOICE IN / STT",
    "TTS": "XTTS",
    "piper": "PIPER TTS",
    "pyttsx3": "WINDOWS TTS",
}

for module, title in modules.items():
    found = importlib.util.find_spec(module) is not None
    status = "READY" if found else "NOT INSTALLED"
    print(f"{title:<22} {status}")
