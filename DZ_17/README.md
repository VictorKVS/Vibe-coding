# ДЗ-17 · ALINA Multimodal Creative Producer

> **Тема:** мультимодальность в генеративных нейронных сетях  
> **Реализация:** развитие ALINA / WILD_IDEAS вместо одноразового учебного «AI-Кулинара».

## Цель ДЗ

Собрать работающее веб-приложение, которое демонстрирует **совместную обработку текстового запроса и изображения**.

Учебный минимум:

- загрузка изображения — **обязательна**;
- текстовый запрос — **обязателен**;
- одновременный анализ `image + text` — **обязателен**;
- голос — опционален;
- дизайн, системный промпт и логика могут быть индивидуальными;
- все функции должны быть протестированы;
- для сдачи нужны публичная ссылка, скриншот процесса анализа и краткий отчёт.

---

# Реализованный сценарий

ALINA — AI-продюсер творческих проектов. Пользователь передаёт ей идею и визуальный референс, а ALINA анализирует изображение **в контексте пользовательской задачи**, а не просто описывает картинку.

Рабочий цикл:

```text
TEXT + IMAGE
      ↓
SERVER-SIDE LLM GATEWAY
      ↓
VISION MODEL
      ↓
OBSERVATION
      ↓
INTERPRETATION
      ↓
3 CREATIVE DIRECTIONS
      ↓
HUMAN CONFIRMATION
```

Главный принцип:

```text
OBSERVATION ≠ INTERPRETATION ≠ AUTHOR DECISION
```

---

## Что уже работает в коде

- [x] предыдущая версия ALINA/WILD_IDEAS перенесена в `DZ_17/app`;
- [x] сохранены Research Pack, Story DNA, Project Memory, голос и Model Switcher;
- [x] загрузка JPG / PNG / WEBP;
- [x] ограничение файла на клиенте — 5 МБ;
- [x] preview загруженной картинки;
- [x] удаление и замена изображения;
- [x] текстовый запрос отправляется вместе с изображением;
- [x] отдельная задача `vision` в LLM Gateway;
- [x] серверная валидация входных изображений;
- [x] OpenAI Responses API: `input_text + input_image`;
- [x] OpenAI-compatible vision: `text + image_url`;
- [x] Ollama multimodal: `message.images`;
- [x] отдельные env-настройки для AUTO vision routing;
- [x] DEMO-режим честно сообщает, что pixels не анализирует;
- [x] System Prompt требует отделять наблюдения от творческой интерпретации;
- [x] после анализа в интерфейсе сохраняется исходный `TEXT QUERY` для доказательного скриншота;
- [x] показывается trace модели, latency и тип задачи;
- [x] API-ключи остаются server-side;
- [x] добавлен GitHub Actions build + production health smoke test.

---

## Провайдеры

```text
AUTO
├── OpenAI
├── OpenAI-compatible
├── Ollama
└── DEMO fallback
```

Для мультимодального AUTO можно отдельно указать:

```env
OPENAI_VISION_MODEL=
COMPATIBLE_VISION_MODEL=
OLLAMA_VISION_MODEL=
```

Выбранная модель должна действительно поддерживать изображения.

---

## Структура

```text
DZ_17/
├── README.md
├── REPORT.md
├── SYSTEM_PROMPT_ALINA.md
├── TEST_PLAN.md
├── app/
│   ├── app/
│   │   ├── api/llm/route.ts
│   │   ├── api/health/route.ts
│   │   ├── orbit-studio.tsx
│   │   ├── use-llm.ts
│   │   ├── multimodal.css
│   │   └── ...
│   ├── .env.example
│   ├── package.json
│   └── README.md
└── screenshots/
    └── README.md
```

---

## Локальный запуск

```powershell
cd "G:\1\Vibe coding\DZ_17\app"
npm ci
npm run dev
```

Production-проверка:

```powershell
npm run build
npm start
```

---

# Обязательный тест для сдачи

1. Запустить приложение.
2. Начать диалог с ALINA.
3. Нажать **«Добавить фото»**.
4. Загрузить референс.
5. Ввести:

> Проанализируй этот визуальный референс. Что из него можно использовать в сцене моей книги? Отдели то, что реально видно, от своей творческой интерпретации.

6. Нажать **«Анализировать»**.
7. Проверить, что ответ построен по схеме `наблюдения → интерпретация → 3 направления`.
8. Сделать скриншот, где одновременно видны изображение, `TEXT QUERY`, ответ ALINA и MODEL trace.

---

# Что необходимо сдать

| Требование | Артефакт | Статус |
|---|---|:---:|
| Рабочий код | `DZ_17/app/` | ✅ |
| Загрузка изображения | UI + vision gateway | ✅ код |
| Совместный `image + text` pipeline | `/api/llm`, task `vision` | ✅ код |
| System Prompt | [`SYSTEM_PROMPT_ALINA.md`](SYSTEM_PROMPT_ALINA.md) | ✅ |
| План тестирования | [`TEST_PLAN.md`](TEST_PLAN.md) | ✅ |
| Отчёт | [`REPORT.md`](REPORT.md) | ✅ черновик |
| Реальный vision-прогон | локально/на хостинге | ⏳ |
| Финальный скриншот | `screenshots/dz17-alina-image-text-analysis.png` | ⏳ |
| Public Share/Deploy URL | ссылка для преподавателя | ⏳ |

> Google AI Studio недоступен в текущем окружении пользователя. Реализация поэтому сделана платформенно-независимой: требования ДЗ сохранены, а модель подключается через серверный gateway.

---

## Definition of Done

ДЗ-17 готово к отправке преподавателю, когда:

1. build проходит;
2. приложение открывается;
3. загружается фото;
4. текст и фото действительно обрабатываются vision-моделью совместно;
5. результат виден в интерфейсе;
6. сделан требуемый скриншот;
7. пройден `TEST_PLAN.md`;
8. опубликован доступный URL;
9. ссылка и фактические результаты внесены в `REPORT.md`.

Дальнейшее развитие этого же кода: Narrative Knowledge Base → Visual Identity → continuity → storyboard → animation → voice/video production.
