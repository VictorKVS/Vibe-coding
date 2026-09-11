# ALINA / Universal Analyst Core — C4 Architecture

## 0. Назначение

Этот документ фиксирует архитектуру Universal Analyst Core в модели C4 и является переходом от генерального ТЗ к API-контрактам.

Ключевой принцип:

```text
RAW DATA
→ TOOL ZOO
→ OBSERVATIONS / EVIDENCE
→ ANALYSIS ZOO
→ CANDIDATE KNOWLEDGE PACKAGE
→ GPT SENIOR ANALYST
→ HUMAN REVIEW when required
→ VERIFIED KNOWLEDGE
→ DOMAIN KB
→ EXPERIENCE STORE
```

В C4 используем:

- Level 1 — System Context;
- Level 2 — Containers;
- Level 3 — Components;
- Level 4 — code-level boundaries/модули ключевых контейнеров;
- Deployment — отдельная схема развёртывания на текущем ПК.

---

# 1. C4 Level 1 — System Context

```mermaid
flowchart LR
    U[Пользователь / Аналитик] -->|создаёт кейс, загружает материалы, review| A[ALINA Universal Analyst Core]

    S1[Документы / файлы] -->|PDF DOCX TXT MD XLSX PPTX| A
    S2[Изображения] -->|JPG PNG WEBP| A
    S3[Аудио / Видео] -->|audio video| A
    S4[OSINT / Web / внешние источники] -->|source material| A

    A -->|Candidate Knowledge Package| GPT[GPT Senior Analyst]
    GPT -->|accept / reject / correct / questions| A

    A -->|deep review / fallback / second opinion| GIGA[GigaChat]
    GIGA -->|analysis result| A

    A -->|human escalation| H[Human Reviewer]
    H -->|approve / reject / edit / recheck| A

    A -->|verified records| KB[Domain Knowledge Bases]
    KB -->|RAG / graph / query context| A
```

## Ответственность системы

ALINA отвечает за:

- регистрацию источников;
- сохранение оригинала и provenance;
- декомпозицию и нормализацию;
- Tool Zoo;
- Evidence Layer;
- Analysis Zoo;
- Candidate Knowledge Package;
- взаимодействие с GPT Senior Analyst;
- human review workflow;
- запись verified knowledge;
- Experience/Correction Store;
- Model Manager;
- scheduler и telemetry.

ALINA **не** должна скрыто повышать статус `observation/claim/hypothesis` до `verified fact`.

---

# 2. C4 Level 2 — Containers

```mermaid
flowchart TB
    UI[Web UI\nNext.js / vinext]
    API[Analyst API Gateway]
    ING[Ingestion Service]
    ORCH[Analysis Orchestrator]
    TOOL[Tool Zoo]
    AZ[Analysis Zoo]
    PKG[Candidate Package Builder]
    VERIFY[Verification Service]
    MM[Model Manager]
    Q[Queue / Scheduler]
    TEL[Telemetry / Audit]
    DB[(PostgreSQL + pgvector)]
    OBJ[(Object/File Storage)]
    GPT[GPT Senior Analyst]
    GIGA[GigaChat API]
    LOCAL[llama.cpp local runtime]

    UI --> API
    API --> ING
    API --> ORCH
    API --> VERIFY
    API --> MM

    ING --> OBJ
    ING --> DB
    ING --> Q

    Q --> TOOL
    Q --> AZ
    Q --> VERIFY

    TOOL --> DB
    TOOL --> OBJ
    TOOL --> ORCH

    ORCH --> AZ
    AZ --> DB
    AZ --> PKG

    PKG --> DB
    PKG --> VERIFY

    VERIFY --> GPT
    VERIFY --> GIGA
    VERIFY --> DB

    MM --> LOCAL
    MM --> GIGA
    MM --> GPT
    ORCH --> MM
    AZ --> MM
    VERIFY --> MM

    TEL -.-> API
    TEL -.-> ING
    TEL -.-> TOOL
    TEL -.-> AZ
    TEL -.-> VERIFY
    TEL -.-> MM
```

## Контейнеры

