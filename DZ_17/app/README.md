# ALINA Multimodal + Knowledge Base Analyst · ДЗ-17

Рабочая версия ALINA / WILD_IDEAS для ДЗ-17: **текст + загруженное изображение → совместный мультимодальный анализ**, плюс production-направление **материал → структурированный черновик базы знаний → human review**.

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
- KB Analyst: текст → entities / facts / relationships / timeline / knowledge states / plot threads / visual requirements / open questions;
- **KB Analyst v2: текст + изображение → vision observation → structured KB**;
- отдельный видимый блок `VISION OBSERVATION`, который не считается каноном;
- item-level review: `proposed / approved / rejected`;
- массовое авторское подтверждение всех неотклонённых элементов;
- локальное сохранение черновика аналитика между перезагрузками;
- отдельная LLM-проверка KB на противоречия;
- экспорт draft/approved KB в JSON;
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

## ALINA Knowledge Base Analyst v2

На главной странице есть отдельная кнопка `KB Analyst`.

Для текста:

```text
RAW IDEA
  ↓
KB EXTRACT MODEL
  ↓
ALINA KB v1 JSON
```

Для мультимодального материала:

```text
TEXT + IMAGE
  ↓
VISION MODEL
  ↓
OBSERVATION
  ↓
KB EXTRACT MODEL
  ↓
ALINA KB v1
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
HUMAN REVIEW
  ├── approve
  ├── reject
  └── keep proposed
  ↓
KB VALIDATOR
  ↓
EXPORT JSON
```

Принцип: **OBSERVATION ≠ FACT ≠ CANON**. Результат vision-модели отображается отдельно и не становится утверждённым знанием мира автоматически.

Текущий `AUTHOR APPROVED` — локальный прототип human-in-the-loop. Следующий production-этап — PostgreSQL/pgvector Narrative KB с provenance, версиями, транзакционным approval workflow и связями между вселенными/сериями/книгами.

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
INTERPRETATION / STRUCTURED EXTRACTION
  ↓
VISIBLE ALINA RESPONSE
  ↓
AUTHOR CONFIRMATION
```

Этот поток закрывает учебную мультимодальность, а аналитик расширяет её: результат можно не только прочитать, но и превратить в повторно используемый слой знаний.

## Тест для скриншота ДЗ

Можно использовать обычный диалог ALINA или KB Analyst v2. Для аналитика особенно наглядно:

1. открыть `KB Analyst`;
2. добавить фото;
3. ввести текстовую задачу;
4. нажать `Анализировать текст + фото`;
5. дождаться `VISION OBSERVATION` и `DRAFT KB`;
6. сделать скриншот, где одновременно видны изображение, текст, мультимодальный результат и структурированные элементы KB.

## Безопасность

- реальные API keys не коммитятся;
- ключ не отправляется во frontend;
- изображения проходят через backend gateway;
- сервер ограничивает число изображений и размер data URL;
- `DEMO` не выдаёт фиктивный vision-анализ за настоящий;
- автоматически извлечённые элементы KB не становятся каноном без подтверждения автора;
- локальный review не подменяет будущую серверную транзакционную фиксацию канона.

## Связанные материалы

- [`../README.md`](../README.md) — карточка ДЗ-17;
- [`../SYSTEM_PROMPT_ALINA.md`](../SYSTEM_PROMPT_ALINA.md) — правила ALINA;
- [`../TEST_PLAN.md`](../TEST_PLAN.md) — тест-план;
- [`../REPORT.md`](../REPORT.md) — текст для отчётности.
