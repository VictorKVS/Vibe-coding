# ALINA Multimodal + Knowledge Base Analyst · ДЗ-17

Рабочая версия ALINA / WILD_IDEAS для ДЗ-17: **текст + загруженное изображение → совместный мультимодальный анализ**, плюс первый production-контур **идея → структурированный черновик базы знаний**.

База приложения перенесена из последней рабочей версии `DZ10_31`, после чего добавлены vision-контур, устойчивый LLM Gateway и режим `ALINA Knowledge Base Analyst`.

## Что уже реализовано

- загрузка `JPG / PNG / WEBP` до 5 МБ;
- preview изображения;
- `text + image` через серверный `/api/llm`;
- OpenAI Responses API;
- OpenAI-compatible `/chat/completions`;
- Ollama;
- `DEMO` fallback;
- переключатель моделей прямо в UI;
- AUTO-маршрутизация по типу задачи;
- fallback между провайдерами при ошибке AUTO;
- отдельные задачи `dialogue / synthesis / architecture / vision / kb_extract / kb_validate`;
- конфигурация конкретной модели для каждой задачи через `.env.local`;
- KB Analyst: идея → entities / facts / relationships / timeline / knowledge states / plot threads / visual requirements / open questions;
- все извлечённые знания получают статус `proposed`;
- отдельная LLM-проверка черновика KB на противоречия;
- экспорт черновика KB в JSON;
- голосовой ввод текста;
- Project Memory, Research Pack и Story DNA;
- API-ключи остаются только на сервере.

## Запуск

```bash
npm ci
npm run dev
```

Node.js >= 22.13.

Production check:

```bash
npm run build
npm start
```

## Как менять модели без изменения кода

Скопируйте `.env.example` в `.env.local`.

Главный переключатель порядка провайдеров:

```env
ALINA_PROVIDER_ORDER=openai,compatible,ollama,demo
```

AUTO берёт подходящую модель для конкретной задачи. Если провайдер завершился ошибкой, AUTO пробует следующий доступный провайдер.

### OpenAI

```env
OPENAI_API_KEY=...
OPENAI_MODELS=model-fast,model-balanced,model-deep,model-vision
OPENAI_DIALOGUE_MODEL=model-fast
OPENAI_SYNTHESIS_MODEL=model-balanced
OPENAI_ARCHITECTURE_MODEL=model-deep
OPENAI_KB_MODEL=model-balanced
OPENAI_KB_VALIDATE_MODEL=model-deep
OPENAI_VISION_MODEL=model-vision
```

### OpenAI-compatible

```env
COMPATIBLE_BASE_URL=https://provider.example/api/v1
COMPATIBLE_API_KEY=...
COMPATIBLE_MODELS=model-a,model-b,vision-model
COMPATIBLE_LABEL=My Gateway
COMPATIBLE_DIALOGUE_MODEL=model-a
COMPATIBLE_SYNTHESIS_MODEL=model-b
COMPATIBLE_ARCHITECTURE_MODEL=model-b
COMPATIBLE_KB_MODEL=model-b
COMPATIBLE_KB_VALIDATE_MODEL=model-b
COMPATIBLE_VISION_MODEL=vision-model
```

### Ollama

```env
OLLAMA_BASE_URL=http://127.0.0.1:11434
OLLAMA_MODELS=local-fast,local-deep,local-vision
OLLAMA_DIALOGUE_MODEL=local-fast
OLLAMA_SYNTHESIS_MODEL=local-deep
OLLAMA_ARCHITECTURE_MODEL=local-deep
OLLAMA_KB_MODEL=local-deep
OLLAMA_KB_VALIDATE_MODEL=local-deep
OLLAMA_VISION_MODEL=local-vision
```

Важно: `*_VISION_MODEL` задаётся явно, чтобы приложение не делало вид, будто любая текстовая модель умеет анализировать изображения.

## AUTO routing

```text
USER REQUEST
    ↓
TASK CLASS
    ├── dialogue
    ├── synthesis
    ├── architecture
    ├── vision
    ├── kb_extract
    └── kb_validate
    ↓
ALINA_PROVIDER_ORDER
    ↓
provider-specific *_MODEL
    ↓
MODEL CALL
    ↓ error
NEXT PROVIDER
```

Ручной выбор модели отключает fallback: пользователь явно фиксирует конкретную модель для теста или сравнения.

## ALINA Knowledge Base Analyst

На главной странице есть отдельная кнопка `KB Analyst`.

Workflow:

```text
RAW IDEA
  ↓
KB EXTRACT MODEL
  ↓
ALINA KB v1 JSON
  ├── project
  ├── entities
  ├── facts
  ├── relationships
  ├── timeline
  ├── knowledge_states
  ├── plot_threads
  ├── visual_requirements
  ├── open_questions
  └── conflicts
  ↓
KB VALIDATOR
  ↓
ISSUES / QUESTIONS / RECOMMENDED CHANGES
  ↓
AUTHOR APPROVAL — следующий этап
```

На этом этапе аналитик **не пишет в канон**. Он создаёт только `proposed`-слой. Следующий production-этап — PostgreSQL/pgvector Narrative KB с provenance и human approval workflow.

## Мультимодальный flow ДЗ-17

```text
PHOTO
  +
TEXT QUERY
  ↓
/server /api/llm
  ↓
VISION MODEL
  ↓
OBSERVATION
  ↓
INTERPRETATION IN PROJECT CONTEXT
  ↓
ALINA RESPONSE
  ↓
AUTHOR CONFIRMATION
```

ALINA не превращает собственную интерпретацию изображения в канон автоматически.

## Тест для скриншота ДЗ

1. Открыть приложение и начать диалог с ALINA.
2. Нажать `Добавить фото`.
3. Загрузить тестовый визуальный референс.
4. Ввести, например:

> Проанализируй этот визуальный референс. Что из него можно использовать в сцене моей книги? Отдели то, что реально видно, от твоей творческой интерпретации.

5. Нажать `Анализировать`.
6. Сделать скриншот, где одновременно видны изображение, текстовый запрос, ответ ALINA и trace выбранной модели.

## Безопасность

- реальные API keys не коммитятся;
- ключ не отправляется во frontend;
- изображения проходят через backend gateway;
- сервер ограничивает число изображений и размер data URL;
- `DEMO` не выдаёт фиктивный vision-анализ за настоящий;
- автоматически извлечённые элементы KB не становятся каноном без подтверждения автора.

## Связанные материалы

- [`../README.md`](../README.md) — карточка ДЗ-17;
- [`../SYSTEM_PROMPT_ALINA.md`](../SYSTEM_PROMPT_ALINA.md) — правила ALINA;
- [`../TEST_PLAN.md`](../TEST_PLAN.md) — тест-план;
- [`../REPORT.md`](../REPORT.md) — текст для отчётности.
