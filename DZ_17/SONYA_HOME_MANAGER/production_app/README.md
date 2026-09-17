# SONYA Home Manager · Flagship Local

Локально запускаемая версия текущей flagship SONYA. Она повторяет живую product-версию по интерфейсу, Design Admin, terminal ticker, hero rotation, голосовому режиму и мультимодальному сценарию, но для AI использует локальный Ollama.

## Быстрый запуск

Требования:

- Windows 10/11;
- Node.js 20+;
- Ollama;
- модель `llava:7b` в Ollama.

```powershell
Set-Location -LiteralPath "G:\1\Vibe coding\Vibe-coding\DZ_17\SONYA_HOME_MANAGER\production_app"
npm install
ollama list
npm run dev
```

Открыть:

```text
http://localhost:5173
```

Локальный API:

```text
http://127.0.0.1:8787/api/_healthcheck
```

## Переменные среды

По умолчанию:

```text
SONYA_OLLAMA_BASE_URL=http://127.0.0.1:11434
SONYA_VISION_MODEL=llava:7b
SONYA_LOCAL_API_PORT=8787
```

При необходимости в PowerShell перед запуском:

```powershell
$env:SONYA_VISION_MODEL="llava:7b"
$env:SONYA_OLLAMA_BASE_URL="http://127.0.0.1:11434"
npm run dev
```

## Что работает локально

- flagship glassmorphism UI;
- terminal ticker;
- Design Admin;
- Blue / Aqua / Violet / Emerald / Sunset;
- ручной Hue;
- Glow / Glass / Motion;
- автосмена hero-кадров;
- задержка и скорость transition;
- random / sequential hero;
- pause on hover;
- загрузка фото;
- `image + text` анализ через Ollama;
- режимы «Хочу такое» и «Что у меня есть»;
- голосовая озвучка браузером;
- пошаговый режим готовки;
- праздник и покупки;
- mobile / tablet / desktop responsive layout.

## Важно

Публичная production-версия использует платформенный AI backend. Локальная версия использует Ollama и поэтому качество структурированного JSON зависит от выбранной локальной vision-модели.

## Документация

- [`../docs/LOCAL_RUN.md`](../docs/LOCAL_RUN.md)
- [`../docs/ARCHITECTURE.md`](../docs/ARCHITECTURE.md)
- [`../docs/DESIGN_ADMIN.md`](../docs/DESIGN_ADMIN.md)
- [`../docs/CONTENT_LIBRARY.md`](../docs/CONTENT_LIBRARY.md)
- [`../docs/TEST_PLAN.md`](../docs/TEST_PLAN.md)

## Контент

Фирменные изображения, коллажи, блюда, продукты и сцены праздников будут храниться в [`../content/`](../content/).
