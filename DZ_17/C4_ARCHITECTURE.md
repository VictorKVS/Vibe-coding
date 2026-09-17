# ALINA Knowledge Factory / Universal Analyst Core — C4 Architecture

Version: `0.2`  
Status: `SELECTED / EVOLVING`

## 0. Назначение

C4 отвечает на вопрос **где и какими программными границами реализуются функции IDEF0 A1–A9**.

Функциональная master-модель: `processes/IDEF0_MODEL.md`.  
Последовательность/роли: `processes/BPMN_MAIN_PROCESS.md`.  
Data model: `design/CANONICAL_KNOWLEDGE_DATA_MODEL.md`.

Ключевой поток:

```text
SOURCE
→ STRUCTURE
→ SEMANTIC OBJECTS
→ PRIOR ART / EVIDENCE
→ METHOD / ALGORITHM
→ POLYGON
→ SECURITY GATE
→ CANONICAL KB
→ MINIMAL SUFFICIENT RAG
→ FEEDBACK / NEW VERSION
```

P0 архитектурный принцип:

```text
LOGICAL BOUNDARIES NOW
PHYSICAL MICROSERVICES ONLY WHEN MEASUREMENTS REQUIRE THEM
```

То есть на первом этапе строим модульный монолит/несколько локальных процессов, а не заранее размножаем сервисы.

---

# 1. C4 Level 1 — System Context

```mermaid
flowchart LR
    U[Пользователь / Аналитик] -->|материалы, задачи, review| A[ALINA Knowledge Factory]

    SRC[Books / Papers / Laws / Standards / Web / Media] -->|source material| A
    SCI[Scientific & Professional Sources] <-->|prior art / evidence discovery| A

    A -->|human escalation| H[Human Reviewer]
    H -->|approve / reject / edit| A

    A <-->|LLM execution| EXT[External LLM providers]
    A <-->|local inference| LOC[Local Model Zoo / llama.cpp]

    A -->|approved knowledge / methods / algorithms| AG[ALINA Agents / Human users]
    AG -->|feedback / corrections / telemetry| A
```

ALINA отвечает за provenance, canonical identity, evidence graph, algorithm lifecycle, polygon, security admission и controlled delivery.

ALINA не принимает model output за независимое доказательство и не позволяет retrieved content менять control-plane конфигурацию.

---

# 2. C4 Level 2 — Logical Containers

```mermaid
flowchart TB
    UI[Web UI]
    API[API + Orchestrator]
    SS[Source & Structure]
    SE[Semantic & Evidence]
    AE[Method & Algorithm Engineering]
    POLY[Polygon / QA]
    SEC[Security Gate / Algorithm Firewall]
    RET[Retrieval & Delivery]
    MM[Model Gateway / Router]
    Q[Queue / Scheduler]
    TEL[Telemetry / Audit]

    DB[(PostgreSQL + pgvector\nCanonical Knowledge Store)]
    OBJ[(Object Storage\nOriginals / cold artifacts)]
    CTRL[(Protected Control Store\npolicies / approved configs)]

    LOC[llama.cpp / Local Zoo]
    EXT[External LLMs]
    WEB[Scientific/Web sources]

    UI --> API
    API --> SS
    API --> SE
    API --> AE
    API --> RET

    SS --> OBJ
    SS --> DB
    SS --> Q

    SE --> DB
    SE --> WEB
    SE --> MM

    AE --> DB
    AE --> MM
    AE --> POLY

    POLY --> DB
    POLY --> SEC
    POLY --> MM

    SEC --> DB
    SEC --> CTRL

    RET --> DB
    RET --> OBJ
    RET --> CTRL

    MM --> LOC
    MM --> EXT

    Q --> SS
    Q --> SE
    Q --> POLY

    TEL -.-> API
    TEL -.-> SS
    TEL -.-> SE
    TEL -.-> AE
    TEL -.-> POLY
    TEL -.-> SEC
    TEL -.-> RET
```

## 2.1 Container responsibilities

| Container | IDEF0 | Responsibility |
|---|---|---|
| Web UI | all | управление задачами, review, trace, карты знаний |
| API + Orchestrator | A1–A9 | jobs, state transitions, routing, contracts |
| Source & Structure | A1–A2 | Source/Capture/hash/security intake, parsing, StructureNode/SourceSpan |
| Semantic & Evidence | A3–A4 | Claim/Concept, prior art, Evidence graph, contradiction, synthesis |
| Method & Algorithm Engineering | A5 | Method/Algorithm/ImplementationOption и trace каждого шага |
| Polygon / QA | A6 | benchmark, normal/boundary/what-if/adversarial scenarios |
| Security Gate | A1/A7 | knowledge security status, algorithm firewall, allow/restrict/hold/reject |
| Retrieval & Delivery | A8 | minimal sufficient evidence, RAG escalation, localized projection |
| Model Gateway | support | local/cloud routing, provider isolation, model trace |
| Queue/Scheduler | support | long-running work, retries, resource limits |
| Telemetry/Audit | A9/support | immutable-ish events, metrics, regression/feedback |
| PostgreSQL + pgvector | A1–A9 | canonical data model + graph projection + vector indexes |
| Object Storage | A1–A2/A8 | original captures/cold artifacts; content-addressed dedup |
| Protected Control Store | A5–A8 | approved runtime config/policies/tool permissions; no RAG write path |

