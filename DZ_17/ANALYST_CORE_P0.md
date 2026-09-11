# ALINA / Universal Analyst Core — P0 Implementation Specification

## 0. Цель P0

P0 должен превратить текущий KB Analyst из демонстрационного `text/image → JSON` в первый воспроизводимый аналитический конвейер:

```text
SOURCE
→ INGEST
→ OBSERVATIONS
→ EVIDENCE
→ ENTITY/CLAIM/FACT/RELATION/EVENT EXTRACTION
→ CANDIDATE KNOWLEDGE PACKAGE
→ GPT SENIOR REVIEW
→ HUMAN REVIEW
→ VERIFIED KB
→ EXPERIENCE STORE
```

P0 не пытается автоматизировать всё. Его задача — создать правильные контракты, трассировку, состояния и минимальный рабочий цикл от исходного материала до проверенного знания.

---

# 1. Границы P0

## Входит

- текстовый ввод;
- изображение;
- PDF/DOCX/Markdown/TXT;
- базовый OCR/STT как подключаемые Tool Zoo adapters;
- source/capture/chunk/provenance;
- entities;
- claims;
- facts;
- relations;
- events;
- timeline candidates;
- hypotheses;
- contradictions;
- Candidate Knowledge Package;
- GPT Senior Review;
- human approve/reject/rework;
- запись verified knowledge;
- журнал исправлений Experience Store;
- Domain Profile `narrative` как первый профиль;
- Model Manager: local llama.cpp + GigaChat + другие API через gateway;
- telemetry.

## Не входит в P0

- полноценное обучение LoRA;
- автоматическая публикация канона без review;
- сложный Neo4j-кластер;
- распределённый Kubernetes;
- полноценное видео-производство;
- автоматическая генерация предметной онтологии без человека;
- десятки одновременно работающих LLM.

---

# 2. Целевая структура репозитория

```text
DZ_17/
├── ANALYST_CORE_TZ.md
├── ANALYST_CORE_P0.md
├── ANALYST_ZOO_CAPACITY.md
├── schemas/
│   ├── candidate-knowledge-package.schema.json
│   └── domain-profile.schema.json
└── app/
    └── ... current ALINA UI ...

future root service:
analyst-core/
├── api/
├── domain/
├── ingest/
├── tools/
├── analysis/
├── review/
├── kb/
├── experience/
├── models/
├── scheduler/
├── telemetry/
├── migrations/
└── tests/
```

На первом этапе UI остаётся в текущем `DZ_17/app`, а Analyst Core может быть вынесен в отдельный backend service после стабилизации контрактов.

---

# 3. Базовые сущности данных

## Source

Оригинальный источник. Не изменяется после регистрации.

Минимальные поля:

```text
id
source_type
uri / filename
mime_type
sha256
size_bytes
created_at
received_at
metadata_json
```

## Capture

Конкретная сохранённая версия исходного материала.

```text
id
source_id
capture_type
sha256
storage_uri
created_at
parent_capture_id
transform
```

Пример transform: `ocr`, `stt`, `pdf_text_extract`, `normalized_text`, `keyframe`.

## Chunk

Адресуемый фрагмент материала.

```text
id
capture_id
chunk_index
text
page
start_offset
end_offset
embedding
metadata_json
```

## Observation

Результат Tool Zoo. Observation не является фактом автоматически.

```text
id
source_id
capture_id
chunk_id
observer
observation_type
value_json
confidence
created_at
```

## Evidence

Observation, принятый в доказательный слой.

```text
id
observation_id
status
reliability
review_reason
created_at
```

Статусы:

```text
candidate
accepted
rejected
needs_review
```

## Entity

```text
id
entity_type
canonical_name
aliases_json
status
created_at
```

## Claim

Утверждение, сделанное источником или субъектом.

```text
id
subject_entity_id
predicate
object_json
source_id
chunk_id
claimant_entity_id
confidence
status
```

## FactCandidate

Кандидат факта после нормализации claims/evidence.

```text
id
subject_entity_id
predicate
object_json
scope
confidence
status
```

## RelationCandidate

```text
id
from_entity_id
relation_type
to_entity_id
confidence
status
```

## EventCandidate

```text
id
event_type
summary
start_time
end_time
location_entity_id
participants_json
confidence
status
```

## Hypothesis

```text
id
title
statement
supporting_evidence_json
counter_evidence_json
confidence
status
```

---

# 4. Provenance — обязательный инвариант

Каждый аналитический объект P0 должен быть трассируем до исходного материала.

Минимальная цепочка:

```text
SOURCE
→ CAPTURE
→ CHUNK / IMAGE REGION / AUDIO SPAN
→ OBSERVATION
→ EVIDENCE
→ CLAIM / FACT / RELATION / EVENT / HYPOTHESIS
→ REVIEW DECISION
→ VERIFIED KB RECORD
```

Если объект нельзя трассировать до source/capture, он не может получить статус `verified`.

---

