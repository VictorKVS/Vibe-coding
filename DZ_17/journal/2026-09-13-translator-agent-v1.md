# 2026-09-13 — ALINA Translator v1

## TASK

Создать первую специализированную роль model zoo — переводчик иностранных материалов с точным EN→RU переводом, RAG по терминологии, Translation Memory, независимым routing и измеримым benchmark вместо рекламных заявлений «лучше Google».

## WHAT CHANGED

1. Добавлен role profile `ROLE-TRANSLATOR` с режимами `exact`, `technical`, `reader`.
2. Добавлен отдельный runtime task `translation` в LLM Gateway.
3. Добавлен `PROMPT-TRANSLATOR` и policy enforcement через существующий Control Plane.
4. Добавлены две canonical KB: терминология и Translation Memory.
5. Добавлен deterministic RAG-lite: поиск терминов по исходному тексту + exact-match по approved Translation Memory.
6. Exact Translation Memory может завершить задачу без LLM, но только после prompt/KB policy checks.
7. Добавлены независимые `*_TRANSLATION_MODEL` routing variables для local/GigaChat/Mistral/OpenAI/Ollama.
8. Существующий `FATHER_MODELS` не копируется: initial local translation specialist = `local-general-qwen14b`, пока benchmark не докажет лучший вариант.
9. DEMO исключён из capability `translation`, чтобы система не имитировала перевод при отсутствии реальной модели.
10. Добавлен versioned benchmark contract для сравнения local zoo / GigaChat / Mistral / Google baseline при наличии законного доступа.

## WHY

Перевод является отдельной задачей с другими требованиями к точности, терминологии и контролю добавлений/пропусков. Общий chat prompt не обеспечивает стабильного перевода. Раздельный role/prompt/RAG/output policy позволяет менять модель без изменения методики и измерять качество по доменам.

## ORIGIN_CLASS

`PROJECT_DECISION`

Решение принято в диалоге с владельцем проекта: каждая модель должна выполнять специализированную часть задачи через role profile + prompt + RAG; первой специализацией выбран Translator.

## SOURCE / DECISION

- User decision: переводчик — отдельная специализация model zoo.
- Existing project governance: canonical KB, no duplicated standards/books, prompt/KB/model policy in Control Center.
- Benchmark terminology and initial glossary entries are project-created. Glossary entries имеют `status=proposed` и не считаются подтверждёнными нормативными переводами.

## SOURCE LOCATOR

External source locator не требуется для архитектурного решения. Для будущих нормативных терминов exact source locator обязателен до `approved`.

## PHYSICAL PATHS

- `DZ_17/profiles/translator.v1.json`
- `DZ_17/knowledge_base/translation_terminology.v1.json`
- `DZ_17/knowledge_base/translation_memory.v1.json`
- `DZ_17/knowledge_base/translation_benchmark.v1.json`
- `DZ_17/knowledge_base/PHYSICAL_MAP.md`
- `DZ_17/app/lib/translator-rag.ts`
- `DZ_17/app/lib/runtime-policy.ts`
- `DZ_17/app/app/api/llm/route.ts`
- `DZ_17/app/app/api/admin/config/route.ts`
- `DZ_17/app/.env.example`
- `DZ_17/app/scripts/configure-existing-model-zoo.ps1`

## CANONICAL OBJECT IDS

- `ROLE-TRANSLATOR`
- `PROMPT-TRANSLATOR`
- `RAG-TRANSLATION-v1`
- `KB-TRANSLATION-TERMS`
- `KB-TRANSLATION-MEMORY`
- `BENCH-TRANSLATION-EN-RU-v1`

## DEPENDENCIES

- Existing LLM Gateway providers: llama.cpp, GigaChat, compatible/Mistral, optional OpenAI/Ollama.
- Existing Runtime Policy / Control Center.
- Existing centralized `FATHER_MODELS` for local model routing.

## VALIDATION / TEST

Required after local sync:

1. `GET /api/admin/config` contains task `translation`, prompt `PROMPT-TRANSLATOR`, KB terms and TM.
2. `GET /api/llm` contains route `translation`.
3. `POST /api/llm` with `task=translation` returns translated text only and reports `promptId=\"PROMPT-TRANSLATOR\"`.
4. Response `translationRag.terminologyMatches` shows matched glossary terms when source text contains registered term.
5. `KB-TRANSLATION-TERMS` disabled or held by AI Security => translation returns policy deny before model call.
6. `PROMPT-TRANSLATOR` inactive/blocked => translation returns policy deny before model call.
7. DEMO must not appear as translation candidate.
8. After model-zoo configuration, `LLAMA_TRANSLATION_MODEL=local-general-qwen14b` appears in `.env.local`.

## REVIEW STATUS

`implementation_complete / runtime_validation_pending`

No claim is made that any current model is better than Google Translate. That claim requires versioned benchmark results.

## RESULT

Translator is now a first-class specialized task with its own role, prompt, RAG stores, runtime policy and model route. The architecture can benchmark and later reassign the translation specialist without duplicating model weights or knowledge.

## NEXT STEP

Build a lawful EN→RU benchmark corpus (50 minimum, 200 recommended) across cybersecurity, AI/ML, software architecture, legal/regulatory, scientific and general text; run local zoo candidates first, then GigaChat/Mistral and a Google baseline where available; rank per domain/mode rather than choose one global winner.
