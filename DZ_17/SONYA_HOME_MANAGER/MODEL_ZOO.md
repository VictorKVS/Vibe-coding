# СОНЯ · Model Zoo

## Решение для MVP

Для первой рабочей версии ДЗ-17 используем **минимальный зоопарк**, а не много моделей одновременно.

### 1. Основная локальная мультимодальная модель

**Qwen2.5-VL-7B-Instruct · Q4_K_M · llama.cpp / libmtmd**

Роль:

- `image + text`;
- распознавание содержимого изображения;
- анализ продуктов / праздничного стола / комнаты / декора;
- структурированный JSON для UI;
- обычный текстовый диалог Сони.

Почему первой:

- одна модель закрывает обязательный multimodal-сценарий ДЗ-17;
- официально поддерживается мультимодальным стеком llama.cpp;
- 7B Q4 — разумный класс для локального ПК с RTX 3060 12 GB;
- не требует отдельного облачного vision API для демонстрации.

Принцип запуска:

```text
llama-server
  + model GGUF
  + mmproj GGUF
  ↓
OpenAI-compatible /chat/completions
```

### 2. Внешний fallback / сильный аналитический слой

**GigaChat** — опционально через server-side env.

Роль:

- длинное планирование;
- праздничный сценарий;
- альтернативные варианты;
- более глубокая синтезация плана.

Для обязательного vision-теста облачный fallback не должен подменять отсутствие image-capable модели незаметно. UI обязан показывать фактически использованный provider/model.

### 3. Голос — этап 2, не блокирует сдачу

Варианты:

- локальный ASR: Qwen3-ASR / Whisper-compatible runtime;
- TTS — отдельный лёгкий сервис.

Голос в исходном ДЗ опционален, поэтому не включаем его в критический путь первой сдачи.

### 4. Embeddings / память — этап 2

Для персонального профиля семьи сначала достаточно SQLite/PostgreSQL + явных полей:

```text
family_member
preferences
allergies
food_goals
favorite_dishes
cooking_time_windows
events
shopping_items
fridge_items
bills
```

Embedding/RAG добавляется только когда появится заметный объём истории и документов.

---

# Физические движки vs роли

СОНЯ может иметь много ролей без запуска многих моделей:

```text
1 × Multimodal LLM
    ├── Sonya Vision
    ├── Sonya Cook
    ├── Sonya Event Planner
    ├── Sonya Shopping
    ├── Sonya Home
    └── Sonya Family Assistant

+ deterministic tools
    ├── calculator
    ├── checklist/state machine
    ├── budget
    ├── calendar dates
    ├── fridge inventory
    └── shopping list
```

То есть «зоопарк» сначала строится **из ролей и инструментов**, а не из 10 загруженных LLM.

---

# Маршрутизация

```text
TASK=image+text
→ LOCAL_VISION_MODEL

TASK=quick_chat
→ LOCAL_VISION_MODEL (text-only call)

TASK=deep_plan
→ GigaChat if enabled
→ otherwise LOCAL_VISION_MODEL

TASK=budget/checklist/date
→ deterministic tool first
→ LLM only for explanation
```

---

# ENV

```env
SONYA_PROVIDER_ORDER=llamacpp,gigachat,demo
LLAMA_BASE_URL=http://127.0.0.1:8080/v1
LLAMA_VISION_MODEL=
GIGACHAT_AUTH_KEY=
GIGACHAT_MODEL=
```

Секреты не хранить в Git.

---

# Следующий кандидат после MVP

После фактического замера VRAM/latency можно сравнить:

- Qwen2.5-VL-7B;
- Gemma 4 E4B multimodal;
- MiniCPM-V 4.6;
- другую Qwen3-VL-compatible сборку, если стабильна в используемой версии llama.cpp.

Выбор второй модели делаем по телеметрии, а не по названию:

```text
vision accuracy
Russian answer quality
latency
VRAM peak
RAM peak
tokens/sec
failure rate
```