| Container | Назначение | Принимает | Отдаёт |
|---|---|---|---|
| Web UI | пользовательская работа | actions/forms/files | REST calls, review decisions |
| Analyst API Gateway | единая входная точка | HTTP/JSON/multipart | normalized API responses |
| Ingestion Service | регистрация и разбор источника | SourceCreate, file refs | Source, Capture, Fragment jobs |
| Analysis Orchestrator | строит план анализа | case/profile/source refs | ToolTask/AnalysisTask/PackageTask |
| Tool Zoo | извлекает observations | source/fragment refs | Observation/Evidence candidates |
| Analysis Zoo | строит кандидаты знаний | evidence refs/profile | entity/claim/fact/relation/event/... candidates |
| Candidate Package Builder | компактный пакет для Senior | candidates + provenance | CandidateKnowledgePackage |
| Verification Service | Senior/Human review | package/review task | ReviewDecision/Corrections/Questions |
| Model Manager | модель/провайдер/маршрут | role/task/capability | model execution/result/trace |
| Queue/Scheduler | приоритеты и ресурсы | jobs | assigned jobs/status |
| Storage Layer | source of truth | domain records | DB/object records |
| Telemetry/Audit | трассировка | events/metrics | dashboards/logs/ETA |

---

# 3. C4 Level 3 — Components

## 3.1 Analysis Orchestrator

```mermaid
flowchart LR
    PLAN[Plan Builder] --> ROUTE[Role Router]
    ROUTE --> RES[Resource Scheduler]
    RES --> EXEC[Task Executor]
    EXEC --> MERGE[Result Merger]
    MERGE --> QC[Quality Gate]
    QC --> NEXT[Next-Step Planner]
    NEXT --> ROUTE
```

### Компоненты

- `PlanBuilder` — строит DAG анализа по Domain Profile;
- `RoleRouter` — определяет аналитика/инструмент;
- `ResourceScheduler` — CPU/GPU/EXTERNAL;
- `TaskExecutor` — выполняет ToolTask/AnalysisTask;
- `ResultMerger` — объединяет результаты, не скрывая disagreement;
- `QualityGate` — проверяет schema/provenance/confidence;
- `NextStepPlanner` — решает: продолжать, эскалировать, собрать package.

## 3.2 Tool Zoo

```mermaid
flowchart TB
    SRC[Source/Fragment] --> PARSE[Parsers]
    SRC --> OCR[OCR]
    SRC --> STT[STT]
    SRC --> META[Metadata / EXIF]
    SRC --> VISION[Vision Observation]
    PARSE --> NORM[Normalizer]
    OCR --> NORM
    STT --> NORM
    META --> NORM
    VISION --> NORM
    NORM --> OBS[Observation Records]
    OBS --> EMB[Embeddings / Rerank]
    OBS --> EVID[Evidence Candidates]
```

Tool Zoo выдаёт **Observation**, а не knowledge fact.

## 3.3 Analysis Zoo

```mermaid
flowchart TB
    E[Evidence Set] --> EN[Entity Analyst]
    E --> CL[Claim Analyst]
    E --> FA[Fact Candidate Analyst]
    E --> RE[Relation Analyst]
    E --> EV[Event Analyst]
    E --> TL[Timeline Analyst]
    E --> CA[Cause/Effect Analyst]
    E --> KS[Knowledge-State Analyst]
    E --> DI[Dialogue Analyst]
    E --> VI[Visual/Continuity Analyst]
    E --> HY[Hypothesis Analyst]
    E --> CO[Contradiction Analyst]
    E --> SR[Source Reliability Analyst]

    EN --> AGG[Candidate Aggregator]
    CL --> AGG
    FA --> AGG
    RE --> AGG
    EV --> AGG
    TL --> AGG
    CA --> AGG
    KS --> AGG
    DI --> AGG
    VI --> AGG
    HY --> AGG
    CO --> AGG
    SR --> AGG

    AGG --> PKG[Candidate Package Builder]
```

## 3.4 Verification Service

```mermaid
flowchart LR
    P[Candidate Package] --> PRE[Pre-check]
    PRE --> SEN[GPT Senior Review]
    SEN --> D{Decision}
    D -->|accept| A[Accepted candidates]
    D -->|correct| C[Corrections]
    D -->|reject| R[Rejected candidates]
    D -->|ask_more| Q[Research gaps]
    D -->|human_required| H[Human Review Queue]
    H --> HF[Human Decision]
    A --> PUB[KB Publisher]
    C --> PUB
    HF --> PUB
    C --> EXP[Experience Store]
    R --> EXP
    HF --> EXP
```

---

# 4. C4 Level 4 — Code boundaries

P0 не фиксирует конкретные классы навсегда, но задаёт модульные границы.

