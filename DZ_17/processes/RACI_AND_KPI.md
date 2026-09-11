# ALINA Analyst Core — RACI, KPI, SLA/SLO и процессная телеметрия

## 1. Роли

Сокращения:

- `U` — User / Analyst;
- `ADM` — Administrator;
- `IB` — AI/Information Security Specialist;
- `REV` — Human Reviewer / Domain Expert;
- `SYS` — System/Service;
- `SEN` — GPT Senior Analyst.

RACI:

- `R` — Responsible;
- `A` — Accountable;
- `C` — Consulted;
- `I` — Informed.

## 2. RACI-матрица

| Процесс | U | ADM | IB | REV | SYS | SEN |
|---|---|---|---|---|---|---|
| P1 Приём материала | R | I | I | I | A | I |
| P2 Регистрация Source/Capture | I | I | I | I | R/A | I |
| P4 Security Triage | I | C | A/R | I | R | I |
| P5–P10 Ingest/Evidence | I | C | C | I | R/A | I |
| P11–P25 Analysis Zoo | I | I | C | C | R/A | C |
| P26 Candidate Package | I | I | I | C | R/A | I |
| P27 GPT Senior Review | I | I | I | C | C | R/A |
| P28 Rework | C | I | C | C | R/A | C |
| P29 Human Review | C | I | C | R/A | I | C |
| P30 Publish KB | I | C | C/Veto for hold | A decision | R | I |
| P31 Index/Graph | I | I | I | I | R/A | I |
| P32 Query/Retrieval | R | I | I | I | A | C |
| P34 Experience Store | I | I | C | C | R/A | C |
| M3 Model Routing | I | R/A | C/approve restrictions | C | I | I |
| M6 Security policy | I | C | R/A | C | I | I |
| S5 Monitoring | I | R/A | C | I | R | I |
| SEC11 Incident Response | I | R | A/R | C | C | I |

## 3. KPI по процессам

### Intake / Ingest

```text
source_registration_success_rate
parser_success_rate
ocr_success_rate
stt_success_rate
mean_ingest_latency
quarantine_rate
unsupported_format_rate
```

### Analysis Zoo

```text
entities_per_1000_tokens
candidate_facts_per_source
relation_candidates_per_entity
schema_valid_rate
local_model_retry_rate
candidate_duplicate_rate
provenance_coverage
```

### Senior Review

```text
senior_accept_rate
senior_correct_rate
senior_reject_rate
senior_request_more_data_rate
senior_latency
correction_categories
```

### Human Review

```text
human_review_rate
human_accept_rate
human_edit_rate
human_reject_rate
median_review_time
review_backlog
```

### Knowledge Base

```text
published_records
supersede_rate
orphan_provenance_count
integrity_findings
query_grounding_rate
retrieval_precision benchmark
```

### Security

```text
security_findings_by_type
blocked_inputs
prompt_injection_rate
secret_detection_events
model_integrity_failures
unauthorized_access_attempts
mean_time_to_triage
mean_time_to_contain
mean_time_to_recover
```

### Infrastructure

```text
CPU_utilization
GPU_utilization
VRAM_peak
RAM_peak
queue_depth
queue_wait_p50/p95
job_latency_p50/p95
external_api_latency
429_rate
timeout_rate
availability
```

---

# 4. Главные показатели качества аналитика

## Local-to-Senior Agreement

```text
agreement_rate = senior_accept_without_change / reviewed_candidates
```

## Correction Rate

```text
correction_rate = senior_or_human_corrected / reviewed_candidates
```

## Unsupported Assertion Rate

```text
unsupported_rate = candidates_without_valid_evidence / all_candidates
```

Цель — стремиться к нулю перед публикацией.

## Provenance Coverage

```text
provenance_coverage = candidates_with_complete_source_path / all_candidates
```

Для published knowledge целевое значение = `1.0`.

## Human Escalation Rate

```text
human_escalation_rate = human_review_cases / senior_review_cases
```

Снижение допустимо только при сохранении качества.

## Rework Ratio

```text
rework_ratio = repeated_or_corrective_stage_executions / all_stage_executions
```

Этот показатель используется в производственной статистике.

---

# 5. Производственная статистика

После появления достаточной телеметрии каждый отчёт включает:

```text
baseline throughput (1 поток)
current throughput
ускорение / замедление, %
throughput за текущий проход
throughput накопительно
queue wait
retry/rework share
remaining items
ETA
```

Формулы:

```text
speedup = current_throughput / baseline_throughput
speedup_pct = (speedup - 1) * 100%

ETA = remaining_items / effective_throughput
```

`effective_throughput` должен учитывать retries/rework и фактический успешный выход, а не только число стартовавших задач.

Если телеметрии недостаточно, выводится:

```text
ETA: insufficient telemetry
speedup: insufficient baseline
```

Числа не придумываются.

---

# 6. Плановые SLO P0

Пока это стартовые инженерные цели, которые будут уточнены после измерений:

| SLO | Стартовая цель |
|---|---:|
| API health availability | >= 99% в рабочем локальном режиме |
| Source registration success | >= 99% для поддерживаемых форматов |
| Complete provenance for published facts | 100% |
| Schema-valid Candidate Package | >= 98% после retry/fallback |
| Silent publication without required review | 0 |
| Critical security event without alert | 0 |
| Unlogged privileged action | 0 |

Производительность по tokens/sec/chunks/min не задаётся до benchmark конкретных моделей.

---

# 7. SLI events

Каждая операция публикует metrics/event:

```json
{
  "trace_id":"TRACE-...",
  "process_id":"P13",
  "stage":"fact_extract",
  "status":"ready",
  "duration_ms":2410,
  "queue_wait_ms":180,
  "attempts":1,
  "input_count":12,
  "output_count":7,
  "model_id":"local:text",
  "tokens_in":3200,
  "tokens_out":850,
  "vram_peak_mb":7410,
  "error_code":null,
  "timestamp":"ISO-8601"
}
```

---

# 8. Dashboard views

## Operations dashboard

```text
RUNNING JOBS
QUEUE DEPTH
ERRORS
CPU / GPU / RAM
MODEL HEALTH
EXTERNAL API HEALTH
THROUGHPUT
ETA where calculable
```

## Quality dashboard

```text
Senior accept/correct/reject
Human escalation
Provenance coverage
Contradictions found/missed benchmark
Rework ratio
Accuracy by analyst role/model/domain
```

## Security dashboard

```text
findings by severity
blocked/quarantined
model integrity
prompt injection
poisoning suspicion
secret leakage
access violations
incident status
```

## KB dashboard

```text
records by type/status
published/superseded
open contradictions
open questions
version graph
provenance integrity
```

---

# 9. Review cadence

```text
per run: live operational metrics
per day: errors, queues, model health
per release: regression/benchmark comparison
per Domain Profile version: quality + security acceptance
per incident: post-incident review
periodically: capacity plan and routing optimization
```

Любое автоматическое улучшение маршрута или промпта сначала проходит benchmark и change approval.
