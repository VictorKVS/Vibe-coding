# Existing FATHER model zoo integration — 2026-09-13

## TASK
Connect the already existing local model zoo to DZ-17 / ALINA without downloading or copying duplicate model weights, while keeping direct GigaChat as cloud provider and one Mistral model as reserve.

## WHAT CHANGED
- Added `scripts/configure-existing-model-zoo.ps1`.
- Added llama.cpp router support for `LLAMA_MODELS_PRESET` with absolute model paths.
- Added `LLAMA_MODELS_MAX` and `LLAMA_MODELS_AUTOLOAD`; default design keeps at most one heavy local model loaded at once.
- Existing download bootstrap now detects a centralized FATHER model zoo and refuses duplicate downloads unless `-ForceDownload` is explicitly supplied.
- `.env.example` documents preset routing and persistent CA variables for GigaChat child processes.

## WHY
The human-provided local inventory already contains a mature model zoo. Copying weights into `DZ_17/app/models` would create duplicate storage, divergent versions and unnecessary maintenance. llama.cpp router presets support absolute GGUF paths, so ALINA can reference the canonical local model files directly.

## ORIGIN_CLASS
- `HUMAN_DECISION`: reuse existing centralized model zoo; no duplicate weights.
- `HUMAN_PROVIDED_INVENTORY`: local inventory supplied during the session.
- `ASSISTANT_PROPOSAL`: role aliases and default task mapping below.
- `SOURCE_DERIVED`: llama.cpp router supports `--models-preset` and absolute model paths; exact runtime behavior must still be validated on the local installed llama.cpp version.

## INVENTORY SNAPSHOT
Human-provided inventory contained 45 files: 29 GGUF, 12 SAFETENSORS, 2 BIN and 2 PT. ALINA text/vision gateway initially registers only selected GGUF files; image checkpoints, ASR and embedding assets remain separate capability families.

Default local role aliases generated when the corresponding files exist:

| Alias | Local model | Intended role |
|---|---|---|
| `local-fast-ru` | GigaChat3-10B-A1.8B Q4_K_S | fast dialogue / Russian |
| `local-general-qwen14b` | Qwen2.5-14B-Instruct-1M Q4_K_M | general synthesis / longer context |
| `local-deep-ru` | GigaChat-20B-A3B-Instruct v1.5 Q4_K_M | architecture / KB validation / Russian |
| `local-code-qwen14b` | Qwen2.5-Coder-14B-Instruct Q4_K_M | code |
| `local-code-deepseek` | DeepSeek-Coder-V2-Lite-Instruct Q5_K_M | code review |
| `local-vision-llava3` | LLaVA-Llama-3-8B INT4 + mmproj | vision |

Experimental creative models are not registered by default. They require `-IncludeExperimental`.

## DEFAULT TASK MAP
- dialogue -> `local-fast-ru`
- synthesis -> `local-general-qwen14b`
- architecture -> `local-deep-ru`
- kb_extract -> `local-general-qwen14b`
- kb_validate -> `local-deep-ru`
- vision -> `local-vision-llava3` when both model and projector exist

If a local model fails to load or execute, the existing provider chain continues to GigaChat, then the configured Mistral reserve, then DEMO.

## PHYSICAL PATHS
Committed code:
- `DZ_17/app/scripts/configure-existing-model-zoo.ps1`
- `DZ_17/app/scripts/run-with-models.mjs`
- `DZ_17/app/.env.example`

Local-only generated state:
- `DZ_17/app/runtime/config/llama-models.local.ini`
- `DZ_17/app/.env.local`

Model weights remain in the user's canonical centralized model zoo and are not committed or copied.

## VALIDATION
Required local validation:
1. run the registrar with `-WriteEnv`;
2. verify `llama-server.exe` is available;
3. restart `npm run dev:models`;
4. verify `/v1/models` through `/api/llm` returns the local aliases;
5. issue one manual request to each selected local text model and one image request to the vision model;
6. confirm failed local load falls through to GigaChat rather than breaking AUTO routing.

## REVIEW STATUS
Implementation committed; runtime validation pending on the user's Windows host.

## NEXT STEP
After the local models are visible in Control Center, add explicit capability families for code, embeddings and ASR instead of presenting every local asset as a generic chat model.
