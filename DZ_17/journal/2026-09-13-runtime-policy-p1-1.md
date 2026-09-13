# ALINA Control Center P1.1 — Runtime Policy Enforcement

Дата: 2026-09-13

## TASK

Связать сохранённое управляющее состояние `ALINA CONTROL CENTER` с реальным LLM runtime так, чтобы административные и ИБ-решения перестали быть только UI-состоянием.

## WHAT CHANGED

Добавлен отдельный серверный runtime-policy adapter:

```text
DZ_17/app/lib/runtime-policy.ts
```

Он читает каноническое локальное состояние:

```text
DZ_17/app/runtime/config/admin-control.v1.json
```

и выдаёт решения для трёх классов объектов:

```text
MODEL   → enabled + security state
PROMPT  → active + security review
KB      → enabled + security hold
```

`/api/llm` теперь проверяет policy **до обращения к провайдеру**.

## RUNTIME FLOW

```text
REQUEST
  ↓
TASK / CONTEXT
  ↓
PROMPT POLICY
  ↓
KB POLICY
  ↓
MODEL POLICY
  ↓
AUTO / MANUAL ROUTING
  ↓
PROVIDER CALL
```

При запрете запрос останавливается до вызова модели.

## POLICY EFFECTS

### Models

```text
Admin: DISABLED
       ↓
model excluded from AUTO routing
and rejected for manual selection

IB: BLOCKED
    ↓
model excluded from AUTO routing
and rejected for manual selection
```

Состояние `REVIEW` не блокирует работу автоматически; оно остаётся наблюдаемым security-status до отдельного требования stricter mode.

### Prompts

Task → canonical prompt ID:

```text
dialogue / synthesis / architecture / vision
→ PROMPT-BASE-ALINA

kb_extract
→ PROMPT-KB-EXTRACT

kb_validate
→ PROMPT-KB-VALIDATE
```

Если prompt `INACTIVE` или `BLOCKED`, сервер возвращает policy deny до обращения к LLM.

### Knowledge Bases

Для вызова формируется список KB refs. Если клиент явно передал `context.kbRefs`, используются они. Для текущих KB workflows есть server-side defaults:

```text
idea_to_knowledge_base / kb_validation
→ KB-FOUNDATION
→ KB-METHODS
→ KB-NARRATIVE

other kb_extract / kb_validate
→ KB-FOUNDATION
→ KB-METHODS
```

Если KB `DISCONNECTED` или находится в `SECURITY HOLD`, объявленное использование блокируется на сервере.

Важно: это policy gate на использование KB. Физический retrieval/RAG loader будет обязан проходить через тот же adapter, когда будет подключён.

## ORIGIN_CLASS

```text
HUMAN_DECISION
```

Пользователь утвердил переход от read-only/control-state к реально действующим настройкам.

```text
PROJECT_DECISION
```

Выбрано разделение:

```text
Control Plane
→ shared Runtime Policy Adapter
→ LLM Gateway
```

вместо копирования policy-логики по provider adapters.

## SOURCE / DECISION

Это проектное архитектурное решение, а не правило, извлечённое из ГОСТа или книги.

Использованы уже существующие внутренние контракты:

```text
DZ_17/processes/ROLE_PANELS_AND_RBAC.md
DZ_17/app/app/api/admin/config/route.ts
DZ_17/app/app/api/llm/route.ts
DZ_17/journal/2026-09-13-admin-control-p1.md
```

Внешние нормативные источники в P1.1 не использовались как источник новых требований.

## PHYSICAL PATHS

Создан:

```text
DZ_17/app/lib/runtime-policy.ts
```

Обновлены:

```text
DZ_17/app/app/api/llm/route.ts
DZ_17/app/app/admin-security-console.tsx
```

Runtime state остаётся локальным:

```text
DZ_17/app/runtime/config/admin-control.v1.json
DZ_17/app/runtime/audit/admin-events.jsonl
```

## COMMITS

```text
c49082f7a55a014ae26b9ad7521e1652a271605d  shared runtime policy adapter
8ed5d3d0067aeecbcd1ac2bf866db6432461c7d7  enforce policy in /api/llm
90152cdde34ca3c522b0b75e7d06ad499fb0684f  update Control Center runtime status text
```

## SECURITY PROPERTIES

```text
- role tokens are not read by runtime-policy adapter;
- token values never enter LLM requests;
- blocked/disabled model is rejected before provider call;
- inactive/blocked prompt is rejected before provider call;
- disconnected/held KB is rejected before provider call;
- no secret values are returned by policy errors;
- existing audit ledger remains the source of privileged mutation history.
```

## RESPONSE TRACE

Successful `/api/llm` responses now include:

```text
policyVersion
promptId
kbRefs
```

Policy deny responses include a stable code:

```text
MODEL_POLICY_DENY
PROMPT_POLICY_DENY
KB_POLICY_DENY
```

## VALIDATION PLAN

1. Disable `demo` as Admin and verify it disappears from AUTO route / manual call is denied.
2. Re-enable `demo` and verify routing returns.
3. Block `demo` as IB and verify the same runtime denial.
4. Set `PROMPT-KB-EXTRACT` inactive/blocked and verify `kb_extract` receives HTTP 403 without model call.
5. Put `KB-NARRATIVE` on security hold and verify current `idea_to_knowledge_base` workflow receives HTTP 403.
6. Release hold and verify workflow resumes.
7. Confirm every privileged mutation is still present in `runtime/audit/admin-events.jsonl`.

## NEXT STEP

P1.2:

```text
real Prompt Version Store
+ rollback
+ model file SHA-256 / trust record
+ KB integrity/version manifest
+ PostgreSQL + pgvector adapter
+ migration of audit JSONL to append-only database ledger when configured
```
