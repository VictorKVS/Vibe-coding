# ALINA / Universal Analyst Core — API Contracts v1

## 0. Цель

Этот документ отвечает на практический вопрос: **кто кому что передаёт**.

API строится вокруг ссылок на данные (`*_id`, `*_ref`), а не вокруг бесконтрольной передачи больших исходных файлов между сервисами.

Базовые правила:

1. Оригинал источника регистрируется один раз.
2. Между сервисами передаются IDs/refs и компактные JSON-контракты.
3. Каждый результат содержит provenance, confidence, producer/model trace.
4. Любая долгая операция создаёт `job_id`.
5. Все write-операции идемпотентны через `idempotency_key`.
6. Статусы knowledge повышаются только через review/publish workflow.
7. API keys внешних моделей не передаются frontend.

Базовый namespace:

```text
/api/v1
```

---

# 1. Общий Envelope

Все команды:

```json
{
  "request_id": "REQ-01J...",
  "idempotency_key": "client-generated-or-server-generated",
  "case_id": "CASE-0071",
  "profile": "narrative@1.0.0",
  "requested_by": "user-or-service-id",
  "payload": {}
}
```

Успешный ответ:

```json
{
  "request_id": "REQ-01J...",
  "status": "ok",
  "data": {},
  "trace": {
    "service": "analyst-api",
    "schema_version": "v1",
    "created_at": "2026-09-11T12:00:00Z"
  }
}
```

Ошибка:

```json
{
  "request_id": "REQ-01J...",
  "status": "error",
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "source_id required",
    "retryable": false,
    "details": {}
  }
}
```

---

# 2. Sources / Ingest

## POST `/api/v1/sources`

**Кто вызывает:** Web UI / OSINT Agent / импортёр.

**Кому:** Analyst API → Ingestion Service.

Назначение: зарегистрировать исходный материал.

### Multipart для файла

Поля:

```text
file=<binary>
case_id=CASE-0071
profile=narrative@1.0.0
source_type=file
label=chapter-01.docx
```

### JSON для URL/ref

```json
{
  "case_id": "CASE-0071",
  "profile": "narrative@1.0.0",
  "source_type": "url",
  "uri": "https://example.org/source",
  "label": "Primary source",
  "metadata": {
    "declared_language": "ru"
  }
}
```

### Response

```json
{
  "source_id": "SRC-0001",
  "capture_id": "CAP-0001",
  "sha256": "...",
  "mime_type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "size_bytes": 482120,
  "status": "registered"
}
```

---

## POST `/api/v1/sources/{source_id}/ingest`

**Кто вызывает:** API/Orchestrator.

**Кому:** Ingestion Service.

```json
{
  "parser_policy": "auto",
  "extract_metadata": true,
  "create_fragments": true,
  "ocr": "auto",
  "stt": "auto",
  "vision": "auto"
}
```

Response:

```json
{
  "job_id": "JOB-ING-0007",
  "source_id": "SRC-0001",
  "status": "queued"
}
```

---

## GET `/api/v1/sources/{source_id}`

Возвращает source/capture summary, ingest status и список производных artifacts.

## GET `/api/v1/sources/{source_id}/fragments`

Возвращает fragment refs:

```json
{
  "source_id": "SRC-0001",
  "fragments": [
    {
      "fragment_id": "FRG-0001",
      "kind": "text",
      "locator": {"page": 1, "paragraph": 3},
      "text_preview": "...",
      "sha256": "..."
    }
  ]
}
```

---

# 3. Cases

## POST `/api/v1/cases`

```json
{
  "title": "Three Moons / Book 1",
  "profile": "narrative@1.0.0",
  "description": "Build verified narrative knowledge base"
}
```

Response:

```json
{
  "case_id": "CASE-0071",
  "status": "open"
}
```

## GET `/api/v1/cases/{case_id}`

Возвращает scope, sources, active jobs, packages, reviews, KB version.

---

# 4. Jobs

Любая операция > нескольких секунд должна работать через job.

## GET `/api/v1/jobs/{job_id}`

```json
{
  "job_id": "JOB-AN-0042",
  "type": "analysis",
  "status": "running",
  "progress": {
    "done": 142,
    "total": 386,
    "unit": "fragments"
  },
  "stage": "relation_extract",
  "started_at": "...",
  "updated_at": "...",
  "metrics": {
    "items_per_min": 18.4,
    "retry_count": 2
  }
}
```

Статусы:

```text
queued
running
waiting_external
waiting_human
completed
failed
cancelled
```

---

# 5. Tool Zoo Contract

Внутренний endpoint P0:

## POST `/api/v1/internal/tools/run`

**From:** Orchestrator
**To:** Tool Zoo