---

# 3. P0 physical choice: modular monolith

Logical container does not automatically mean separate deployable service.

P0:

```text
ALINA WEB/RUNTIME PROCESS
├── api-orchestrator module
├── source-structure module
├── semantic-evidence module
├── algorithm-engineering module
├── retrieval module
├── security-policy adapter
└── telemetry adapter

SEPARATE LOCAL PROCESSES
├── llama.cpp router
├── PostgreSQL + pgvector
└── optional polygon workers

STORAGE
├── PostgreSQL
└── local/object filesystem
```

Выносить модуль в отдельный process/service будем при измеренном основании: изоляция безопасности, отдельный scaling profile, ресурсный конфликт, latency/SLO или независимый lifecycle.

---

# 4. C4 Level 3 — Components

## 4.1 Source & Structure

```mermaid
flowchart LR
    IN[Source Intake] --> HASH[Capture + Hash]
    HASH --> TRIAGE[Security Intake Triage]
    TRIAGE --> PARSE[Parser/OCR/STT/Vision adapters]
    PARSE --> STR[Structure Reconstructor]
    STR --> SPAN[SourceSpan Registry]
    SPAN --> QC[Structure Quality Gate]
```

Не создаёт canonical semantic knowledge.

## 4.2 Semantic & Evidence

```mermaid
flowchart TB
    SP[SourceSpan refs] --> CLAIM[Claim/Concept Extractor]
    CLAIM --> RESOLVE[Canonical Resolver / Dedup]
    RESOLVE --> PA[Prior-Art Planner]
    PA --> DISC[Evidence Discovery]
    DISC --> MAP[Evidence Mapper]
    MAP --> CONTRA[Contradiction / Limitation Analysis]
    CONTRA --> SYN[Evidence Synthesis]
    SYN --> GAP[Gap / Open Question Detector]
```

Принцип: новый canonical object создаётся только после resolve/search existing.

## 4.3 Method & Algorithm Engineering

```mermaid
flowchart LR
    K[Claims + Evidence Synthesis] --> M[Method Builder]
    M --> A[Algorithm Builder]
    A --> T[Step Trace Binder]
    T --> ALT[Alternatives / Applicability]
    ALT --> INV[Invariants / Parameters]
    INV --> CAND[Algorithm Candidate Version]
```

Каждый значимый step должен иметь evidence/requirement/project-decision origin.

## 4.4 Polygon / QA

```mermaid
flowchart TB
    ALG[Algorithm Candidate] --> GEN[Scenario Generator]
    GEN --> N[Normal]
    GEN --> B[Boundary]
    GEN --> W[What-if]
    GEN --> A[Adversarial]
    N --> RUN[Scenario Runner]
    B --> RUN
    W --> RUN
    A --> RUN
    RUN --> INV[Invariant Evaluator]
    INV --> REP[Benchmark / Scenario Report]
```

## 4.5 Security Gate / Algorithm Firewall

```mermaid
flowchart LR
    OBJ[Knowledge/Algorithm Candidate] --> KG[Knowledge Security Gate]
    KG --> AF[Algorithm Firewall Review]
    AF --> P[Parameter / Policy Integrity]
    P --> D{Decision}
    D -->|allow| OK[SECURITY_APPROVED]
    D -->|restrict| R[SECURITY_RESTRICTED]
    D -->|hold| H[SECURITY_HOLD]
    D -->|reject| X[SECURITY_REJECTED]
```

Security plane может блокировать использование, но не переписывает предметное знание.

## 4.6 Retrieval & Delivery

```mermaid
flowchart TB
    Q[Task/Question] --> OBJ[Canonical Claim/Method/Algorithm]
    OBJ --> SYN[Evidence Synthesis]
    SYN --> ENOUGH{Enough?}
    ENOUGH--yes--> CTX[Runtime Context]
    ENOUGH--no--> EC[Top Evidence Cards]
    EC --> E2{Enough?}
    E2--yes--> CTX
    E2--no--> SP[Exact SourceSpans]
    SP --> E3{Enough?}
    E3--yes--> CTX
    E3--no--> NB[Neighboring Structure]
    NB --> FULL[Full Capture only when justified]
    FULL --> CTX
```

