# ДЗ-17 · ALINA Multimodal Creative Producer

**Мультимодальный анализ: текст + изображение → наблюдение → интерпретация → три направления → выбор автора.**

## Что проверяется

- загрузка изображения;
- совместный анализ изображения и текстового запроса;
- стабильный мультимодальный интерфейс;
- отделение наблюдений от интерпретации;
- human-in-the-loop: ключевое решение остаётся за пользователем.

## Материалы

| Материал | Ссылка |
|---|---|
| Основной README | [DZ_17/README.md](../../DZ_17/README.md) |
| Рабочее приложение | [DZ_17/app](../../DZ_17/app/) |
| System Prompt | [SYSTEM_PROMPT_ALINA.md](../../DZ_17/SYSTEM_PROMPT_ALINA.md) |
| Test Plan | [TEST_PLAN.md](../../DZ_17/TEST_PLAN.md) |
| Отчёт | [REPORT.md](../../DZ_17/REPORT.md) |
| Скриншоты | [screenshots/](../../DZ_17/screenshots/README.md) |

## Реализовано

`DZ_17/app` создан из последней версии ALINA/WILD_IDEAS и расширен мультимодальным контуром:

```text
PHOTO + TEXT
→ server-side /api/llm
→ task: vision
→ multimodal model
→ structured ALINA response
```

Есть OpenAI, OpenAI-compatible и Ollama routing, preview изображения, ограничения файла, Model trace, серверное хранение секретов и честный DEMO fallback без фиктивного распознавания изображения.

## Состояние сдачи

| Требование | Статус |
|---|:---:|
| Код приложения | ✅ |
| Загрузка изображения | ✅ код |
| `image + text` vision pipeline | ✅ код |
| System Prompt | ✅ |
| План тестирования | ✅ |
| Текстовый отчёт | ✅ |
| CI build/health workflow | ✅ настроен |
| Реальный прогон с vision-моделью | ⏳ |
| Финальный скриншот | ⏳ |
| Public Share/Deploy URL | ⏳ |

> Google AI Studio недоступен пользователю из-за ограничений платформы. Реализация сделана независимо от конкретного провайдера без упрощения учебного требования.

## Проверяющему

Финальная версия считается готовой после добавления публичной ссылки и скриншота, на котором одновременно видны **изображение, TEXT QUERY, ответ ALINA и trace модели**.

Проект продолжает ALINA/WILD_IDEAS и используется как первый производственный мультимодальный слой будущих Visual Continuity Engine и Narrative Knowledge Base.
