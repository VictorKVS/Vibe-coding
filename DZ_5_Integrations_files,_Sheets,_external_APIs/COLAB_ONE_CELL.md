# Google Colab — запуск одной ячейкой

Перед запуском создайте Colab Secrets:

- `TELEGRAM_BOT_TOKEN` (также поддерживается `TG_TOKEN2`)
- `OPENAI_API_KEY`
- `ASSEMBLYAI_API_KEY`
- `GOOGLE_SERVICE_ACCOUNT_JSON`
- `GOOGLE_SHEETS_ID`

Запустите одну ячейку:

```python
import os, sys, subprocess, nest_asyncio

REPO = "/content/Vibe-coding"
PROJECT = f"{REPO}/DZ_5_Integrations_files,_Sheets,_external_APIs"

subprocess.run(["rm", "-rf", REPO], check=False)
subprocess.run(["git", "clone", "https://github.com/VictorKVS/Vibe-coding.git", REPO], check=True)
os.chdir(PROJECT)

subprocess.run([sys.executable, "-m", "pip", "install", "-q", "-r", "requirements.txt", "nest_asyncio>=1.6"], check=True)
subprocess.run(["bash", "-lc", "which ffmpeg >/dev/null || (apt-get update -qq && apt-get install -y -qq ffmpeg)"], check=True)
subprocess.run(["bash", "-lc", "fc-match 'DejaVu Sans' >/dev/null || (apt-get update -qq && apt-get install -y -qq fonts-dejavu-core)"], check=True)

# Проверка картинок GitHub
from src.assets import validate_assets
print("GitHub assets:", validate_assets())

# Запуск long polling в текущем процессе Colab
nest_asyncio.apply()
from src.app import main
import asyncio
asyncio.get_event_loop().run_until_complete(main())
```

Ячейка работает, пока работает Telegram-бот. При остановке ячейки бот останавливается.

## Логика изображений

Рабочий Telegram использует `phone.jpg` как универсальный экран:

- `assets/screens/start/phone.jpg`
- `assets/screens/file_received/phone.jpg`
- `assets/screens/transcription/phone.jpg`
- `assets/screens/analysis/phone.jpg`
- `assets/screens/ready/phone.jpg` (также поддерживается текущее имя `phone.jpg.png`)
- `assets/screens/ai_consultant/phone.jpg`

`tablet.jpg` и `desktop.jpg` остаются для README, защиты и демонстрации кроссплатформенности.
