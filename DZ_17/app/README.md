# ALINA Multimodal + Knowledge Base Analyst · ДЗ-17

Рабочая версия ALINA / WILD_IDEAS для ДЗ-17: **текст + загруженное изображение → совместный мультимодальный анализ**, плюс production-направление **материал → структурированный черновик базы знаний → human review**.

База приложения перенесена из последней рабочей версии `DZ10_31`, после чего добавлены vision-контур, устойчивый LLM Gateway, `ALINA Knowledge Base Analyst` и прямой Model Manager без обязательных LM Studio/GUI-оболочек.

## Что уже реализовано

- загрузка `JPG / PNG / WEBP` до 5 МБ;
- preview изображения;
- `text + image` через серверный `/api/llm`;
- прямой локальный provider **llama.cpp router**;
- прямой внешний provider **GigaChat API**;
- автоматическое получение и обновление GigaChat access token на сервере;
- динамическое обнаружение локальных моделей через `/v1/models`;
- переключатель моделей прямо в UI;
- AUTO-маршрутизация по типу задачи;
- fallback между провайдерами при ошибке AUTO;
- отдельные задачи `dialogue / synthesis / architecture / vision / kb_extract / kb_validate`;
- конфигурация конкретной модели для каждой задачи через `.env.local`;
- OpenAI / OpenAI-compatible / Ollama оставлены как дополнительные providers, но для native local mode они не нужны;
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

## Обычный запуск

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

---

# Native Model Manager: без LM Studio

Основной локальный вариант теперь такой:

```text
ALINA UI
   ↓
/api/llm
   ↓
llama.cpp router
   ↓
./models/*.gguf
```

`llama.cpp` умеет работать в router mode: сервер запускается с `--models-dir`, публикует список моделей через `/v1/models` и загружает нужную модель по `model` в запросе. Поэтому пользователь выбирает модель **в интерфейсе ALINA**, а не в отдельной Studio-программе.

## Структура локальных файлов

```text
DZ_17/app/
├── runtime/
│   └── llama/
│       └── llama-server.exe
├── models/
│   ├── text-model-q4.gguf
│   └── vision-model/
│       ├── vision-model.gguf
│       └── mmproj-....gguf
└── .env.local
```

`runtime/llama/` и `models/` находятся в `.gitignore`; бинарники и веса моделей в GitHub не попадают.

## Запуск ALINA вместе с локальными моделями

После размещения `llama-server.exe` и GGUF-моделей:

```bash
npm run dev:models
```

Скрипт `scripts/run-with-models.mjs`:

1. читает `.env.local`;
2. проверяет, не запущен ли уже local router;
3. при необходимости запускает `llama-server.exe --models-dir ...`;
4. ждёт `/health`;
5. запускает приложение;
6. при завершении приложения останавливает поднятый им local router.

Если локальный runtime ещё не установлен, приложение всё равно стартует и может использовать GigaChat или другой настроенный provider.

### Базовая конфигурация

```env
ALINA_PROVIDER_ORDER=llamacpp,gigachat,demo

LLAMA_AUTOSTART=1
LLAMA_SERVER_BIN=runtime/llama/llama-server.exe
LLAMA_MODELS_DIR=models
LLAMA_HOST=127.0.0.1
LLAMA_PORT=8081
LLAMA_BASE_URL=http://127.0.0.1:8081
LLAMA_CTX_SIZE=8192
LLAMA_PARALLEL=1
LLAMA_GPU_LAYERS=99
```

Для RTX 3060 12 ГБ базовый профиль оставляет `LLAMA_PARALLEL=1`: один тяжёлый GPU worker одновременно.

## Переключение локальных моделей

После старта router ALINA сама получает список моделей из:

```text
GET http://127.0.0.1:8081/v1/models
```

В Model Switcher появляются пункты:

```text
AUTO · умный роутинг
LOCAL · <model A>
LOCAL · <model B>
GigaChat · <доступная модель>
...
```

Ручной выбор фиксирует конкретную модель. `AUTO` выбирает модель по задаче.

Для привязки конкретной модели к роли используются только имена моделей, код менять не нужно:

```env
LLAMA_DIALOGUE_MODEL=
LLAMA_SYNTHESIS_MODEL=
LLAMA_ARCHITECTURE_MODEL=
LLAMA_KB_MODEL=
LLAMA_KB_VALIDATE_MODEL=
LLAMA_VISION_MODEL=
```

Для vision-модели её exact model id нужно указать явно в `LLAMA_VISION_MODEL` или `LLAMA_VISION_MODELS`. Это не позволяет ALINA ошибочно считать любую текстовую GGUF-модель мультимодальной.

---

# GigaChat напрямую из программы

Отдельная Studio/клиент также не нужен:

```text
ALINA SERVER
   ↓ OAuth
GigaChat access token
   ↓
https://api.giga.chat/v1/models
https://api.giga.chat/v1/chat/completions
```

В `.env.local` хранится только Authorization key:

```env
GIGACHAT_AUTH_KEY=
GIGACHAT_SCOPE=GIGACHAT_API_PERS
GIGACHAT_BASE_URL=https://api.giga.chat
GIGACHAT_OAUTH_URL=https://ngw.devices.sberbank.ru:9443/api/v2/oauth
```

Access token получает сервер ALINA и автоматически обновляет до истечения его срока. Значение ключа и access token во frontend не передаются.

Доступные generation-модели GigaChat обнаруживаются через API и автоматически появляются в том же Model Switcher.

Можно закрепить модели по ролям:

```env
GIGACHAT_DIALOGUE_MODEL=
GIGACHAT_SYNTHESIS_MODEL=
GIGACHAT_ARCHITECTURE_MODEL=
GIGACHAT_KB_MODEL=
GIGACHAT_KB_VALIDATE_MODEL=
```

Если для TLS в локальной Windows-среде требуется дополнительный корневой сертификат, его путь задаётся через стандартный `NODE_EXTRA_CA_CERTS` в локальном окружении; отключение проверки TLS в код не закладывается.

---

# AUTO routing

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
llama.cpp local model
    ↓ error / no suitable model
GigaChat
    ↓ error
optional provider
    ↓
DEMO
```

Рекомендуемый production-local порядок:

```env
ALINA_PROVIDER_ORDER=llamacpp,gigachat,demo
```

При необходимости можно вернуть дополнительные providers одной строкой:

```env
ALINA_PROVIDER_ORDER=llamacpp,gigachat,openai,compatible,ollama,demo
```

---

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
- локальный llama.cpp слушает `127.0.0.1`, а не внешний интерфейс;
- изображения проходят через backend gateway;
- сервер ограничивает число изображений и размер data URL;
- `DEMO` не выдаёт фиктивный vision-анализ за настоящий;
- автоматически извлечённые элементы KB не становятся каноном без подтверждения автора;
- локальные GGUF-веса и `llama-server.exe` исключены из Git;
- локальный review не подменяет будущую серверную транзакционную фиксацию канона.

## Связанные материалы

- [`../README.md`](../README.md) — карточка ДЗ-17;
- [`../SYSTEM_PROMPT_ALINA.md`](../SYSTEM_PROMPT_ALINA.md) — правила ALINA;
- [`../TEST_PLAN.md`](../TEST_PLAN.md) — тест-план;
- [`../REPORT.md`](../REPORT.md) — текст для отчётности;
- [`../ANALYST_ZOO_CAPACITY.md`](../ANALYST_ZOO_CAPACITY.md) — расчёт локального Tool Zoo / Analysis Zoo.
