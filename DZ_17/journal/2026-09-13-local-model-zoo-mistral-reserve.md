# 2026-09-13 — Local Model Zoo + Mistral Reserve

## TASK
Add multiple native local models to ALINA and one external Mistral reserve without reintroducing OpenAI into AUTO routing.

## WHAT CHANGED
- `DZ_17/app/scripts/run-with-models.mjs`: launcher now searches `llama-server.exe` in PATH when the repo-local binary is absent.
- `DZ_17/app/scripts/setup-local-model-zoo.ps1`: Windows bootstrap for llama.cpp plus two GGUF models.
- `DZ_17/app/.env.example`: AUTO route becomes `llamacpp -> gigachat -> compatible(Mistral Reserve) -> demo`; one Mistral model is pinned.

## WHY
- Local-first execution reduces external dependency and keeps selected workloads on the workstation.
- GigaChat remains the primary cloud provider.
- One independent cloud reserve reduces single-provider outage risk without creating a large provider zoo.

## ORIGIN_CLASS
- Architecture/routing decision: `HUMAN_DECISION` + `ASSISTANT_PROPOSAL` implementation.
- llama.cpp Windows installation and Qwen/Gemma invocation patterns: `SOURCE_DERIVED` from upstream Hugging Face model cards / llama.cpp usage instructions.
- Mistral API compatibility: `SOURCE_DERIVED` from official Mistral API docs (`GET /v1/models`, `POST /v1/chat/completions`, Bearer auth).

## SOURCE / DECISION
- Qwen local baseline: `Qwen/Qwen3-4B-GGUF`, Q4_K_M, Apache-2.0.
- Gemma local alternate: `ggml-org/gemma-3-4b-it-GGUF`, Q4_K_M, Gemma license.
- Reserve cloud model: `mistral-small-latest` through `https://api.mistral.ai/v1` using the existing OpenAI-compatible adapter.

## PHYSICAL PATHS
- Local model files: `DZ_17/app/models/*.gguf` (runtime/local; large binaries are not part of application source).
- Launcher: `DZ_17/app/scripts/run-with-models.mjs`.
- Bootstrap: `DZ_17/app/scripts/setup-local-model-zoo.ps1`.
- Local secrets/config: `DZ_17/app/.env.local` (never commit).

## DEPENDENCIES
- Windows WinGet for convenient llama.cpp installation.
- Internet access for initial GGUF download and Mistral/GigaChat cloud calls.
- Mistral API key is required only for the reserve provider.

## VALIDATION / TEST
1. `Get-Command llama-server.exe` resolves after llama.cpp installation.
2. `models/` contains one or both GGUF files.
3. `npm run dev:models` starts llama.cpp and `/api/llm` exposes `LOCAL · ...` models as READY.
4. With `COMPATIBLE_API_KEY` configured, `Mistral Reserve · mistral-small-latest` becomes READY.
5. AUTO route shows local first, GigaChat second, Mistral reserve third, DEMO last.

## REVIEW STATUS
Implementation ready for workstation validation. No secret values committed.

## NEXT STEP
Measure local latency/RAM/VRAM and then pin task-specific local models only after real telemetry is available.
