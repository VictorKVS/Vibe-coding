# 2026-09-14 — Knowledge Factory Node sidecar for vinext/workerd

## TASK
Устранить локальные HTTP 500 на `/api/v1/kf/sources` и `/api/v1/trace` и сделать операционную трассировку реально исполнимой в DZ_17.

## OBSERVED

На Windows локальный `vinext dev` успешно отдавал `/api/health`, но filesystem-backed маршруты Knowledge Factory возвращали HTTP 500. Smoke test останавливался на `GET /api/v1/kf/sources`, а marker `/api/v1/trace` также возвращал 500.

## ROOT CAUSE

P0 repository и trace ledger были реализованы через `node:fs/promises`, но API routes выполняются в vinext/workerd-compatible runtime. Это смешало две разные runtime capability boundary:

```text
WORKER / WEB RUNTIME
HTTP routing / fetch / JSON

!=

NODE LOCAL RUNTIME
filesystem / append-only JSONL / local object persistence
```

## DECISION

`PROJECT_DECISION`: вынести filesystem persistence в отдельный локальный Node sidecar.

```text
Browser / test / script
        ↓
vinext API route
        ↓ HTTP/fetch
127.0.0.1:8791 Knowledge Factory sidecar
        ↓
local filesystem
```

API routes больше не импортируют Node filesystem repository/trace implementation напрямую. Они являются worker-compatible proxy facade.

## IMPLEMENTATION

Added:

```text
DZ_17/app/scripts/knowledge-factory-sidecar.mjs
DZ_17/app/lib/kf-sidecar-client.ts
```

Updated:

```text
/api/v1/kf/ingest
/api/v1/kf/sources
/api/v1/kf/trace
/api/v1/trace
scripts/run-with-models.mjs
package.json
/api/health
.github/workflows/dz17-check.yml
```

`npm run dev:models` теперь поднимает sidecar автоматически и затем запускает ALINA. При недоступном sidecar KF routes должны возвращать диагностический `503 KF_SIDECAR_UNAVAILABLE`, а не непрозрачный 500.

## TRACE CONTRACT

Sidecar владеет append-only runtime trace:

```text
trace_id
test_id
source
stage
action
status
route
method
duration_ms
details
at
```

Секретоподобные поля редактируются перед записью; длинные строки ограничиваются.

## SECURITY

- sidecar слушает `127.0.0.1` по умолчанию;
- клиентский ingest не может сам повысить Capture security status: persisted Capture принудительно получает `SECURITY_UNREVIEWED`;
- data-plane source text не получает control-plane authority;
- runtime trace не должен содержать tokens/secrets/password/API keys.

## VALIDATION

CI workflow обновлён: поднимает Node sidecar, production app, затем проверяет marker → KF sources → completion marker → trace ledger.

На момент записи latest CI после изменений ещё выполняется; runtime validation на Windows также требуется.

## NEXT

1. Sync local feature branch with `origin/main`.
2. Restart via `npm run dev:models`.
3. Verify `/api/health` reports `knowledgeFactory.sidecarReady=true`.
4. Run `scripts/smoke-kf-trace.ps1`.
5. Run real `Getting to Yes` PDF ingest.
6. Continue with A2 Structure Reconstructor only after traceable A1 succeeds.
