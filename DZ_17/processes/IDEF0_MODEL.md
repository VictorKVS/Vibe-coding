# ALINA Analyst Core — функциональная модель IDEF0

## 1. Назначение

Документ описывает функциональную модель Analyst Core в терминах IDEF0: `Input`, `Control`, `Output`, `Mechanism` (ICOM). Представление используется как нормативно-ориентированный функциональный слой; детальная последовательность и ответственность дополнительно раскрываются BPMN.

---

# 2. Контекст A-0

## Функция A-0

**Формировать и поддерживать проверяемую предметную базу знаний из неструктурированных данных.**

### Inputs

- документы PDF/DOCX/XLSX/PPTX/TXT/MD;
- изображения и скриншоты;
- аудио и видео;
- OSINT/web captures;
- пользовательские запросы;
- результаты предыдущих сессий;
- внешние evidence packages.

### Controls

- Domain Profile и онтология;
- политика evidence-first;
- критерии качества и confidence thresholds;
- правила GPT Senior Review;
- политики Human Review;
- маршруты моделей;
- правила ИБ;
- RBAC/ABAC;
- правила публикации в KB;
- схемы данных и версии;
- process policy / SLA / SLO.

### Outputs

- verified knowledge records;
- Candidate Knowledge Packages;
- отчёты и аналитические выводы;
- граф сущностей/связей;
- индексы/RAG;
- contradictions / hypotheses / open questions;
- provenance map;
- correction / experience records;
- security/audit events;
- рекомендации по улучшению процессов.

### Mechanisms

- ALINA Web UI;
- API Gateway;
- Tool Zoo;
- Analysis Zoo;
- Local LLM / llama.cpp;
- Vision / STT;
- GigaChat / GPT Senior;
- PostgreSQL + pgvector;
- object storage;
- Queue/Scheduler;
- telemetry/monitoring;
- Human Reviewer;
- Administrator;
- ИБ-специалист.

---

# 3. Декомпозиция A0

```text
A1 Принимать и регистрировать источники
   ↓
A2 Извлекать и нормализовать данные
   ↓
A3 Выполнять аналитическое разложение
   ↓
A4 Проверять, разрешать противоречия и верифицировать
   ↓
A5 Сохранять, индексировать и публиковать знания
   ↓
A6 Накапливать опыт и улучшать процессы
```

## A1 — Принимать и регистрировать источники

**Input:** файл/URL/текст/media/OSINT package.  
**Control:** правила допустимых форматов, security policy, access policy, Domain Profile.  
**Output:** `Source`, `Capture`, SHA-256, metadata, intake status.  
**Mechanism:** UI/API, File Service, Security Triage, PostgreSQL, object storage.

Подфункции:

```text
A11 Receive request
A12 Validate format/size
A13 Register Source
A14 Create Capture
A15 Calculate hash
A16 Security triage
A17 Route to ingest
```

## A2 — Извлекать и нормализовать данные

**Input:** зарегистрированный Capture.  
**Control:** parser rules, OCR/STT/Vision policy, chunking profile, encoding rules.  
**Output:** normalized fragments/chunks, observations, metadata.  
**Mechanism:** parsers, OCR, STT, Vision, FFmpeg, normalization services.

Подфункции:

```text
A21 Detect content type
A22 Parse/extract
A23 OCR/STT/Vision pre-pass
A24 Normalize
A25 Deduplicate
A26 Segment/chunk
A27 Register fragments + provenance
```

## A3 — Выполнять аналитическое разложение

**Input:** fragments, observations, accepted evidence.  
**Control:** Domain Profile, ontology, extraction schemas, model routes, confidence rules.  
**Output:** entities, claims, fact/relation/event/timeline candidates, hypotheses.  
**Mechanism:** Analysis Orchestrator, local LLM, rules, embeddings, reranker.

Подфункции:

```text
A31 Entity analysis
A32 Claim analysis
A33 Fact candidate analysis
A34 Relation analysis
A35 Event analysis
A36 Timeline analysis
A37 Knowledge-state/dialogue analysis
A38 Contradiction analysis
A39 Hypothesis/counter-evidence preparation
```

## A4 — Проверять, разрешать противоречия и верифицировать

**Input:** Candidate Knowledge Package.  
**Control:** Senior Review policy, evidence thresholds, severity matrix, Human Review policy.  
**Output:** reviewed/corrected candidates, rework requests, approved/rejected decisions.  
**Mechanism:** GPT Senior/GigaChat, Socrates, Human Reviewer, comparison engine.

Подфункции:

```text
A41 Package validation
A42 GPT Senior Review
A43 Contradiction resolution
A44 Counter-evidence review
A45 Request more data/rework
A46 Human Review when required
A47 Final approval decision
```

## A5 — Сохранять, индексировать и публиковать знания

**Input:** approved verified records.  
**Control:** KB publication rules, versioning, integrity policy, domain scope.  
**Output:** published knowledge, indexes, graphs, versions, audit events.  
**Mechanism:** PostgreSQL, pgvector, graph representation, object storage, audit log.

Подфункции:

```text
A51 Validate publication schema
A52 Commit verified record
A53 Write provenance edges
A54 Update vector index
A55 Update relation/entity graph
A56 Create new KB version
A57 Emit publication event
```

## A6 — Накапливать опыт и улучшать процессы

**Input:** local result, Senior correction, Human correction, telemetry, incidents.  
**Control:** improvement policy, quality KPIs, change management.  
**Output:** Experience Store, updated prompts/rules/routes/profiles, training candidates.  
**Mechanism:** telemetry, comparison jobs, admin/analyst review, CI/CD.

Подфункции:

```text
A61 Capture correction pair
A62 Classify error reason
A63 Measure analyst accuracy
A64 Update routing/prompt/rule candidate
A65 Test against benchmark corpus
A66 Approve configuration change
A67 Publish new analyst/profile version
```

---

# 4. ICOM-матрица

| Function | Input | Control | Output | Mechanism |
|---|---|---|---|---|
| A1 | source material | access/security/input policy | Source/Capture | UI/API/File/Security |
| A2 | Capture | parser/chunk policy | Fragments/Observations | Tool Zoo |
| A3 | Evidence | ontology/profile/schema | Knowledge candidates | Analysis Zoo/local LLM |
| A4 | Candidate Package | review/evidence policy | Reviewed decisions | GPT Senior/Human |
| A5 | Approved records | publication/version policy | Verified KB | DB/pgvector/storage |
| A6 | Corrections/metrics | improvement/change policy | Updated rules/models/profile | Telemetry/CI/Admin |

---

# 5. Правило соответствия реализации модели

Каждый блок A1–A6 обязан иметь:

- `process_id`;
- API endpoint(s);
- входную JSON Schema;
- выходную JSON Schema;
- набор событий состояния;
- owner role;
- KPI/SLO;
- failure modes;
- security controls;
- audit events;
- version.

Таким образом IDEF0 остаётся не декоративной схемой, а индексом к исполняемым API и процессным контрактам.
