# ALINA Control Plane — acceptance record

## Назначение

Этот документ фиксирует проверяемое состояние системной панели `SYS / ALINA CONTROL CENTER` после перевода из read-only прототипа в действующий ограниченный control plane.

Это **проектная реализация**, а не требование, извлечённое из ГОСТа или книги.

```text
origin_class = PROJECT_DECISION + HUMAN_DECISION
```

## Физические компоненты

```text
DZ_17/app/app/admin-security-console.tsx
DZ_17/app/app/admin-security-console.css
DZ_17/app/app/admin-prompt-editor.css
DZ_17/app/app/api/admin/config/route.ts
DZ_17/app/app/api/llm/route.ts
DZ_17/app/lib/runtime-policy.ts
DZ_17/app/lib/prompt-registry.ts
DZ_17/app/.env.example
DZ_17/app/.gitignore
DZ_17/app/scripts/control-plane-smoke.mjs
.github/workflows/dz17-check.yml
```

Локальное runtime-состояние, версии промтов и аудит:

```text
DZ_17/app/runtime/config/admin-control.v1.json
DZ_17/app/runtime/config/prompt-store.v1.json
DZ_17/app/runtime/audit/admin-events.jsonl
```

Эти runtime-каталоги исключены из Git. Builtin baseline системных промтов физически хранится один раз в:

```text
DZ_17/app/lib/prompt-registry.ts
```

`/api/llm` импортирует этот registry и больше не содержит параллельную копию системных prompt bodies.

## Реально работающие права

### ADMINISTRATOR

```text
model.set_enabled
route.set_override
prompt.set_active
prompt.create_draft
prompt.activate_version
kb.set_enabled
database.set_flag
```

### IB / AI SECURITY

```text
model.set_security      APPROVED / REVIEW / BLOCKED
prompt.set_review       глобальная prompt policy
prompt.review_version   APPROVED / BLOCKED для runtime draft
kb.set_hold             SECURITY HOLD / RELEASE
```

Admin не может самостоятельно approve новую runtime-версию prompt. ИБ не может активировать её, менять routing, подключение KB или предметные знания.

## Versioned Prompt Workflow

Фактический workflow:

```text
BUILTIN BASELINE v1
        ↓
ADMIN opens authorized Prompt Registry
        ↓
ADMIN edits body
        ↓
prompt.create_draft
        ↓
new runtime version = PENDING
        ↓
IB / AI SECURITY reads same version/body
        ↓
prompt.review_version
   ├── APPROVED
   └── BLOCKED
        ↓
ADMIN may activate APPROVED only
        ↓
prompt.activate_version
        ↓
/api/llm resolves effective active prompt version
        ↓
response contains promptId + promptVersion
        ↓
rollback = activate earlier APPROVED version
```

Полные prompt bodies не возвращаются обычным `GET /api/admin/config`. Для просмотра требуется отдельно авторизованный запрос:

```text
GET /api/admin/config?include_prompt_bodies=1&role=admin|security
Authorization: Bearer <role token>
```

Prompt body не пишется в audit event. Для `prompt.create_draft` audit хранит только версию и число символов.

## Авторизация

Server-side переменные:

```text
ALINA_ADMIN_TOKEN
ALINA_SECURITY_TOKEN
```

Клиент передаёт соответствующий token в `Authorization: Bearer ...` только для privileged mutation/privileged prompt read. Значения token:

- не возвращаются `/api/admin/config`;
- не записываются в audit ledger;
- не сохраняются UI в `localStorage`;
- не должны коммититься в Git.

Каждая mutation требует `action`, `target`, `reason`.

## Runtime enforcement

`/api/llm` читает `runtime/config/admin-control.v1.json` через `lib/runtime-policy.ts` и активную prompt-версию через `lib/prompt-registry.ts`.

До обращения к LLM проверяются:

```text
MODEL POLICY
  enabled?
  security != blocked?

PROMPT POLICY
  active?
  review != blocked?
  active prompt version approved?

KB POLICY
  connected?
  securityHold == false?
```

Route override ставит выбранную разрешённую runtime-модель первой в AUTO-chain. Если она недоступна или заблокирована, остаётся разрешённый fallback-chain.

## Автоматический acceptance test

Команда:

```text
npm run test:control -- --base <running-app-url>
```

Сценарий `scripts/control-plane-smoke.mjs` проверяет:

1. Admin и Security роли действительно настроены на сервере.
2. Token values не раскрываются GET API.
3. Prompt bodies без authorization дают `401`.
4. Authorized Admin получает active prompt body.
5. Admin disable модели меняет effective `/api/llm` catalog.
6. IB block модели меняет effective `/api/llm` catalog.
7. Admin route override сохраняется и становится первым разрешённым AUTO candidate.
8. IB block базового prompt policy приводит к `403 PROMPT_POLICY_DENY` до вызова модели.
9. Admin создаёт новую prompt DRAFT-версию.
10. Security видит тот же draft/body и его состояние `PENDING`.
11. Security approve переводит version в `APPROVED`.
12. Admin активирует только approved version.
13. `/api/llm` реально возвращает активированную `promptVersion`.
14. Admin выполняет rollback на предыдущую approved version.
15. IB hold `KB-FOUNDATION` приводит к `403 KB_POLICY_DENY` до вызова модели.
16. Privileged operations попадают в audit ledger.
17. Role tokens и prompt-body CI marker отсутствуют в обычном API response.
18. После теста policy возвращается в безопасное baseline-состояние последовательным cleanup.

## CI evidence

Финальная интеграционная проверка Prompt Workflow + Control Plane:

```text
workflow: DZ-17 ALINA Multimodal Check
run_id:   34810036368
job_id:   103869378364
commit:   54ced757f5f64cdf2b2eb63c6e71bc709a417101
result:   SUCCESS
```

Лог acceptance содержит:

```text
[CONTROL-PLANE] PASS · state v15 · audit 14 · prompt v2 reviewed/activated/rolled back
```

В том же job успешно прошли:

```text
npm ci
node --check scripts/control-plane-smoke.mjs
npm run build
production /api/health
Admin / IB RBAC + runtime-policy smoke
Prompt draft → IB review → activation → rollback
Knowledge Factory A1/A2 smoke
five concurrent Knowledge Factory analytic streams
runtime trace readback
```

## Связанные commits

### Control Plane P0

```text
ade0402d496f4c22566123615c327ec08a2773b0  expand live Admin/Security UI
55e7e9f96f1c875a751d37d9b7ee1c9760713a97  route overrides across runtime providers
69fdc26fe72ec3c609043f28d0b9daecfca117ff  initial control-plane smoke
48417eb781d86f28b3d4eee4d5ee10d541e7c7fc  sequential cleanup / no state-file race
bc8f11f595d3e0286a11d51b7fff06ee697f4fc3  package test:control command
6cf33cae8fc37dd33334a3dceb5ac8e7337fa368  CI executes control-plane smoke
```

### Prompt Workflow

```text
d8c351513568502ae3c2461fc18f706904f84319  canonical runtime prompt registry
c1e5ad730b2b5fc1fbd1dc9cb3544e2a2c53cdbd  /api/llm uses active prompt version
f6825ada8a5fa0addb2fd6e0a0c01abb7d2e1a4e  Admin API draft/review/activation workflow
03f30ccf038040f51c11c008c14c4b0be5570dbb  protected prompt editor + dual-role UI
f549f9bb697aedbef5e0317d7a6829ecbd54245e  prompt editor styles
4eaeee93131adb40df2774ac27d58b14a604406e  stylesheet wiring
54ced757f5f64cdf2b2eb63c6e71bc709a417101  prompt workflow acceptance test
```

Ранний unwired `prompt-registry.ts` spike был создан и удалён до production use:

```text
a55d2e9b9a3b7b569d0e2f5d253fdd94145e0598  rejected spike
1afa06bba7fa857299a2c77cf87ccbbbd390aeee  remove rejected spike
```

Причина отклонения: та версия создавала бы второй source of truth рядом с prompt bodies в `/api/llm`. Текущая реализация устранила дубль: builtin prompt body перенесён в `lib/prompt-registry.ts`, а `/api/llm` получает effective version только оттуда.

## Что ещё НЕ считается завершённым

Не следует выдавать за готовое:

```text
individual user identities / OIDC / SSO
реальное хранение основной KB в PostgreSQL + pgvector
перенос audit ledger в отдельную DB
model file SHA-256 / trust source / quarantine workflow
UI e2e browser test privileged scenarios
```

Следующая зрелость: заменить shared role tokens индивидуальными identities/groups, затем подключить реальный persistence слой PostgreSQL + pgvector и model trust/quarantine.