```json
{
  "task_id": "TOOL-9001",
  "case_id": "CASE-0071",
  "tool": "ocr",
  "source_refs": [
    {"source_id": "SRC-0001", "fragment_id": "FRG-0012"}
  ],
  "parameters": {
    "language": "ru"
  },
  "expected_schema": "observation-v1"
}
```

### ToolResult

```json
{
  "task_id": "TOOL-9001",
  "status": "completed",
  "observations": [
    {
      "observation_id": "OBS-1001",
      "type": "ocr_text",
      "value": "...",
      "source_id": "SRC-0001",
      "fragment_id": "FRG-0012",
      "confidence": 0.96,
      "producer": {
        "tool": "ocr",
        "version": "..."
      }
    }
  ],
  "metrics": {
    "duration_ms": 842
  }
}
```

Важно: ToolResult не содержит `verified_fact`.

---

# 6. Analysis Zoo Contract

## POST `/api/v1/internal/analysis/run`

**From:** Orchestrator
**To:** конкретный Analysis Role

```json
{
  "analysis_id": "AN-4001",
  "case_id": "CASE-0071",
  "profile": "narrative@1.0.0",
  "role": "relation_extract",
  "evidence_refs": ["EVD-001", "EVD-002"],
  "entity_context_refs": ["ENT-001", "ENT-002"],
  "constraints": {
    "must_have_provenance": true,
    "allow_hypothesis": true,
    "max_candidates": 50
  },
  "model_policy": {
    "route": "auto",
    "capability": "text_analysis"
  }
}
```

### AnalysisResult

```json
{
  "analysis_id": "AN-4001",
  "status": "completed",
  "candidates": [
    {
      "candidate_id": "REL-C-001",
      "type": "relation",
      "subject": "ENT-001",
      "predicate": "uses",
      "object": "ENT-002",
      "status": "proposed",
      "confidence": 0.84,
      "evidence_refs": ["EVD-001"],
      "provenance_refs": ["PROV-77"]
    }
  ],
  "disagreements": [],
  "open_questions": [],
  "trace": {
    "analyst": "relation-analyst-v1",
    "provider": "llamacpp",
    "model": "local-text-8b-q4",
    "prompt_version": "relation-v3",
    "duration_ms": 3260
  }
}
```

---

# 7. Start analysis

## POST `/api/v1/cases/{case_id}/analysis`

**From:** UI/API
**To:** Orchestrator

```json
{
  "profile": "narrative@1.0.0",
  "source_ids": ["SRC-0001", "SRC-0002"],
  "mode": "balanced",
  "requested_roles": [
    "entity",
    "claim_fact",
    "relation",
    "event_timeline",
    "contradiction",
    "knowledge_state"
  ],
  "build_candidate_package": true,
  "request_senior_review": false
}
```

Response:

```json
{
  "job_id": "JOB-AN-0042",
  "analysis_run_id": "RUN-0042",
  "status": "queued"
}
```

---

# 8. Candidate Knowledge Package

## POST `/api/v1/cases/{case_id}/packages`

**From:** Orchestrator
**To:** Package Builder

```json
{
  "analysis_run_id": "RUN-0042",
  "include": {
    "entities": true,
    "claims": true,
    "fact_candidates": true,
    "relations": true,
    "events": true,
    "timeline": true,
    "hypotheses": true,
    "contradictions": true,
    "counter_evidence": true
  },
  "requested_review": "VERIFY_AND_CORRECT"
}
```

Response:

```json
{
  "package_id": "PKG-0021",
  "schema_version": "alina-candidate-package-v1",
  "status": "ready",
  "quality_metrics": {
    "sources": 14,
    "fragments": 386,
    "entities": 42,
    "fact_candidates": 73,
    "contradictions": 6
  }
}
```

Полное тело должно валидироваться `schemas/candidate-knowledge-package.schema.json`.

---

# 9. GPT Senior Analyst Contract

## POST `/api/v1/reviews/senior`

**From:** Verification Service
**To:** GPT Senior provider adapter

Внутри ALINA наружу отправляется:

```json
{
  "review_id": "REV-S-0091",
  "package_id": "PKG-0021",
  "review_type": "VERIFY_AND_CORRECT",
  "profile": "narrative@1.0.0",
  "candidate_package": {
    "schema_version": "alina-candidate-package-v1",
    "...": "validated package"
  },
  "review_rules": {
    "do_not_invent_missing_evidence": true,
    "preserve_competing_hypotheses": true,
    "request_source_fragment_when_needed": true,
    "human_escalation_for_high_impact_uncertainty": true
  }
}
```

## SeniorReviewResult

