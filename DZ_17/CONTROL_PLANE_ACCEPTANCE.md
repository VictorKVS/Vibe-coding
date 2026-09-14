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
DZ_17/app/app/api/admin/config/route.ts
DZ_17/app/app/api/llm/route.ts
DZ_17/app/lib/runtime-policy.ts
DZ_17/app/.env.example
DZ_17/app/.gitignore
DZ_17/app/scripts/control-plane-smoke.mjs
.github/workflows/dz17-check.yml
```

Локальное runtime-состояние и аудит:

```text
DZ_17/app/runtime/config/admin-control.v1.json
DZ_17/app/runtime/audit/admin-events.jsonl
```

Эти runtime-каталоги исключены из Git.

## Реально работающие права

### ADMINISTRATOR

```text
model.set_enabled
route.set_override
prompt.set_active
kb.set_enabled
database.set_flag
```

### IB / AI SECURITY

```text
model.set_security      APPROVED / REVIEW / BLOCKED
prompt.set_review       APPROVED / PENDING / BLOCKED
kb.set_hold             SECURITY HOLD / RELEASE
```

Admin не может снять security block через административное действие. ИБ не может менять эксплуатационный routing, соединение KB или предметные знания.

## Авторизация

Server-side переменные:

```text
ALINA_ADMIN_TOKEN
ALINA_SECURITY_TOKEN
```

Клиент передаёт соответствующий token в `Authorization: Bearer ...` только для privileged mutation. Значения token:

- не возвращаются `/api/admin/config`;
- не записываются в audit ledger;
- не сохраняются UI в `localStorage`;
- не должны коммититься в Git.

Каждая mutation требует `action`, `target`, `reason`.

## Runtime enforcement

`/api/llm` читает `runtime/config/admin-control.v1.json` через `lib/runtime-policy.ts`.

До обращения к LLM проверяются:

```text
MODEL POLICY
  enabled?
  security != blocked?

PROMPT POLICY
  active?
  review != blocked?

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
3. Admin disable модели меняет effective `/api/llm` catalog.
4. IB block модели меняет effective `/api/llm` catalog.
5. Admin route override сохраняется и становится первым разрешённым AUTO candidate.
6. IB block базового prompt приводит к `403 PROMPT_POLICY_DENY` до вызова модели.
7. IB hold `KB-FOUNDATION` приводит к `403 KB_POLICY_DENY` до вызова модели.
8. Privileged operations попадают в audit ledger.
9. Role tokens отсутствуют в API response.
10. После теста policy возвращается в безопасное baseline-состояние последовательным cleanup.

## CI evidence

Финальная интеграционная проверка:

```text
workflow: DZ-17 ALINA Multimodal Check
run_id:   34809574675
job_id:   103868032204
commit:   6cf33cae8fc37dd33334a3dceb5ac8e7337fa368
result:   SUCCESS
```

Лог acceptance содержит:

```text
[CONTROL-PLANE] PASS · state v11 · audit 10
```

В том же job успешно прошли:

```text
npm ci
node --check scripts/control-plane-smoke.mjs
npm run build
production /api/health
Admin / IB RBAC + runtime-policy smoke
Knowledge Factory A1/A2 smoke
five concurrent Knowledge Factory analytic streams
runtime trace readback
```

## Связанные commits

```text
ade0402d496f4c22566123615c327ec08a2773b0  expand live Admin/Security UI
55e7e9f96f1c875a751d37d9b7ee1c9760713a97  route overrides across runtime providers
69fdc26fe72ec3c609043f28d0b9daecfca117ff  initial control-plane smoke
48417eb781d86f28b3d4eee4d5ee10d541e7c7fc  sequential cleanup / no state-file race
bc8f11f595d3e0286a11d51b7fff06ee697f4fc3  package test:control command
6cf33cae8fc37dd33334a3dceb5ac8e7337fa368  CI executes control-plane smoke
```

Временный `prompt-registry.ts` эксперимент был создан и удалён до runtime-подключения, чтобы не создавать второй source of truth системных промтов:

```text
a55d2e9b9a3b7b569d0e2f5d253fdd94145e0598  spike
1afa06bba7fa857299a2c77cf87ccbbbd390aeee  remove spike
```

## Что ещё НЕ считается завершённым

Не следует выдавать за готовое:

```text
individual user identities / OIDC / SSO
versioned editing of prompt bodies
реальное хранение основной KB в PostgreSQL + pgvector
перенос audit ledger в отдельную DB
model file SHA-256 / trust source / quarantine workflow
UI e2e browser test privileged scenarios
```

Следующая зрелость: заменить shared role tokens индивидуальными identities/groups и сделать единый versioned prompt workflow `draft → IB review → approve → activate → rollback`, не создавая второй source of truth.
