# DZ-18 — FATHER Content Generator

Статус: `RUNNABLE SHELL + HEYGEN V3 + STRUCTURED LLM`

## Цель

DZ-18 — самостоятельное приложение **FATHER Content Generator**. ALINA Analyst остаётся отдельным аналитическим bounded context и передаёт генератору только проверенный `ResearchPacket` через `shared/contracts`.

```text
ALINA Analyst
      |
      v
ResearchPacket
      |
      v
shared/contracts
      |
      v
ContentBrief
      |
      v
FATHER Content Generator
```

Generator не должен молча менять проверенные факты. Для возврата в аналитику предусмотрены `NEED_RESEARCH`, `CONFLICT_FOUND`, `MISSING_FACT`, `SOURCE_REQUIRED`.

## Что уже работает

- React + TypeScript + Vite application shell;
- Рассылки — local baseline preview;
- Подкасты — local baseline script flow;
- Видео-аватар — server-side HeyGen adapter;
- HeyGen API key остаётся только на backend;
- `GET /v3/avatars` и `GET /v3/voices` нормализуются в наши DTO;
- Comic / Storyboard — F-01 и M-01 через один Persona/Scene Engine;
- responsive UI;
- diagnostics;
- provider unit tests;
- Windows one-click launcher.

## Структура

```text
DZ_18. Integration with external services/
├── server/
│   ├── index.mjs
│   └── providers/
│       ├── heygen.mjs
│       └── heygen.test.mjs
├── src/
│   ├── app/
│   ├── content_generator/
│   │   ├── briefs/
│   │   ├── personas/
│   │   ├── providers/
│   │   ├── scenes/
│   │   └── storyboard/
│   └── shared/
│       └── contracts/
├── .env.example
├── START_DZ18.cmd
├── package.json
└── vite.config.ts
```

## Быстрый запуск Windows

Из проводника можно запустить:

```text
START_DZ18.cmd
```

Или PowerShell:

```powershell
cd "G:\1\Vibe coding\Vibe-coding-router\DZ_18. Integration with external services"
.\START_DZ18.cmd
```

Скрипт сам создаст локальный `.env` из `.env.example` и установит зависимости, если `node_modules` ещё нет.

Web UI:

```text
http://localhost:5188
```

Backend health:

```text
http://localhost:5190/api/health
```

## HeyGen

Для реального списка аватаров/голосов открой локальный `.env`:

```env
HEYGEN_API_KEY=your_key_here
HEYGEN_BASE_URL=https://api.heygen.com
PORT=5190
```

Ключ нельзя добавлять в `VITE_*`: такие значения попадают в browser bundle.

Текущий adapter использует HeyGen v3 и заголовок `X-Api-Key`.

## Проверки

```powershell
npm test
npm run build
```

Production после build:

```powershell
npm run build
npm start
```

## Текущий baseline

- [x] architecture split ALINA Analyst / FATHER Content Generator;
- [x] ResearchPacket / ContentBrief contracts;
- [x] application shell;
- [x] Persona Registry baseline;
- [x] SceneSpec + storyboard planner;
- [x] F-01 / M-01;
- [x] HeyGen server adapter;
- [x] avatars/voices UI wiring;
- [x] .env protection;
- [x] provider tests;
- [ ] проверить реальным HeyGen API key;
- [x] versioned LLM prompt registry;
- [x] server-side structured LLM generation для Newsletter/Podcast;
- [ ] screenshots;
- [ ] deployment;
- [ ] submission evidence matrix.

## Следующий этап

После локального smoke test с реальными `HEYGEN_API_KEY` и `OPENAI_API_KEY`: зафиксировать screenshots, добавить TTS provider для Podcast, затем подготовить deployment и submission evidence matrix.