```json
{
  "review_id": "REV-S-0091",
  "package_id": "PKG-0021",
  "status": "completed",
  "summary": "...",
  "decisions": [
    {
      "candidate_id": "REL-C-001",
      "decision": "correct",
      "confidence": 0.96,
      "replacement": {
        "predicate": "uses"
      },
      "reason": "Source describes temporary use, not ownership.",
      "evidence_refs": ["EVD-001"]
    }
  ],
  "new_questions": [
    {
      "question_id": "Q-100",
      "text": "Who legally owns the artifact?",
      "priority": "medium",
      "needed_evidence": "direct ownership statement"
    }
  ],
  "human_review_required": ["FACT-C-031"],
  "package_assessment": {
    "sufficient_for_publish": false,
    "confidence": 0.88
  },
  "trace": {
    "provider": "gpt",
    "model": "senior-model-id",
    "duration_ms": 7400
  }
}
```

`decision` enum:

```text
accept
reject
correct
keep_hypothesis
request_more_evidence
human_review
```

---

# 10. Запрос исходного фрагмента Senior Analyst-ом

Senior получает компактный package, но может запросить первоисточник.

## POST `/api/v1/reviews/{review_id}/evidence-request`

```json
{
  "requested_refs": ["PROV-77"],
  "reason": "Need exact wording before accepting relation"
}
```

Response:

```json
{
  "evidence": [
    {
      "provenance_ref": "PROV-77",
      "source_id": "SRC-0001",
      "fragment_id": "FRG-0012",
      "locator": {"page": 7, "paragraph": 4},
      "content": "Exact source fragment...",
      "sha256": "..."
    }
  ]
}
```

Правило: Senior получает только запрошенные фрагменты, а не весь корпус автоматически.

---

# 11. Human Review API

## GET `/api/v1/reviews/human/queue`

Фильтры:

```text
case_id
severity
confidence_lt
profile
status
```

## POST `/api/v1/reviews/human/{review_item_id}`

```json
{
  "decision": "approve",
  "edited_candidate": null,
  "comment": "Confirmed against source fragment",
  "reviewer": "user-id"
}
```

Варианты:

```text
approve
reject
edit_and_approve
request_recheck
keep_proposed
```

---

# 12. Verified Knowledge / Publish

## POST `/api/v1/kb/commit`

**From:** Verification Service
**To:** KB Publisher

```json
{
  "case_id": "CASE-0071",
  "profile": "narrative@1.0.0",
  "review_refs": ["REV-S-0091", "REV-H-0031"],
  "records": [
    {
      "candidate_id": "REL-C-001",
      "final_record": {
        "type": "relation",
        "subject": "ENT-001",
        "predicate": "uses",
        "object": "ENT-002"
      }
    }
  ],
  "expected_current_kb_version": 12
}
```

Response:

```json
{
  "kb_version": 13,
  "published_ids": ["REL-771"],
  "superseded_ids": [],
  "status": "committed"
}
```

Публикация должна быть транзакционной.

---

# 13. Experience / Correction Store

Автоматически после review/publish:

```json
{
  "experience_id": "EXP-4401",
  "case_id": "CASE-0071",
  "profile": "narrative@1.0.0",
  "task": "relation_extract",
  "local_result": {
    "predicate": "owns",
    "confidence": 0.71
  },
  "senior_decision": "correct",
  "corrected_result": {
    "predicate": "uses"
  },
  "reason": "temporary use != ownership",
  "evidence_refs": ["EVD-001"],
  "local_model": "local-text-8b-q4",
  "senior_model": "senior-model-id",
  "prompt_version": "relation-v3",
  "verified": true
}
```

Эти records используются для:

- regression tests;
- few-shot examples;
- prompt improvement;
- routing evaluation;
- confidence calibration;
- будущего supervised dataset.

---

# 14. Knowledge Query API

## POST `/api/v1/kb/search`

```json
{
  "profile": "narrative@1.0.0",
  "scope": {
    "universe_id": "UNI-01",
    "project_id": "BOOK-01"
  },
  "query": "Кто знал правду об оружии до сцены 23?",
  "mode": "hybrid",
  "top_k": 20,
  "include_provenance": true
}
```

Response:

```json
{
  "results": [
    {
      "knowledge_id": "KS-992",
      "score": 0.93,
      "record": {},
      "provenance": []
    }
  ]
}
```

`mode`:

```text
structured
vector
fulltext
hybrid
graph
```

---

# 15. Model Manager API

## GET `/api/v1/models`

Ответ:

```json
{
  "models": [
    {
      "id": "llamacpp:qwen-local",
      "provider": "llamacpp",
      "capabilities": ["text_analysis", "kb_extract"],
      "available": true
    },
    {
      "id": "gigachat:GigaChat-X",
      "provider": "gigachat",
      "capabilities": ["deep_analysis", "senior_fallback"],
      "available": true
    }
  ],
  "routes": {
    "entity_extract": ["llamacpp:qwen-local", "gigachat:GigaChat-X"],
    "senior_review": ["gpt:senior", "gigachat:GigaChat-X"]
  }
}
```

