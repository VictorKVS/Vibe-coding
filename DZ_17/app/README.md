# ALINA Multimodal · ДЗ-17

Рабочая версия ALINA / WILD_IDEAS для ДЗ-17: **текст + загруженное изображение → совместный мультимодальный анализ**.

База приложения перенесена из последней рабочей версии `DZ10_31`, после чего добавлен отдельный vision-контур для ДЗ-17.

## Что уже реализовано

- загрузка `JPG / PNG / WEBP` до 5 МБ;
- preview изображения в интерфейсе;
- одновременная отправка текста и изображения в серверный `/api/llm`;
- OpenAI Responses API: `input_text + input_image`;
- OpenAI-compatible vision: `text + image_url`;
- Ollama multimodal: `message.images` для моделей, которые поддерживают vision;
- `DEMO` fallback честно сообщает, что pixels не анализируются;
- системное правило ALINA: `OBSERVATION → INTERPRETATION`, без выдумывания невидимых деталей;
- Model Switcher;
- голосовой ввод текста;
- Project Memory, Research Pack и Story DNA из предыдущего этапа;
- API-ключи остаются только на сервере.

## Запуск

```bash
npm ci
npm run dev
```

Node.js >= 22.13.

Проверка production build:

```bash
npm run build
npm start
```

## Настройка модели

Скопируйте `.env.example` в `.env.local` и настройте один из провайдеров.

### OpenAI

```env
OPENAI_API_KEY=...
OPENAI_MODELS=gpt-5.6-luna,gpt-5.6-terra,gpt-5.6-sol
```

### OpenAI-compatible

```env
COMPATIBLE_BASE_URL=https://provider.example/api/v1
COMPATIBLE_API_KEY=...
COMPATIBLE_MODELS=vision-model
COMPATIBLE_LABEL=My Gateway
```

Для реального анализа изображения выбранная compatible-модель должна поддерживать формат OpenAI vision `image_url`.

### Ollama

```env
OLLAMA_BASE_URL=http://127.0.0.1:11434
OLLAMA_MODELS=your-vision-model
```

Выбранная Ollama-модель должна поддерживать изображения.

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

ALINA не должна превращать собственную интерпретацию изображения в канон автоматически.

## Тест для скриншота ДЗ

1. Открыть приложение и начать диалог с ALINA.
2. Нажать `Добавить фото`.
3. Загрузить тестовый визуальный референс.
4. Ввести, например:

> Проанализируй этот визуальный референс. Что из него можно использовать в сцене моей книги? Отдели то, что реально видно, от твоей творческой интерпретации.

5. Нажать `Анализировать`.
6. Сделать скриншот, где одновременно видны:
   - загруженное изображение;
   - текстовый запрос;
   - ответ ALINA;
   - trace выбранной модели.

## Безопасность

- реальные API keys не коммитятся;
- ключ не отправляется в frontend;
- изображения передаются через backend gateway;
- сервер ограничивает число изображений и размер data URL;
- неподдерживаемые типы файла отбрасываются ещё в UI;
- `DEMO` не выдаёт фиктивный vision-анализ за настоящий.

## Связанные материалы

- [`../README.md`](../README.md) — карточка ДЗ-17;
- [`../SYSTEM_PROMPT_ALINA.md`](../SYSTEM_PROMPT_ALINA.md) — правила ALINA;
- [`../TEST_PLAN.md`](../TEST_PLAN.md) — тест-план;
- [`../REPORT.md`](../REPORT.md) — текст для отчётности.
