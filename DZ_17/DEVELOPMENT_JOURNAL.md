# ALINA Analyst Core — журнал разработки и изменений KB

Назначение: фиксировать **что именно было придумано, что взято из источника, куда физически вставлено, почему принято решение и как оно проверяется**.

Этот журнал не хранит скрытую внутреннюю цепочку рассуждений модели. Он хранит воспроизводимое инженерное обоснование и provenance изменений.

---

## 1. Обязательный формат записи

Каждая значимая разработка или изменение Knowledge Base получает запись:

```text
DATE / COMMIT
TASK
WHAT CHANGED
WHY
ORIGIN_CLASS
SOURCE / DECISION
SOURCE LOCATOR
PHYSICAL PATHS
CANONICAL OBJECT IDS
DEPENDENCIES
VALIDATION / TEST
REVIEW STATUS
RESULT
NEXT STEP
```

Допустимые `origin_class` определены в:

```text
DZ_17/knowledge_base/PROVENANCE_AND_STORAGE_POLICY.md
```

---

## 2. Правило для данных из ГОСТов, ISO, книг и официальной документации

Запись вида:

```text
«Добавлено по ГОСТ ...»
```

запрещена без следующих данных:

```text
source_ref
source_title
source_version_or_year
source_locator
acquisition_uri
accessed_at
source_file_path        # если оригинал есть локально
source_hash_sha256      # если оригинал есть локально
extraction_note_path
```

Если точный пункт ещё не проверен:

```text
locator_status = pending_verification
record_status = draft
```

Такой материал нельзя выдавать как подтверждённое требование стандарта.

---

## 3. Начальная инвентаризация состояния

### 2026-09-12 — Universal KB / dedup / provenance documentation

**COMMITS**

```text
1d9fb05b93595a98ec303db2812ef6ce13095f2c  provenance/storage policy
b5bbf77c2645591d131083279a6c5d0018150559  physical KB map
8215df099db29630473e68ecd9d7fafaa8df5e1e  materials workspace
2e2dd1f0b4466a836d577bfb16f3a57d8458753a  initial development journal
51185df6d020352bc07b9799be3853c4e749542d  universal KB README update
5ab097a36dbb86702b9fbd717e157825a3dcdad1  documentation index update
4f37715919b31fbf4024a83bfda2ff9527f45f75  source acquisition plan hardening
2ef9fb3cb114a99f940f617f7ccb7bcc849ee625  local-only originals/indexes guard
```

**TASK**  
Зафиксировать единую базу знаний для всех агентов, запретить дублирование и сделать физическое местонахождение знаний наблюдаемым.

**WHAT CHANGED**

Созданы правила provenance и физического хранения, физическая карта KB и рабочее место для исходных материалов. Обновлены главная карта документации, README базы и план обработки источников. Добавлен `.gitignore`, чтобы полные оригиналы и производные runtime-индексы по умолчанию оставались локальными.

**WHY**

В репозитории уже существуют несколько KB-подобных слоёв: Technology Registry, ранний Markdown knowledge pack, ALINA Analyst Meta-KB, Domain Profiles и прикладной KB Analyst. Без явной карты возникает риск повторного создания одинаковых знаний и потери происхождения данных.

**ORIGIN_CLASS**

```text
HUMAN_DECISION      — требование пользователя: одна универсальная база для всех агентов, специализации различаются;
PROJECT_DECISION    — canonical ID, reference-only inheritance, physical map, mandatory provenance contract;
```

**SOURCE / DECISION**

Использованы уже существующие проектные решения:

```text
docs/TECHNOLOGY_REGISTRY.md
registry/technologies.json
DZ_17/knowledge_base/README.md
DZ_17/knowledge_base/ANALYST_KB_SPEC.md
DZ_17/knowledge_base/SOURCE_ACQUISITION_AND_EXTRACTION_PLAN.md
```

В Technology Registry уже действует принцип «сначала искать готовое, потом reuse/improve/create». В Meta-KB уже действует разделение `Claim ≠ Fact`, provenance, review и Domain Profile inheritance. Новые документы не заменяют эти решения, а вводят единый governance-слой и карту расположения.

**SOURCE LOCATOR**

Для этой записи используются repository paths и текущие документы проекта. Внешние ГОСТ/книги в данном изменении **не извлекались и не цитировались как источник новых фактов**.

**PHYSICAL PATHS**

Созданы:

```text
DZ_17/knowledge_base/PROVENANCE_AND_STORAGE_POLICY.md
DZ_17/knowledge_base/PHYSICAL_MAP.md
DZ_17/knowledge_base/materials/README.md
DZ_17/knowledge_base/materials/.gitignore
DZ_17/DEVELOPMENT_JOURNAL.md
```

Обновлены:

```text
DZ_17/knowledge_base/README.md
DZ_17/DOCUMENTATION_INDEX.md
DZ_17/knowledge_base/SOURCE_ACQUISITION_AND_EXTRACTION_PLAN.md
```

**CANONICAL OBJECT IDS**

Новые предметные объекты знания специально не создавались. Созданы governance/index documents. Существующие IDs продолжают использоваться из `source_registry.v1.json`, `analyst_method_cards.v1.json` и `registry/technologies.json`.

**VALIDATION / TEST**

Документальная проверка:

```text
- нет копии исходных ГОСТов/книг;
- нет нового параллельного source registry;
- существующий source_registry.v1.json остаётся библиографическим source of truth;
- PHYSICAL_MAP указывает реальные пути и отдельно помечает planned/local-only;
- rules запрещают SOURCE_DERIVED без exact locator;
- полные originals и runtime indexes защищены local-only .gitignore;
- ранее названные «подтверждённые открытые источники» в плане понижены до candidate/registered, пока не записаны exact URI/version/locator;
```

**REVIEW STATUS**

```text
accepted_by_user_direction / implementation documented
```

**RESULT**

Зафиксирована модель:

```text
UNIVERSAL FOUNDATION KB
        ↓ reference/inherit
ROLE PROFILE
        ↓
DOMAIN / TECH SPECIALIZATION
        ↓
PROJECT / TASK CONTEXT
```

Знания стандартов, методов и технологий не копируются в каталоги агентов.

**NEXT STEP**

1. Проаудировать `source_registry.v1.json`: для каждого источника определить `registered / original_available / extracted / locator_verified / reviewed`.
2. Для первого ГОСТа создать structure map и extraction notes с точными локаторами.
3. Проверить все `source_refs` в `analyst_method_cards.v1.json`; до проверки оригиналов сохранить карточки `draft`.
4. Ввести автоматический validator provenance/dedup.

---

### 2026-09-13 — Side gear / Admin + IB AI Security Control Center

**COMMITS**

```text
abc7d423259a29cba5b101eb33b6f0c1e6ecabec  sanitized admin/config API
73af5d4a1e8f38d6dc8c810af353467ab64570bf  AdminSecurityConsole component
67b5a2b9d28437af78c8d787a50447ea21107f11  control center styles
d0fe1f11af108fc3e995082edb2606d838b4e4cf  side gear mounted in NeuralHud
ab2bb6b1bb046b0af490d5d211d704c1eb5cb6d8  stylesheet connected in layout
```

**TASK**

Добавить сбоку ALINA единый вход в системные настройки для `ADMINISTRATOR` и `IB / AI SECURITY SPECIALIST`, чтобы в одном месте были модели, промты, подключения к базам знаний, база данных и контроль безопасности.

**WHAT CHANGED**

В интерфейс добавлена фиксированная кнопка-шестерёнка `SYS`. Она открывает правую панель `ALINA CONTROL CENTER` с переключателем ролей `Администратор` / `ИБ / AI Security` и разделами:

```text
Модели
Промты
Базы знаний
База данных
Контроль
```

Каталог моделей и routing читаются из существующего `/api/llm`. Новый `/api/admin/config` отдаёт только безопасные метаданные: prompt IDs, физические пути KB, признак настройки PostgreSQL/audit DB и security status. Secret values, connection strings и полные системные промты клиенту не возвращаются.

**WHY**

Ролевые панели Admin и IB уже определены в `processes/ROLE_PANELS_AND_RBAC.md`, но до этого не имели единой точки входа в UI. Решено сделать один системный control center, а различия ролей показывать внутри него. Это уменьшает дублирование UI и соответствует общей архитектуре `one core + role specialization`.

**ORIGIN_CLASS**

```text
HUMAN_DECISION   — пользователь потребовал боковую шестерёнку и общий центр Admin/ИБ;
PROJECT_DECISION — единый Control Center, read-only P0, secret-safe API, дальнейшие privileged writes только после server-side RBAC/audit;
```

**SOURCE / DECISION**

Проектное решение основано на уже существующей ролевой спецификации:

```text
DZ_17/processes/ROLE_PANELS_AND_RBAC.md
DZ_17/app/app/api/llm/route.ts
DZ_17/app/app/use-llm.ts
DZ_17/knowledge_base/PHYSICAL_MAP.md
```

Внешние ГОСТы или книги для этого конкретного UI-изменения не использовались как источник новых требований. Поэтому запись не маркируется `SOURCE_DERIVED`.

**SOURCE LOCATOR**

```text
ROLE_PANELS_AND_RBAC.md → разделы «Панель Администратора», «Панель ИБ / AI Security Specialist», RBAC matrix, Separation of duties.
```

**PHYSICAL PATHS**

Созданы:

```text
DZ_17/app/app/admin-security-console.tsx
DZ_17/app/app/admin-security-console.css
DZ_17/app/app/api/admin/config/route.ts
```