# 5. Состояния знания

Единая state machine:

```text
raw
→ observed
→ evidence_candidate
→ proposed
→ senior_review
→ needs_review
→ approved / rejected / rework
→ verified
→ superseded
```

Запрещены скрытые переходы.

Каждый переход фиксируется в Event Ledger.

---

# 6. Event Ledger

Append-only журнал.

Поля:

```text
id
case_id
entity_kind
entity_id
event_type
actor_type
actor_id
model_id
prompt_version
input_hash
output_hash
metadata_json
created_at
```

Примеры event_type:

```text
source_registered
capture_created
observation_created
evidence_accepted
candidate_created
senior_review_started
senior_review_completed
human_approved
human_rejected
candidate_reworked
kb_published
record_superseded
```

---

# 7. Candidate Knowledge Package

Это основной контракт между локальным Analyst Core и GPT Senior Analyst.

Пакет должен содержать:

```text
case
profile
source_summary
sources
observations_summary
evidence
entities
claims
fact_candidates
relation_candidates
event_candidates
timeline_candidates
hypotheses
contradictions
open_questions
provenance_index
quality_metrics
requested_review
```

Главная идея: GPT Senior Analyst получает не хаотичный корпус, а структурированный пакет с возможностью открыть доказательство по каждому спорному объекту.

---

# 8. GPT Senior Analyst — контракт

## Вход

`CandidateKnowledgePackage`.

## Выход

```json
{
  "package_id": "PKG-...",
  "decision": "approve|partial|rework|reject",
  "items": [
    {
      "candidate_id": "FACT-...",
      "decision": "approve|correct|reject|needs_human",
      "reason": "...",
      "corrected_value": null,
      "confidence": 0.0,
      "required_evidence": []
    }
  ],
  "missing_analysis": [],
  "contradictions": [],
  "questions_for_human": [],
  "overall_confidence": 0.0
}
```

GPT Senior Analyst не пишет напрямую в verified KB.

---

# 9. Human Review

Human Review включается обязательно, если:

```text
senior decision = needs_human
confidence < threshold
есть конфликт источников
есть изменение уже verified записи
есть каноническое решение автора
есть необратимое объединение сущностей
```

UI должен показывать минимум:

```text
candidate
source/provenance
local result
GPT review
counter-evidence
proposed correction
Approve / Reject / Rework
```

---

# 10. Verified Knowledge Base

P0 хранит verified слой отдельно от proposed.

Основные таблицы:

```text
kb_entities
kb_facts
kb_relations
kb_events
kb_hypotheses
kb_sources
kb_provenance
kb_versions
```

Каждая запись содержит:

```text
id
profile_id
value / payload
status
valid_from
valid_to
version
supersedes_id
verified_by
verified_at
provenance_id
```

Удаление verified записи физически не выполняется. Используется `superseded`/versioning.

---

# 11. Experience Store

Каждое исправление должно становиться обучающим примером.

Структура:

```text
id
profile_id
task_type
source_features_json
local_model
local_output_json
senior_model
senior_decision_json
human_decision_json
final_value_json
error_class
reason
created_at
```

Классы ошибок P0:

```text
entity_resolution
wrong_relation
claim_fact_confusion
timeline_error
causality_error
source_misread
visual_hallucination
missing_counter_evidence
duplicate_entity
scope_error
knowledge_state_error
```

---

# 12. Domain Profile

Первый профиль: `narrative`.

Domain Profile задаёт:

```text
id
version
ontology
entity_types
relation_types
event_types
required_analysts
optional_analysts
validators
evidence_rules
confidence_thresholds
model_routes
schemas
prompts
```

Пример narrative entities:

```text
character
location
organization
artifact
event
scene
concept
```

Пример narrative relations:

```text
knows
believes
owns
uses
located_at
member_of
related_to
heard_from
participates_in
appears_in
```

---

# 13. P0 Analysis Zoo

В P0 не запускаем 25 ролей одновременно. Реализуем минимальный набор:

```text
P0-A1 Entity Analyst
P0-A2 Claim/Fact Analyst
P0-A3 Relation Analyst
P0-A4 Event/Timeline Analyst
P0-A5 Contradiction Analyst
P0-A6 Knowledge-State Analyst
P0-A7 Visual Analyst
P0-A8 KB Validator
P0-A9 Socrates / Counter-evidence
```

Остальные роли добавляются после стабилизации контрактов.

---

# 14. P0 Tool Zoo

Обязательные adapters:

```text
text_ingest
file_hash
pdf_text_extract
docx_text_extract
image_ingest
vision_observation
chunker
metadata_extract
```

Следом:

```text
ocr
stt
ffmpeg_keyframes
embeddings
reranker
```

---

# 15. Model Manager P0

Модель выбирается по задаче, а не жёстко в коде.

Минимальные routes:

```text
dialogue
vision
entity_extract
claim_fact_extract
relation_extract
event_timeline_extract
contradiction
kb_validate
socrates
senior_review
```

