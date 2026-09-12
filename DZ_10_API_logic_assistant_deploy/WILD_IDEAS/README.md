# WILD_IDEAS

Актуальный пилот «Дикие идеи → в деньги» для задания 10.

[Сайт](https://wild-ideas-pilot.cocmosxx2.chatgpt.site/) · [Описание задания и запуск](../README.md) · [Статус](../STATUS.md)

## Запуск

```bash
npm ci
npm run dev
```

Node.js >= 22.13. Сборка: `npm run build`.

## Agent Zoo

Алина развивается не как один огромный system prompt, а как управляемый зоопарк ролей:

`Alina Orchestrator → Router → Specialist → Zoo RAG → Prompt assembly → LLM Gateway → Trace`.

Первый состав:

- `alina_orchestrator`;
- `research_analyst`;
- `knowledge_growth_analyst`;
- `prompt_engineer`;
- `narrative_architect`;
- `skeptical_reviewer`.

Реестр ролей: `knowledge/zoo/agents.json`. База знаний самого зоопарка: `knowledge/zoo/knowledge.json`. Архитектура и ограничения: [`AGENT_ZOO_ARCHITECTURE.md`](./AGENT_ZOO_ARCHITECTURE.md).

Каждый ответ `/api/llm` может возвращать trace: `agentId`, `promptId`, `promptVersion`, `knowledgeRefs`, модель/provider, task class, latency и причину маршрутизации.

## Model Lab — заменяем модели и сравниваем

После локального запуска откройте:

`http://127.0.0.1:3000/model-lab`

Если dev-сервер выбрал другой порт — используйте его.

Model Lab позволяет:

- выбрать конкретного агента Zoo;
- выбрать `dialogue / synthesis / architecture`;
- выбрать до 4 доступных моделей;
- прогнать через них **один и тот же** запрос;
- сравнить ответы рядом;
- увидеть latency, provider/model, usage, prompt version, knowledge refs и routing trace;
- использовать готовые повторяемые кейсы из `knowledge/zoo/model-eval-cases.json` или свой запрос.

Эксперименты никогда не запускаются автоматически. Реальный provider может тарифицировать каждый запрос. Правила сравнения и promotion: [`MODEL_EXPERIMENT_PROTOCOL.md`](./MODEL_EXPERIMENT_PROTOCOL.md).

Главный принцип: не ищем «лучшую модель вообще». Выбираем модель для конкретной роли и класса задач по схеме:

`hard constraints → eval quality → failures/regressions → latency/usage/cost → reviewed promotion`.

## LLM Gateway

В пилот добавлен серверный `/api/llm`: API-ключи не передаются в браузер. Интерфейс Алины получает список доступных моделей с сервера и позволяет переключать модель прямо во время работы.

Поддерживаются:

- `AUTO` — маршрутизация по типу задачи;
- OpenAI Responses API;
- любой OpenAI-compatible `/chat/completions` endpoint (OpenRouter, LM Studio, vLLM, корпоративный gateway и т. п.);
- Ollama;
- `DEMO` fallback без API-ключа, чтобы интерфейс не ломался на показе.

Для OpenAI в AUTO заложена схема: dialogue → `gpt-5.6-luna`, synthesis → `gpt-5.6-terra`, architecture → `gpt-5.6-sol`. Если нужной модели нет в `OPENAI_MODELS`, используется первая разрешённая модель.

### Локальная настройка

Скопируйте `.env.example` в `.env.local` и заполните только нужный провайдер:

```env
OPENAI_API_KEY=...
OPENAI_MODELS=gpt-5.6-luna,gpt-5.6-terra,gpt-5.6-sol
```

или OpenAI-compatible:

```env
COMPATIBLE_BASE_URL=https://provider.example/api/v1
COMPATIBLE_API_KEY=...
COMPATIBLE_MODELS=model-a,model-b
COMPATIBLE_LABEL=My Gateway
```

или Ollama:

```env
OLLAMA_BASE_URL=http://127.0.0.1:11434
OLLAMA_MODELS=qwen3:8b,llama3.1:8b
```

После изменения env перезапустите `npm run dev`. Реальные ключи никогда не коммитить. Для опубликованной версии задавайте их через переменные окружения/секреты хостинга.

## Текущий demo flow

`Идея → Research Pack → Story DNA → Мир → Герои → Согласование → 20 страниц`.

Первичный диалог уже может идти через выбранную LLM; оркестратор этапов, исследования, Narrative Library и Project Memory остаются отдельными слоями. Это намеренно: модель формулирует и объясняет, но не получает право самовольно менять подтверждённые пользователем решения.

Изображения миров и персонажей в MVP — заранее подготовленные концепты. Генератор комикса и приём заказов пока не подключены.
