<h1 align="center">🧠 ДИКИЕ ИДЕИ → В ДЕНЬГИ</h1>
<p align="center"><strong>ДЗ-10 · вариант 31 · AI-продюсер Алина + Research + Story DNA + LLM Gateway</strong></p>
<p align="center">React / vinext · voice UI · Project Memory · multi-model LLM gateway</p>

[← Все работы](../README.md) · [Исходники WILD_IDEAS](../../DZ_10_API_logic_assistant_deploy/WILD_IDEAS/README.md)

## Демонстрация

**CI:** базовый вариант `dz10_31` проходил `npm ci` + `npm run build`; текущая интегрированная ветка дополнительно содержит Agent Zoo, Zoo RAG, Quest Arena, maturity gates, локальные модели и GigaChat.

**Публикация:** контейнерный запуск подготовлен (`Dockerfile`, `/api/health`). Публичный URL добавляется после финального запуска на хостинге.

## Что показывает вариант 31

Это не обычный чат-генератор. Алина ведёт пользователя по управляемому creative-production workflow:

`Идея → Research Pack → Story DNA → Мир → Герои → Согласование → 20 страниц`

Пользователь говорит или печатает идею, подтверждает ключевые решения и может менять направление. Подтверждённые элементы хранятся отдельно от истории диалога.

## Интегрированный слой Agent Zoo

Текущая ветка развивает исходный вариант дальше:

`User → Alina Orchestrator → Router → Specialist → Zoo RAG → Prompt assembly → LLM Gateway → Trace`.

Добавлены профессиональные роли, Prompt/Context Engineer, Knowledge Growth Analyst, Quest Arena, Model Lab, maturity `ZM0–ZM5`, durable run records и сравнение локальных/внешних моделей.

## Project Memory и границы

Research/Narrative слои объясняют выбор, но не обещают коммерческий результат. Подтверждённые пользователем Story DNA решения не должны молча переписываться агентами. Model output и retrieved context не становятся verified knowledge автоматически.

## Запуск

```powershell
cd "DZ_10_API_logic_assistant_deploy\WILD_IDEAS"
npm ci
Copy-Item .env.example .env.local
npm run dev
```

Без ключей приложение сохраняет демонстрационный режим. Для реальных LLM переменные окружения задаются локально или через secrets хостинга.

## Материалы сдачи

- исходники: `DZ_10_API_logic_assistant_deploy/WILD_IDEAS`;
- исходная параллельная ветка: `dz10_31`;
- текущий интегрированный контур: `feature/alina-agent-zoo-rag`;
- контейнер: `DZ_10_API_logic_assistant_deploy/WILD_IDEAS/Dockerfile`;
- health check: `/api/health`;
- сценарий записи: [demo/RECORDING_SCRIPT.md](demo/RECORDING_SCRIPT.md);
- deployment notes: [DEPLOY.md](DEPLOY.md).