```text
analyst-core/
├── api/
│   ├── sources.py
│   ├── cases.py
│   ├── jobs.py
│   ├── analysis.py
│   ├── reviews.py
│   ├── kb.py
│   └── models.py
├── ingest/
│   ├── registry.py
│   ├── capture.py
│   ├── chunking.py
│   └── adapters/
├── tools/
│   ├── parser/
│   ├── ocr/
│   ├── stt/
│   ├── metadata/
│   ├── vision/
│   └── embeddings/
├── analysis/
│   ├── orchestrator.py
│   ├── router.py
│   ├── merger.py
│   ├── entity.py
│   ├── claim_fact.py
│   ├── relation.py
│   ├── event_timeline.py
│   ├── contradiction.py
│   ├── hypothesis.py
│   └── domain/
├── review/
│   ├── package_builder.py
│   ├── senior_client.py
│   ├── decision_engine.py
│   └── human_queue.py
├── kb/
│   ├── publisher.py
│   ├── provenance.py
│   ├── versioning.py
│   └── query.py
├── experience/
│   ├── corrections.py
│   └── examples.py
├── models/
│   ├── manager.py
│   ├── llama_cpp.py
│   ├── gigachat.py
│   └── openai.py
├── scheduler/
│   ├── queue.py
│   └── resources.py
└── telemetry/
    ├── metrics.py
    └── audit.py
```

Правило зависимостей:

```text
api → application/orchestrator
application → domain contracts
adapters → external systems
storage/model providers implement interfaces

domain logic MUST NOT import concrete provider SDKs
```

---

# 5. Deployment — текущий ПК

```mermaid
flowchart LR
    subgraph PC[Windows 11 / текущий ПК]
        UI[ALINA Web UI]
        API[Analyst API]
        CORE[Analyst Core]
        LLAMA[llama.cpp router]
        PG[(PostgreSQL + pgvector)]
        FS[(Local Object Storage)]
        Q[Queue/Scheduler]
        UI --> API --> CORE
        CORE --> PG
        CORE --> FS
        CORE --> Q
        Q --> LLAMA
    end

    CORE -->|HTTPS| GIGA[GigaChat]
    CORE -->|HTTPS| GPT[GPT Senior]
```

Плановый resource policy:

```text
CPU-heavy workers = 4
GPU-heavy workers = 1
External concurrent = 2 baseline
```

---

# 6. Главная последовательность взаимодействия

```mermaid
sequenceDiagram
    participant U as User
    participant API as Analyst API
    participant I as Ingest
    participant O as Orchestrator
    participant T as Tool Zoo
    participant A as Analysis Zoo
    participant P as Package Builder
    participant S as GPT Senior
    participant H as Human Review
    participant K as Knowledge Base
    participant E as Experience Store

    U->>API: Create case + source
    API->>I: Source/Capture registration
    I-->>API: source_id, fragments
    API->>O: Start analysis(case_id, profile)
    O->>T: ToolTask(fragment refs)
    T-->>O: observations + provenance
    O->>A: AnalysisTask(evidence refs)
    A-->>O: candidates + contradictions
    O->>P: Build Candidate Package
    P-->>O: package_id
    O->>S: SeniorReviewRequest(package)
    S-->>O: ReviewDecision + corrections/questions
    alt Human review required
        O->>H: HumanReviewTask
        H-->>O: approve/reject/edit
    end
    O->>K: Commit verified knowledge
    O->>E: Store local result + corrections + reason
    O-->>API: analysis completed
    API-->>U: verified result + trace
```

---

# 7. Что кому передаётся — краткая матрица

| From | To | Contract | Содержимое |
|---|---|---|---|
| UI | API | `CreateSourceRequest` | metadata + file/reference |
| API | Ingest | `IngestCommand` | source_id + capture policy |
| Ingest | Storage | `Source/Capture/Fragment` | originals + hashes + chunks |
| Orchestrator | Tool Zoo | `ToolTask` | refs, requested tool, profile |
| Tool Zoo | Orchestrator | `ToolResult` | observations + provenance + metrics |
| Orchestrator | Analysis Zoo | `AnalysisTask` | evidence refs + role + profile + schema |
| Analysis Zoo | Orchestrator | `AnalysisResult` | candidates + confidence + trace |
| Orchestrator | Package Builder | `PackageBuildRequest` | selected candidates + provenance |
| Package Builder | Senior | `CandidateKnowledgePackage` | compact verified-for-review package |
| Senior | Verification | `SeniorReviewResult` | accept/reject/correct/ask/human_required |
| Verification | Human UI | `HumanReviewTask` | disputed/high-impact candidates + evidence |
| Human UI | Verification | `HumanReviewDecision` | approve/reject/edit/recheck |
| Verification | KB Publisher | `VerifiedKnowledgeBatch` | only publishable records |
| KB Publisher | Experience Store | `CorrectionExample` | before/after/reason/reviewer/model |

Следующий документ: [`API_CONTRACTS.md`](API_CONTRACTS.md).