## POST `/api/v1/models/select`

Для ручного override:

```json
{
  "scope": "session",
  "role": "relation_extract",
  "model_id": "llamacpp:qwen-local"
}
```

AUTO остаётся default.

---

# 16. Health / Telemetry

## GET `/api/v1/health`

```json
{
  "status": "ok",
  "components": {
    "db": "ok",
    "object_store": "ok",
    "local_llm": "ok",
    "gigachat": "ok",
    "gpt_senior": "configured"
  }
}
```

## GET `/api/v1/metrics/summary`

```json
{
  "throughput": {
    "fragments_per_min": 18.4,
    "candidates_per_min": 7.2
  },
  "resources": {
    "gpu_vram_peak_mb": 9132,
    "ram_peak_mb": 21400,
    "cpu_avg_pct": 78.2
  },
  "quality": {
    "senior_accept_rate": 0.71,
    "senior_correction_rate": 0.19,
    "human_escalation_rate": 0.08,
    "rework_rate": 0.12
  }
}
```

---

# 17. События Event Ledger

Каждое существенное действие порождает append-only event:

```json
{
  "event_id": "EVL-9001",
  "event_type": "SENIOR_REVIEW_COMPLETED",
  "case_id": "CASE-0071",
  "aggregate_type": "review",
  "aggregate_id": "REV-S-0091",
  "actor": "service:verification",
  "payload": {},
  "created_at": "..."
}
```

Минимальные event types:

```text
SOURCE_REGISTERED
CAPTURE_CREATED
INGEST_COMPLETED
OBSERVATION_CREATED
EVIDENCE_ACCEPTED
ANALYSIS_COMPLETED
PACKAGE_CREATED
SENIOR_REVIEW_STARTED
SENIOR_REVIEW_COMPLETED
HUMAN_REVIEW_REQUIRED
HUMAN_REVIEW_COMPLETED
KB_COMMITTED
KNOWLEDGE_SUPERSEDED
EXPERIENCE_RECORDED
MODEL_ROUTE_CHANGED
JOB_FAILED
```

---

# 18. Правила версионирования

API:

```text
/api/v1/...
```

Data schema:

```text
alina-candidate-package-v1
alina-domain-profile-v1
observation-v1
analysis-result-v1
senior-review-v1
```

Любое breaking изменение создаёт новую schema version. Старые records не переписываются молча.

---

# 19. P0 endpoint set

Обязательный минимум P0:

```text
POST /api/v1/cases
GET  /api/v1/cases/{id}
POST /api/v1/sources
POST /api/v1/sources/{id}/ingest
GET  /api/v1/sources/{id}/fragments
POST /api/v1/cases/{id}/analysis
GET  /api/v1/jobs/{id}
POST /api/v1/cases/{id}/packages
GET  /api/v1/packages/{id}
POST /api/v1/reviews/senior
GET  /api/v1/reviews/{id}
GET  /api/v1/reviews/human/queue
POST /api/v1/reviews/human/{id}
POST /api/v1/kb/commit
POST /api/v1/kb/search
GET  /api/v1/models
POST /api/v1/models/select
GET  /api/v1/health
```

Внутренние P0 contracts:

```text
ToolTask → ToolResult
AnalysisTask → AnalysisResult
CandidatePackage → SeniorReviewResult
HumanReviewTask → HumanReviewDecision
VerifiedKnowledgeBatch → CommitResult
CorrectionExample → Experience Store
```

---

# 20. Сквозной пример «кто кому что передал»

```text
1. USER → API
   файл + case/profile

2. API → INGEST
   source_id + capture instructions

3. INGEST → STORAGE
   original + sha256 + fragments + provenance

4. ORCHESTRATOR → TOOL ZOO
   fragment refs + tool task

5. TOOL ZOO → ORCHESTRATOR
   observations + confidence + provenance

6. ORCHESTRATOR → ANALYSIS ZOO
   evidence refs + domain profile + role

7. ANALYSIS ZOO → ORCHESTRATOR
   candidates + uncertainty + trace

8. ORCHESTRATOR → PACKAGE BUILDER
   selected candidates + provenance + contradictions

9. PACKAGE BUILDER → GPT SENIOR
   compact Candidate Knowledge Package

10. GPT SENIOR → VERIFICATION
    accept/reject/correct/questions/human_required

11. VERIFICATION → HUMAN REVIEW
    только спорные/high-impact элементы

12. VERIFICATION → KB PUBLISHER
    verified batch

13. KB PUBLISHER → DOMAIN KB
    transactional commit + new version

14. REVIEW/PUBLISH → EXPERIENCE STORE
    local result + correction + reason + evidence
```

Следующий шаг после этого документа — реализация P0 API handlers и таблиц БД строго под эти контракты.