Mandatory policy/security controls are hard-pinned outside ordinary relevance ranking.

---

# 5. Data ownership

Canonical SoT is not split by agent.

```text
PostgreSQL
├── SOURCE PLANE
├── KNOWLEDGE PLANE
├── VALIDATION PLANE
└── DELIVERY METADATA

Object Storage
└── originals / large captures / cold artifacts

Protected Control Store
└── policies / approved algorithm runtime configs / permissions
```

P0 Protected Control Store may physically be a separately permissioned PostgreSQL schema, but application DB roles must prevent retrieval/LLM code from mutating it.

Design DDL: `design/postgres/knowledge_factory_v0.sql`.

---

# 6. Code boundaries — target module map

Current implementation may remain in `DZ_17/app`; this map defines responsibilities rather than forcing a language/framework migration.

```text
knowledge-factory/
├── source/
│   ├── registry
│   ├── capture
│   ├── structure
│   └── spans
├── semantic/
│   ├── claim-extractor
│   ├── canonical-resolver
│   ├── contradiction
│   └── concept-mapper
├── evidence/
│   ├── discovery
│   ├── mapper
│   ├── synthesis
│   └── source-quality
├── algorithm/
│   ├── method-builder
│   ├── algorithm-builder
│   ├── trace-binder
│   └── config-change
├── polygon/
│   ├── scenario-generator
│   ├── runner
│   └── invariant-evaluator
├── security/
│   ├── knowledge-gate
│   ├── algorithm-firewall
│   └── control-plane-policy
├── retrieval/
│   ├── planner
│   ├── evidence-ladder
│   ├── context-budget
│   └── localization
├── storage/
│   ├── postgres
│   ├── object-store
│   └── vector-index
└── telemetry/
    ├── trace
    └── metrics
```

Provider adapters remain outside domain logic:

```text
models/providers/llamacpp
models/providers/gigachat
models/providers/compatible
```

---

# 7. Deployment — current workstation P0

```mermaid
flowchart LR
    subgraph PC[Windows workstation]
        UI[ALINA Web UI]
        APP[Knowledge Factory modular runtime]
        LLAMA[llama.cpp router]
        PG[(PostgreSQL + pgvector)]
        FS[(Local object storage)]
        WORK[Polygon/background worker]

        UI --> APP
        APP --> PG
        APP --> FS
        APP --> LLAMA
        APP --> WORK
        WORK --> PG
    end

    APP -->|HTTPS| GIGA[GigaChat]
    APP -->|HTTPS when configured| COMP[Compatible cloud provider]
    APP -->|HTTPS| WEB[Scientific/Web sources]
```

Начальный resource policy измеряется, а не считается постоянной архитектурой.

---

# 8. Main sequence

```mermaid
sequenceDiagram
    participant U as User
    participant A as API/Orchestrator
    participant S as Source/Structure
    participant E as Semantic/Evidence
    participant G as Algorithm Engineering
    participant P as Polygon
    participant X as Security Gate
    participant K as Canonical KB
    participant R as Retrieval

    U->>A: source/task
    A->>S: ingest + structure
    S-->>A: Source/Capture/StructureNode/SourceSpan refs
    A->>E: semantic + prior-art task
    E-->>A: Claims/Concepts/Evidence/Synthesis
    opt executable method/algorithm required
        A->>G: build candidate method/algorithm
        G-->>A: algorithm version + invariants + trace
        A->>P: scenario/benchmark plan
        P-->>A: ScenarioRuns/BenchmarkRuns
        A->>X: security review
        X-->>A: SecurityDecision
    end
    A->>K: versioned commit if gates allow
    U->>R: question/agent task
    R->>K: retrieve canonical object + minimal evidence
    K-->>R: refs/synthesis/spans
    R-->>U: answer/context + trace
```

---

# 9. Architecture invariants

1. Original source stored/addressed independently from semantic knowledge.
2. Runtime chunk/window is not canonical identity.
3. LLM/provider SDK cannot be imported into domain contracts as authority.
4. Canonical objects are shared across agents/languages.
5. Evidence and contradictions remain addressable after synthesis.
6. Approved control-plane configuration has no write path from retrieved/user/model text.
7. Security decision and subject-matter review are separate artifacts.
8. Full source retrieval is escalation, not default behavior.
9. P0 remains modular and simple until telemetry justifies physical decomposition.

---

# 10. Next architecture step

C4 v0.2 establishes the software boundaries. Next synchronization target:

```text
API_CONTRACTS
→ JSON Schemas
→ repository/service interfaces
→ first Source→Structure→Claim/Evidence vertical slice
```
