# 2026-09-13 — PDF book translation pipeline

## TASK
Сделать практический конвейер перевода локального PDF через ALINA Translator на примере книги `Getting to Yes`, лежащей в пользовательском `Downloads`.

## WHAT CHANGED

1. Добавлен `DZ_17/app/scripts/extract-pdf-text.py` — page-aware извлечение текста через `pypdf`.
2. Добавлен `DZ_17/app/scripts/translate-pdf-book.mjs` — resumable перевод PDF по чанкам через `/api/llm` task=`translation`.
3. Добавлен `DZ_17/app/scripts/translate-pdf-from-downloads.ps1` — поиск PDF по маске в `%USERPROFILE%\Downloads` и запуск конвейера.
4. В `package.json` добавлен `npm run translate:pdf`.
5. `runtime/translations/` исключён из Git, потому что там находятся локальный исходный extract, перевод, прогресс и manifest.

## WHY
Переводчик должен проверяться на реальных длинных документах и работать воспроизводимо: с page/chunk provenance, resume после сбоя, фиксацией фактической модели и автоматическими проверками сохранности чисел/URL.

## ORIGIN_CLASS
`PROJECT_DECISION` + `ASSISTANT_PROPOSAL`, подтверждённое пользователем требование реализовать переводчик для реальных PDF.

## PHYSICAL PATHS

- `DZ_17/app/scripts/extract-pdf-text.py`
- `DZ_17/app/scripts/translate-pdf-book.mjs`
- `DZ_17/app/scripts/translate-pdf-from-downloads.ps1`
- local-only: `DZ_17/app/runtime/translations/<book>/`

## OUTPUTS PER BOOK

```text
runtime/translations/<book>/
├── source.extract.json
├── translation.progress.jsonl
├── translation.ru.md
└── manifest.json
```

`translation.progress.jsonl` хранит для каждого чанка исходник, перевод, page locator, модель/provider, latency, policy/prompt refs, translation RAG и deterministic preservation checks.

## VALIDATION / TEST

1. Сервер ALINA должен быть запущен на `http://localhost:3000`.
2. `translation` task должен иметь реальную модель; DEMO не допускается как переводчик.
3. Для первого smoke-run используется `-MaxChunks 3`, затем тот же запуск без ограничения продолжает работу с checkpoint.
4. Если PDF не содержит текстового слоя, pipeline останавливается с требованием OCR, а не генерирует фиктивный перевод.
5. Финальное восстановление PDF отложено до проверки качества русского текста; первичный результат — Markdown + trace JSONL.

## REVIEW STATUS
`implemented / local runtime validation pending`

## NEXT STEP
Провести smoke-run на `Getting to Yes`, посмотреть первые 3 чанка, проверить терминологию переговоров и только после этого запустить полный перевод книги.