Providers:

```text
local llama.cpp
GigaChat
OpenAI / compatible API — optional
DEMO — only for UI fallback
```

Правило:

```text
массовое извлечение → local
сложное сопоставление → stronger model
senior review → strongest configured external model
```

---

# 16. Scheduler P0

С учётом текущего ПК baseline:

```yaml
cpu_heavy: 4
gpu_heavy: 1
external: 2
```

Очереди:

```text
ingest
normalize
extract
vision
validate
senior_review
human_review
publish
```

Приоритеты:

```text
P0 user interactive
P1 validation / senior review
P2 background ingest
P3 reindex / rebuild
```

---

# 17. API P0

Минимальный REST-контракт.

## Cases

```text
POST /api/cases
GET  /api/cases/{id}
```

## Sources

```text
POST /api/cases/{id}/sources
GET  /api/cases/{id}/sources
GET  /api/sources/{id}
```

## Analysis

```text
POST /api/cases/{id}/analyze
GET  /api/cases/{id}/analysis/status
GET  /api/cases/{id}/candidates
```

## Senior Review

```text
POST /api/cases/{id}/senior-review
GET  /api/cases/{id}/senior-review
```

## Human Review

```text
POST /api/candidates/{id}/approve
POST /api/candidates/{id}/reject
POST /api/candidates/{id}/rework
```

## KB

```text
POST /api/cases/{id}/publish
GET  /api/kb/entities/{id}
GET  /api/kb/search
```

## Models

```text
GET  /api/models
GET  /api/models/routes
POST /api/models/routes/test
```

## Telemetry

```text
GET /api/telemetry/summary
GET /api/telemetry/jobs/{id}
```

---

# 18. PostgreSQL P0 — минимальная схема

```text
cases
sources
captures
chunks
observations
evidence
entities
claims
fact_candidates
relation_candidates
event_candidates
hypotheses
contradictions
review_sessions
review_items
kb_entities
kb_facts
kb_relations
kb_events
kb_versions
provenance
experience_examples
event_ledger
jobs
model_runs
```

`pgvector` нужен для chunks/entities/experience_examples.

---

# 19. Quality gates

Candidate Package не отправляется Senior Analyst, если:

```text
source_count = 0
provenance_coverage < 100% для candidate items
JSON schema invalid
есть orphan candidate без source/chunk/observation
pipeline crashed
```

Verified KB publication запрещена, если:

```text
есть unresolved high severity contradiction
есть needs_human без решения
есть rejected item, ошибочно помеченный approved
нет review trail
нет provenance
```

---

# 20. Telemetry P0

Для каждого model/tool run:

```text
run_id
case_id
task
provider
model
started_at
finished_at
latency_ms
input_items
output_items
input_tokens
output_tokens
cpu_peak
gpu_vram_peak
ram_peak
retry_count
error_code
```

Производственные метрики:

```text
items/min
chunks/min
candidates/min
% accepted by Senior GPT without correction
% corrected
% rejected
% needs_human
% rework
mean senior latency
mean local latency
cost per verified item
```

---

# 21. Ключевая метрика самообучения системы

Главная метрика зрелости:

```text
Senior Correction Rate
=
corrected_or_rejected_local_candidates
/
all_reviewed_local_candidates
```

Цель развития:

```text
Correction Rate ↓
при сохранении
Verified Quality ↑ или =
```

Дополнительные:

```text
Entity Resolution Accuracy
Relation Acceptance Rate
Fact/Claim Separation Accuracy
Timeline Acceptance Rate
Contradiction Recall
Human Escalation Rate
```

---

# 22. P0 Definition of Done

P0 считается готовым, когда один тестовый кейс проходит полностью:

```text
1. зарегистрировать case
2. добавить текст + изображение
3. сохранить оригиналы + SHA256
4. получить chunks/observations
5. извлечь entities/claims/facts/relations/events
6. сформировать Candidate Knowledge Package
7. отправить пакет Senior GPT
8. получить item-level review
9. выполнить human approve/reject минимум для одного спорного пункта
10. опубликовать approved records в verified KB
11. открыть provenance любого verified fact до исходного source
12. сохранить correction example в Experience Store
13. увидеть model/tool telemetry
```

И ни один verified объект не должен появиться в KB без review trail.

---

# 23. Порядок реализации

```text
P0.1 Contracts + schemas
P0.2 Source/Capture/Chunk/Provenance
P0.3 Event Ledger
P0.4 Tool Zoo adapters
P0.5 Analysis Zoo minimal roles
P0.6 Candidate Knowledge Package
P0.7 Senior GPT Review
P0.8 Human Review UI
P0.9 Verified KB
P0.10 Experience Store
P0.11 Telemetry
P0.12 End-to-end acceptance
```

Первым программным шагом должен быть **не новый UI**, а фиксация схем и state machine. После этого каждый новый инструмент и аналитик будет подключаться через стабильный контракт.
