# 2026-09-14 — Five-stream Knowledge Factory runner

## TASK
Продолжить развитие ALINA Knowledge Factory в автоматизированном режиме с 5 параллельными аналитическими потоками без выдумывания производственной статистики.

## IMPLEMENTED

Команда:

```text
npm run kf:parallel5 -- --source-id <SRC-ID>
```

PowerShell wrapper:

```text
scripts/run-kf-5-streams.ps1
```

Основной runner:

```text
scripts/run-kf-5-streams.mjs
```

## FIVE STREAMS

```text
S1_SOURCE_INTEGRITY
  SourceSpan uniqueness, page continuity, capture linkage

S2_STRUCTURE_READINESS
  A2 proposal presence, status/origin, node types, confidence

S3_SEMANTIC_READINESS
  text-page population and measured text-size distribution for A3 planning

S4_PROVENANCE_SECURITY
  source/capture linkage, SHA-256 presence, security status, dangling structure refs

S5_TELEMETRY
  trace events, stages, actions, measured durations and absence/presence of trustworthy ETA inputs
```

Все пять функций запускаются через `Promise.all`, то есть реально выполняются конкурентно в одном Node-процессе.

## TRACE

Один run получает:

```text
run_id = KF-PAR5-...
test_id = PAR5-...
stage = PAR5
```

Каждый поток пишет `start` и `complete` marker в существующий runtime trace ledger.

## PRODUCTION STATISTICS RULE

Runner считает только наблюдаемое:

```text
parallel_wall_ms
serial_equivalent_sum_ms
observed_concurrency_saving_pct
speedup_factor_vs_sum_of_observed_stream_times
```

Это **не объявляется** benchmark-ом против отдельного однопоточного запуска. Для честного `vs 1 stream` нужен отдельный измеренный baseline на том же workload.

Если отсутствуют данные о полном остатке работы, поля:

```text
remaining_work
completion_forecast
corrective_work_share_pct
```

остаются `null` с объяснением причины.

## OUTPUT

Локальный отчёт:

```text
runtime/knowledge-factory/parallel-runs/KF-PAR5-<uuid>.json
```

Runtime остаётся ignored и не коммитит тексты источников или локальные результаты анализа.

## CI

DZ-17 CI теперь:

```text
A1 synthetic ingest
→ A2 proposal
→ five concurrent analytic streams
→ trace verification
```

Плюс `node --check` для runner.

## ORIGIN CLASS

`PROJECT_DECISION` — модель 5 рабочих потоков и формат производственной телеметрии.

Измеренные значения конкретного запуска должны трактоваться как `BENCHMARK_MEASURED` только после сохранения конкретного run artifact и workload context.

## NEXT

1. Прогнать runner на `SRC-73008F2752E21C96` после завершения локального merge.
2. Получить первый реальный five-stream report.
3. После появления A2 proposal выполнить второй прогон и сравнить S2 до/после.
4. Только затем фиксировать measured baseline и переходить к A3 semantic proposal pipeline.
