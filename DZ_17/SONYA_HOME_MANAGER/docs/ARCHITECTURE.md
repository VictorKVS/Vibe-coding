# ARCHITECTURE · SONYA Home Manager

## Контуры проекта

В репозитории сохраняются два независимых контура:

```text
SONYA_HOME_MANAGER/
├── app/                # ранний Next.js / Ollama экспериментальный контур
└── production_app/     # flagship React/Vite локальная копия product UI
```

Публичная версия развернута отдельно и использует platform AI backend.

## Flagship local architecture

```text
Browser :5173
   │
   ├── React 19 + Vite
   ├── Glass UI / responsive layout
   ├── Design Admin
   ├── Terminal ticker
   ├── Web Speech API
   └── client image resize
   │
   ▼
Vite proxy /api/*
   │
   ▼
Node local API :8787
   │
   ▼
Ollama :11434
   │
   └── llava:7b (default)
```

## Мультимодальный pipeline

```text
IMAGE + TEXT + FAMILY CONTEXT
            ↓
client resize <=1600 px / <=2 MP
            ↓
POST /api/analyze
            ↓
local-server.mjs
            ↓
Ollama /api/chat + image
            ↓
structured JSON target
            ↓
OBSERVATION / ASSUMPTIONS / PREPARATION
MENU / SHOPPING / SAFETY
            ↓
React UI + optional voice narration
```

## Основные компоненты

### `src/App.tsx`

Содержит:

- основной UI;
- hero rotation;
- Design Admin;
- terminal ticker;
- мультимодальный сценарий;
- voice narration;
- cooking coach;
- plan / shopping views.

### `src/local-platform.ts`

Локальная замена platform client SDK:

- `api.post()` через обычный fetch;
- client-side image resize/compression;
- преобразование изображения в base64.

### `local-server.mjs`

Локальный backend:

- `GET /api/_healthcheck`;
- `POST /api/analyze`;
- вызов Ollama;
- нормализация ответа в UI-схему.

### `src/styles.css`

Содержит:

- glassmorphism;
- responsive layout;
- hero;
- cards;
- SONYA mascot;
- terminal ticker;
- Design Admin;
- desktop/tablet/mobile breakpoints.

## Разделение ответственности

```text
UI presentation      -> React + CSS
Local design config  -> localStorage
Voice                 -> Web Speech API
Image preprocessing  -> browser canvas
AI transport          -> local-server.mjs
Vision model          -> Ollama
Product assets        -> content/
```

## Ограничения локального контура

- настройки Design Admin локальны для браузера;
- нет пользовательской аутентификации;
- нет серверной БД для inventory/settings;
- нет реальных заказов/платежей;
- качество JSON зависит от локальной vision-модели;
- content library пока заполняется отдельно.

## Следующие архитектурные шаги

1. вынести hero/content manifest в JSON;
2. server-side Design Settings;
3. persistent household inventory;
4. до 10 фото блюд в одном меню;
5. menu optimizer;
6. ingredient normalization g/kg/ml/l/pcs;
7. kitchen runbook + dependencies;
8. marketplace adapters с обязательным human confirmation;
9. PWA → Android wrapper.