Обновлены:

```text
DZ_17/app/app/neural-hud.tsx
DZ_17/app/app/layout.tsx
DZ_17/DEVELOPMENT_JOURNAL.md
```

**CANONICAL OBJECT IDS**

Новые KB-объекты не создавались. UI использует существующие IDs из `source_registry.v1.json`, `analyst_method_cards.v1.json`, Domain Profiles и LLM model catalog.

**DEPENDENCIES**

```text
/api/llm
/api/admin/config
lucide-react
existing DZ_17 role/RBAC specification
```

**VALIDATION / TEST**

P0 реализован намеренно как `read_only_preview`: UI не может менять privileged configuration, не видит secrets, connection strings или тела системных промтов. Полноценные write operations разрешаются только после server-side authentication + RBAC + audit event contract.

**REVIEW STATUS**

```text
implemented / requires build+runtime acceptance on user machine
```

**RESULT**

Получена единая системная точка входа:

```text
SIDE GEAR SYS
   ↓
ALINA CONTROL CENTER
   ├── ADMINISTRATOR
   │   ├── Models / routing
   │   ├── Prompt registry
   │   ├── KB connections
   │   ├── PostgreSQL / pgvector status
   │   └── Operations
   └── IB / AI SECURITY
       ├── Model security
       ├── Prompt/content security
       ├── KB provenance/integrity
       ├── secrets/data flow
       └── audit/security control
```

**NEXT STEP**

1. Добавить настоящую server-side authentication/RBAC.
2. Создать audited write API для model routing, prompt versions, KB connection policies и DB settings.
3. Добавить model hash/trust state и security hold.
4. Подключить PostgreSQL + pgvector и отдельный event/audit ledger.
5. Провести `npm run build` и UI smoke test после локального `git pull`.

---

### 2026-09-14 — Live Control Plane / RBAC / audited writes

**COMMITS**

```text
a55d2e9b9a3b7b569d0e2f5d253fdd94145e0598  temporary versioned-prompt registry spike
1afa06bba7fa857299a2c77cf87ccbbbd390aeee  removed unwired prompt spike before production use
ade0402d496f4c22566123615c327ec08a2773b0  live Admin/IB controls + RBAC status panel
55e7e9f96f1c875a751d37d9b7ee1c9760713a97  route overrides generalized to all runtime providers
```

**TASK**

Перевести `ALINA CONTROL CENTER` из read-only P0 в реально действующий, но ограниченный и аудируемый control plane для Администратора и ИБ.

**WHAT CHANGED**

Реальные privileged writes включены только при наличии server-side role token. Панель теперь умеет управлять:

```text
ADMINISTRATOR
├── enable / disable model
├── pin model first in AUTO route by task
├── activate / deactivate prompt policy
├── connect / disconnect KB
├── pgvector policy flag
├── backup policy flag
└── object-storage policy flag

IB / AI SECURITY
├── model APPROVED / REVIEW / BLOCKED
├── prompt APPROVED / PENDING / BLOCKED
└── KB SECURITY HOLD / RELEASE
```

Добавлен отдельный раздел `Доступ / RBAC`, который показывает состояние двух независимых привилегированных ролей и separation of duties. Token вводится в браузере только в память текущей страницы и передаётся в `Authorization: Bearer ...`; API его не возвращает и audit log его не сохраняет.

Runtime-состояние записывается локально в:

```text
DZ_17/app/runtime/config/admin-control.v1.json
```

Audit ledger записывается локально в:

```text
DZ_17/app/runtime/audit/admin-events.jsonl
```

Оба каталога уже исключены из Git. `/api/llm` читает `admin-control.v1.json` через `lib/runtime-policy.ts`: disabled/blocked model, blocked/inactive prompt или KB hold учитываются сервером до вызова модели. Route override теперь может ссылаться на любую runtime-модель (`llamacpp`, `gigachat`, `openai`, `compatible`, `ollama`, `demo`); если override недоступен или заблокирован, `/api/llm` безопасно продолжает разрешённый fallback-chain.

**WHY**

Нужно было избежать декоративной админки: изменение модели, маршрута или KB должно реально влиять на runtime, при этом Admin не должен иметь полномочия незаметно снять security block, а ИБ не должен переписывать предметные знания или эксплуатационные настройки.

**ORIGIN_CLASS**

```text
HUMAN_DECISION   — пользователь: «ну вперед» после согласования живого Admin/ИБ Control Center;
PROJECT_DECISION — role-token P0 RBAC, separation of duties, local versioned policy-state, mandatory reason, append-only audit event;
```

**SOURCE / DECISION**

Использованы только существующие проектные спецификации и код:

```text
DZ_17/processes/ROLE_PANELS_AND_RBAC.md
DZ_17/app/app/api/admin/config/route.ts
DZ_17/app/lib/runtime-policy.ts
DZ_17/app/app/api/llm/route.ts
DZ_17/app/.env.example
DZ_17/app/.gitignore
```

Внешние ГОСТы/книги на этом шаге не использовались как источник новых требований; это `PROJECT_DECISION`, а не `SOURCE_DERIVED`.

**SOURCE LOCATOR**

```text
ROLE_PANELS_AND_RBAC.md → Admin panel / IB panel / RBAC matrix / Separation of duties
runtime-policy.ts       → modelPolicyDecision / promptPolicyDecision / kbPolicyDecision / routeOverrideForTask
api/llm/route.ts        → effectiveCatalog / effectiveAutoCandidates / policy checks before provider call
```

**PHYSICAL PATHS**

Обновлены:

```text
DZ_17/app/app/admin-security-console.tsx
DZ_17/app/app/api/admin/config/route.ts
DZ_17/DEVELOPMENT_JOURNAL.md
```

Runtime-only generated paths:

```text
DZ_17/app/runtime/config/admin-control.v1.json
DZ_17/app/runtime/audit/admin-events.jsonl
```

**CANONICAL OBJECT IDS**

Новые предметные KB-объекты не создавались. Control plane оперирует уже существующими model IDs, prompt IDs и KB IDs. Состояние является runtime policy, а не копией самой KB.

**DEPENDENCIES**

```text
ALINA_ADMIN_TOKEN
ALINA_SECURITY_TOKEN
/api/admin/config
/api/llm
lib/runtime-policy.ts
```

**VALIDATION / TEST**

GitHub Actions:

```text
workflow: DZ-17 ALINA Multimodal Check
run:      34809336362
commit:   55e7e9f96f1c875a751d37d9b7ee1c9760713a97
result:   SUCCESS
```

Проверяемые ограничения:

```text
- без server-side token privileged write отклоняется;
- неверный Bearer token → 401;
- action + target + reason обязательны;
- Admin и IB имеют разные разрешённые actions;
- secret values / connection strings не возвращаются;
- каждое успешное изменение повышает control state version;
- каждое успешное изменение добавляет audit event;
- runtime policy читается непосредственно LLM Gateway;
- route override не отменяет безопасный fallback при недоступной/blocked модели.
```

Временный `prompt-registry.ts` spike был удалён до подключения к runtime, потому что создавал бы второй source-of-truth рядом с системными промтами в `api/llm/route.ts`. Это сознательно отклонённый вариант, а не завершённая функция.

**REVIEW STATUS**

```text
implementation: CI green
local privileged-write acceptance: pending user runtime with ALINA_ADMIN_TOKEN / ALINA_SECURITY_TOKEN
```

**RESULT**

```text
SYS GEAR
  ↓
CONTROL CENTER
  ├── ADMIN token → operations/routing/connectivity
  ├── SECURITY token → approval/block/hold
  ├── runtime policy state
  ├── audit ledger
  └── /api/llm enforcement
```

**NEXT STEP**

1. Сделать настоящие individual identities: users/groups + session/OIDC вместо shared role tokens.
2. Реализовать versioned prompt-body workflow без второго source-of-truth: draft → IB review → approved → activate → rollback.
3. Подключить реальный PostgreSQL + pgvector persistence и health check, затем перенести audit ledger в отдельную БД/таблицу с append-only policy.
4. Добавить hash/source/trust metadata для локальных моделей и security quarantine.
5. Добавить UI acceptance для Admin/IB сценариев в CI.

---

## 4. Шаблон следующей записи

```markdown
### YYYY-MM-DD — <короткое название>

**COMMITS**
...

**TASK**
...

**WHAT CHANGED**
...

**WHY**
...

**ORIGIN_CLASS**
`SOURCE_DERIVED | PROJECT_DECISION | ASSISTANT_PROPOSAL | HUMAN_DECISION | BENCHMARK_MEASURED | INFERENCE | HYPOTHESIS`

**SOURCE / DECISION**
...

**SOURCE LOCATOR**
...

**PHYSICAL PATHS**
...

**CANONICAL OBJECT IDS**
...

**DEPENDENCIES**
...

**VALIDATION / TEST**
...

**REVIEW STATUS**
...

**RESULT**
...

**NEXT STEP**
...
```

---

## 5. Запрет на «тихие» изменения

Нельзя считать работу завершённой, если:

- создан новый KB-объект, но он не зарегистрирован;
- правило из внешнего источника не имеет `source_ref` и точного locator;
- проектная идея записана так, будто она взята из ГОСТа или книги;
- файл перемещён, но `PHYSICAL_MAP.md` не обновлён;
- создана вторая копия знания вместо ссылки на canonical ID;
- изменена методика, но не указана версия/supersedes;
- нет записи, какой commit/путь содержит изменение.
