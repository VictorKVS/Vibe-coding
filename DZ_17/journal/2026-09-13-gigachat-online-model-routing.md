# 2026-09-13 — GigaChat online model selector

## TASK

Добавить в ALINA Control Center выбор конкретной online-модели GigaChat отдельно для задач `dialogue`, `synthesis`, `architecture`, `kb_extract`, `kb_validate`.

## ORIGIN_CLASS

`HUMAN_DECISION` — пользователь потребовал использовать GigaChat вместо OpenAI и иметь выбор online-модели GigaChat.

## WHAT CHANGED

1. Control state расширен полем `routeOverrides`.
2. Admin API получил audited action `route.set_override`.
3. Разрешены только идентификаторы `gigachat:<model-id>` либо пустое значение для возврата в AUTO.
4. LLM Gateway применяет override как первый кандидат для конкретной задачи.
5. Если выбранная модель недоступна, отключена Admin или заблокирована AI Security, runtime сохраняет безопасный разрешённый fallback.
6. В `SYS → Модели` добавлен блок `GigaChat Online · выбор модели`; список моделей не захардкожен, а берётся из online discovery GigaChat API.
7. Effective routing показывает фактический порядок после override и security policy.

## PHYSICAL PATHS

```text
DZ_17/app/lib/runtime-policy.ts
DZ_17/app/app/api/admin/config/route.ts
DZ_17/app/app/api/llm/route.ts
DZ_17/app/app/admin-security-console.tsx
DZ_17/app/runtime/config/admin-control.v1.json   # local runtime state
DZ_17/app/runtime/audit/admin-events.jsonl       # local audit ledger
```

## DATA FLOW

```text
GigaChat /v1/models
→ /api/llm model catalog
→ SYS / Model Registry
→ Admin selects model for task
→ POST /api/admin/config route.set_override
→ routeOverrides[task]
→ runtime-policy
→ effectiveAutoCandidates
→ selected GigaChat model first
→ allowed fallback
```

## SECURITY / RBAC

- изменить route override может только Admin с валидным `ALINA_ADMIN_TOKEN`;
- AI Security не меняет routing напрямую, но может `BLOCKED` конкретную модель;
- blocked/disabled модель не может быть принудительно использована override;
- секрет GigaChat не отправляется в UI;
- каждое изменение override записывается в audit ledger вместе с `role`, `task`, `value`, `reason`, `stateVersion`.

## COMMITS

```text
6323cecdcb08851a2ea549537acc2c07887b0903  runtime policy routeOverrides
89270668bbd1ec42dba9b13b64938bafd4b211e0  audited route.set_override API
25f23397d3382d2b156f0df6ebf49b9241462bd4  apply override to LLM runtime routing
acd0eb77f6c00257ba3eff1d4508ffceee96324c  online GigaChat selector in Control Center
```

## VALIDATION

После локального `git merge origin/main` и перезапуска сервера:

1. `GIGACHAT_AUTH_KEY` должен быть задан в `.env.local`;
2. `SYS → Модели` должен показать online-модели GigaChat;
3. Admin выбирает модель для `dialogue`;
4. `Effective routing` должен поставить выбранный `gigachat:<id>` первым;
5. текстовый запрос должен вернуть тот же `provider/model` в LLM trace;
6. AI Security ставит выбранную модель `BLOCKED`;
7. effective routing должен исключить её и перейти к разрешённому fallback;
8. обе операции должны появиться в `Контроль → Audit Ledger`.
