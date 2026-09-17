# ALINA Analyst Core — панели ролей и RBAC

## 1. Роли

Базовые роли P0:

```text
USER / ANALYST
ADMINISTRATOR
IB / AI SECURITY SPECIALIST
HUMAN REVIEWER / DOMAIN EXPERT
SYSTEM SERVICE ACCOUNT
GPT SENIOR ANALYST
```

Роли могут комбинироваться только через явные grants. Сервисные и модельные субъекты не получают интерактивные пользовательские права.

---

# 2. Панель Пользователя / Аналитика

## Основная задача

Загрузить материал, видеть каждый этап обработки, работать с результатами и принимать предметные решения в рамках своих workspace/KB.

## Экраны

### Dashboard

- мои active runs;
- recent sources;
- waiting for review;
- ready results;
- warnings/errors, требующие действия пользователя;
- выбранный Domain Profile;
- используемая KB/workspace.

### Live Process

Живая схема:

```text
RECEIVED → QUEUED → PROCESSING → HANDOFF → REVIEW → READY
```

Пользователь видит разрешённые input/output каждого этапа, duration, model/tool trace и provenance.

### Source Viewer

- оригинал;
- fragments/chunks;
- hash;
- metadata;
- version;
- links to observations/evidence.

### Knowledge Review

```text
PROPOSED
├─ APPROVE
├─ REJECT
├─ EDIT
└─ REQUEST RECHECK
```

### KB Explorer

- сущности;
- факты;
- связи;
- timeline;
- claims;
- hypotheses;
- contradictions;
- evidence/provenance;
- domain-specific views.

### Reports

- query result;
- analytical report;
- JSON/CSV/PDF export subject to policy;
- source trace appendix.

## Права пользователя

```text
read own workspace
create source/run
read allowed source fragments
read analysis results
approve/reject if granted reviewer permission
query allowed KB
export if policy allows
```

Нет права управлять системными моделями, глобальными ACL, secret store и security policy.

---

# 3. Панель Администратора

## Основная задача

Эксплуатация системы, моделей, очередей, пользователей и конфигурации без права скрыто изменять предметные выводы.

## Экраны

### Operations

- service health;
- queue depth;
- running jobs;
- failed jobs;
- retries;
- CPU/GPU/RAM;
- storage/DB health;
- external API health;
- SLO breaches.

### Models

- discovered local models;
- external providers;
- capabilities;
- loaded/unloaded state;
- routing by task;
- fallback chain;
- model version/hash;
- latency/error statistics;
- enable/disable;
- canary/baseline selection.

### Jobs

- search by run/job/trace;
- inspect stage graph;
- retry technical failure;
- cancel job;
- reprioritize queue;
- quarantine/release only if security policy and role allow.

### Users & Access

- users;
- roles;
- workspace membership;
- grants/revocations;
- service accounts;
- session/audit status.

### Configuration

- Domain Profiles;
- schemas;
- queues;
- timeouts;
- thresholds;
- notification policies;
- retention;
- backup schedules.

### Incidents

- technical incidents;
- affected runs;
- root cause;
- recovery actions;
- linked security incidents.

Администратор **не может незаметно изменить verified knowledge**. Любая административная операция фиксируется в audit log.

---

# 4. Панель ИБ / AI Security Specialist

## Основная задача

Защита AI-контура, данных, моделей, API и KB от компрометации, утечек, poisoning, prompt injection и несанкционированных изменений.

## Экраны

### Security Overview

- active security findings;
- blocked/quarantined runs;
- risk score by workspace/model/KB;
- unauthorized access attempts;
- secret detections;
- model integrity issues;
- provenance integrity issues;
- poisoning/injection findings;
- suspicious exports;
- unpatched vulnerabilities.

### AI Model Security

- model inventory;
- source/repository of model;
- file SHA-256;
- approved/trusted status;
- model capabilities;
- runtime isolation;
- change history;
- anomalous behavior metrics;
- allowed data classes;
- blocked model versions.

### Prompt / Content Security

- prompt injection findings;
- hostile document instructions;
- hidden/embedded instructions;
- suspicious OCR/STT content;
- tool-abuse attempts;
- unsafe model routing request;
- policy decision and disposition.

### KB Security

- unauthorized fact publication attempts;
- missing provenance;
- bulk suspicious edits;
- integrity checks;
- poisoning clusters;
- unexpected entity/relation spikes;
- version chain;
- rollback/supersede history.

### Secrets & Data Flow

- secret detections;
- API key exposure attempts;
- PII/data-class flags where applicable;
- which provider received which data class;
- redaction events;
- export history.

### Access & Audit

- RBAC/ABAC matrix;
- privileged changes;
- service accounts;
- authentication events;
- audit completeness;
- policy exceptions.

### Security Incident

- incident timeline;
- affected source/run/model/KB;
- IOC/technical evidence where relevant;
- containment;
- eradication;
- recovery;
- lessons learned;
- new rule/validator recommendation.

---

# 5. Панель Human Reviewer / Domain Expert

## Назначение

Проверка только тех элементов, где машинная и Senior-проверка не дают достаточной уверенности либо решение имеет высокий impact.

Показывается:

```text
candidate
source fragment
provenance
local result
GPT Senior result
contradiction/counter-evidence
confidence
impact/severity
```

Действия:

```text
APPROVE
REJECT
EDIT
REQUEST_MORE_EVIDENCE
REQUEST_REANALYSIS
ESCALATE
```

---

# 6. Переключение предметных баз знаний

Верхний workspace selector:

```text
Workspace
└─ Domain Profile
   └─ Knowledge Base
      └─ Version / Branch / Scope
```

Примеры:

```text
Narrative KB
OSINT KB
Cybersecurity KB
Regulatory KB
Engineering KB
```

Одна и та же UI-shell ALINA используется для разных специальностей; меняются ontology, аналитические роли, validators, поля карточек, доступные модели и evidence policy.

---

# 7. RBAC matrix P0

| Action | User | Admin | IB | Reviewer |
|---|:---:|:---:|:---:|:---:|
| Create source/run | ✅ | ✅ | по необходимости | ✅ |
| Read own permitted results | ✅ | ✅ | ✅ security scope | ✅ |
| Retry technical job | ❌ | ✅ | ✅ security job | ❌ |
| Change model routing | ❌ | ✅ | approve/restrict | ❌ |
| Manage users/roles | ❌ | ✅ | audit/approve privileged | ❌ |
| View secrets | ❌ | restricted | restricted security | ❌ |
| View security findings | own-safe only | ops subset | ✅ | relevant only |
| Block model/source | ❌ | technical disable | ✅ security block | ❌ |
| Approve knowledge | if granted | ❌ by default | ❌ by default | ✅ |
| Publish verified KB | workflow only | workflow ops | security veto/hold | workflow decision |
| Change verified record directly | ❌ | ❌ | ❌ | ❌ |
| Supersede record via workflow | reviewer grant | support workflow | security hold | ✅ |
| Export | policy-based | policy-based | audit/control | policy-based |

## 8. Separation of duties

Критические операции не должны концентрироваться у одной роли:

```text
Admin manages runtime ≠ approves knowledge
Reviewer approves knowledge ≠ manages audit logs
IB can block/hold ≠ silently rewrite knowledge
Model/service account executes ≠ grants itself access
```

Все privileged actions требуют audit event; для особо критичных операций возможен dual approval.
