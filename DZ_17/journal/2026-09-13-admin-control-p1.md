# 2026-09-13 — ALINA Control Center P1

## TASK

Перевести боковую панель `SYS` из read-only P0 в управляемый P1-контур: модели, промты, подключения KB, runtime-флаги БД и audit trail. Сохранить разделение ролей `ADMINISTRATOR` и `IB / AI SECURITY`, не раскрывать секреты и не создавать дубли базы знаний.

## ORIGIN_CLASS

```text
HUMAN_DECISION   — пользователь подтвердил переход к P1 («да, поехали»).
PROJECT_DECISION — role-token control plane, локальное versioned state, append-only JSONL audit, separation of duties.
```

Внешние ГОСТы/книги в этом изменении не использовались как источник конкретных новых требований. Это проектная реализация уже принятой ролевой архитектуры.

## SOURCE / EXISTING PROJECT BASIS

```text
DZ_17/processes/ROLE_PANELS_AND_RBAC.md
DZ_17/app/app/admin-security-console.tsx
DZ_17/app/app/api/admin/config/route.ts
DZ_17/app/app/api/llm/route.ts
DZ_17/knowledge_base/PROVENANCE_AND_STORAGE_POLICY.md
DZ_17/knowledge_base/PHYSICAL_MAP.md
```

## WHAT CHANGED

### 1. Server-side control state

`/api/admin/config` теперь поддерживает `GET` и `POST`.

Хранимое состояние:

```text
modelPolicies
promptPolicies
kbPolicies
database runtime flags
state version
updatedAt
```

Физический runtime-путь:

```text
DZ_17/app/runtime/config/admin-control.v1.json
```

Этот файл локальный и не входит в Git.

### 2. Role tokens

Привилегированные действия разрешаются только при наличии server-side переменных:

```text
ALINA_ADMIN_TOKEN
ALINA_SECURITY_TOKEN
```

Токены:

- не возвращаются API;
- не пишутся в audit;
- не хранятся в localStorage;
- вводятся в UI как password и остаются только в памяти вкладки;
- должны различаться для разделения обязанностей.

### 3. Audit ledger

Каждая успешная мутация создаёт append-only event:

```text
eventId
at
role
action
target
value
reason
stateVersion
beforeVersion
```

Физический путь:

```text
DZ_17/app/runtime/audit/admin-events.jsonl
```

Audit ledger локальный и исключён из Git.

### 4. Administrator operations

P1 разрешает после аутентификации:

```text
model.set_enabled
prompt.set_active
kb.set_enabled
database.set_flag
```

Поддержаны runtime-флаги:

```text
vectorIndexEnabled
backupEnabled
objectStorageEnabled
```

### 5. IB / AI Security operations

P1 разрешает отдельной security-role:

```text
model.set_security     approved | review | blocked
prompt.set_review      approved | pending | blocked
kb.set_hold            true | false
```

ИБ не получает значения секретов и не переписывает каноническое знание. `security hold` — отдельная управляющая политика.

### 6. UI

Обновлён `ALINA CONTROL CENTER`:

```text
ADMINISTRATOR
  Models     enable / disable
  Prompts    active / inactive + version
  KB         connect / disconnect
  Database   pgvector / backup / object-storage flags
  Control    audit ledger + state version

IB / AI SECURITY
  Models     approved / review / blocked
  Prompts    approved / pending / blocked
  KB         released / security hold
  Control    security metadata + audit
```

Header/role bar сделаны sticky; прокручивается рабочая область, а не вся панель.

## SECURITY BOUNDARIES

Не реализовано и не имитируется:

```text
- хранение API keys в UI;
- выдача connection strings браузеру;
- выдача тел системных prompt пользователю без отдельного RBAC workflow;
- прямое переписывание verified KB;
- автоматическое применение model policy к /api/llm routing.
```

Последний пункт вынесен в следующий слой: `control-plane → runtime policy adapter → LLM Gateway`. Это сделано специально, чтобы control plane и execution plane не слипались в один небезопасный модуль.

## PHYSICAL PATHS

Обновлены:

```text
DZ_17/app/app/api/admin/config/route.ts
DZ_17/app/app/admin-security-console.tsx
DZ_17/app/app/admin-security-console.css
DZ_17/app/.env.example
DZ_17/app/.gitignore
```

Runtime создаётся автоматически:

```text
DZ_17/app/runtime/config/admin-control.v1.json
DZ_17/app/runtime/audit/admin-events.jsonl
```

## COMMITS

```text
7069e3dc7dd549584372faf9797adc3881e02390  audited admin control state API
6fc1d2aaad231c47772821a4aca9c5ba29528185  P1 control center actions
919bc21799b9fa181c0e23ef170281d919c4edad  sticky UI + control styles
3bfc0e02b1d07de9de46c649f02324939c35a7b1  local runtime state/audit ignore
06a8d79ced0912451e3d88f6a72cdcfe61f46fab  env contracts for role tokens + DB
```

## VALIDATION / ACCEPTANCE

Нужно проверить после `git pull`:

```text
1. npm run build / CI green.
2. Без ALINA_ADMIN_TOKEN / ALINA_SECURITY_TOKEN UI остаётся read-only.
3. С токеном неправильного значения POST возвращает 401.
4. С правильным токеном изменение сохраняется после refresh.
5. runtime/config/admin-control.v1.json создаётся локально.
6. runtime/audit/admin-events.jsonl получает событие без token/secret.
7. Admin и Security не могут выполнять действия чужой роли.
8. Secrets/connection strings не появляются в GET /api/admin/config.
```

## NEXT STEP

```text
P1.1  runtime policy adapter: model enable/block + route override реально влияют на /api/llm
P1.2  versioned prompt body store + diff + rollback + security approval
P1.3  KB connector registry с health/index/version/provenance metrics
P1.4  PostgreSQL + pgvector migrations and health
P1.5  durable audit/event ledger in PostgreSQL
P1.6  полноценная user authentication + sessions + RBAC вместо ручного role token
```
