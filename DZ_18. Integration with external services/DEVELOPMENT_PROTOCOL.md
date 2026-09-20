# FATHER Development Protocol

Status: `ACTIVE / CANONICAL ENGINEERING LOG`  
Scope: DZ-18 FATHER Content Generator → reusable FATHER AI / Persona / Media Platform  
Updated: 2026-09-20

## 1. Purpose

This document is the canonical development protocol for architecture decisions, engineering rules, experiments, operational findings, and promotion-to-production criteria.

The project is developed as an exploitable production system, not as a one-off demo. A component is not considered complete merely because it worked once. It must be reproducible, observable, replaceable, testable, auditable, and maintainable.

DZ-18 is an incubator and integration shell. The target is a reusable FATHER platform and production-grade Persona / Media Engine.

---

## 2. Non-negotiable engineering principles

### 2.1 Production-first engineering

Every technical decision is evaluated against long-term operation:

- reproducibility;
- maintainability;
- rollback;
- observability;
- security;
- provider replaceability;
- measurable quality;
- failure behavior;
- operating cost;
- deployment and recovery.

A successful manual experiment is evidence, not a production implementation.

### 2.2 Capability-first, not model-first

FATHER must request capabilities rather than hard-code specific vendors or model names.

Examples:

- `reasoning`;
- `fast_text`;
- `embedding`;
- `reranking`;
- `image_generation`;
- `image_identity`;
- `pose_control`;
- `inpainting`;
- `relighting`;
- `tts`;
- `video`;
- `search`.

Canonical flow:

```text
Task
  ↓
FATHER Router
  ↓
Capability Registry
  ↓
Policy / Cost Guard
  ↓
Provider selection
  ├── external free provider
  ├── local runtime
  ├── alternate free provider
  └── paid provider only by explicit approval
```

### 2.3 Provider independence

Core business logic must not know provider-specific API formats.

Use adapters/interfaces such as:

- `LLMProvider`;
- `EmbeddingProvider`;
- `ImageProvider`;
- `IdentityProvider`;
- `TTSProvider`;
- `VideoProvider`;
- `SearchProvider`.

Provider adapters must expose normalized:

- health/status;
- timeout/retry;
- rate limits;
- capability metadata;
- model/version;
- latency;
- cost/free-quota metadata;
- errors;
- audit-safe request metadata.

### 2.4 Cost policy

Default policy:

```text
FREE_ONLY = true
```

Priority:

```text
free external when advantageous
    ↓
local fallback / local specialist
    ↓
alternate free provider
    ↓
paid only after explicit approval
```

The platform must never silently switch from free execution to paid execution.

When free capacity is exhausted and no free/local fallback is available, return an explicit state such as:

```text
FREE_CAPACITY_EXHAUSTED
```

### 2.5 Reuse-first

Do not download or rebuild what already exists.

Before adding any model, adapter, workflow, runtime or external dependency:

1. inventory existing assets;
2. reproduce the old workflow;
3. benchmark it;
4. identify a measured capability gap;
5. add only the missing component.

Legacy systems are handled as:

```text
DISCOVER
  ↓
INVENTORY
  ↓
REPRODUCE
  ↓
MEASURE
  ↓
KEEP / MIGRATE / RETIRE
```

Nothing is deleted before its value and dependencies are understood.

### 2.6 Recipe-driven execution

A working combination must become a versioned recipe, not tribal knowledge.

A recipe records at minimum:

- capability;
- task/profile;
- provider/runtime;
- model and model version;
- prompt version;
- workflow version;
- seed/config where available;
- adapters;
- reference assets;
- sampler/steps/CFG or equivalent;
- quality gates;
- fallback route;
- latency;
- VRAM/RAM where relevant;
- external cost/free-quota impact;
- output artifact metadata.

Example:

```yaml
recipe_id: persona.fashion.full_body.v1
capability:
  - identity_consistency
  - full_body
  - fashion

execution:
  provider: local_comfyui

generator:
  family: sdxl

identity:
  strategy: measured_best_available

pose:
  strategy: measured_best_available

quality_gates:
  identity: required
  anatomy: required
  face: required
  artifacts: required

fallback:
  - external_free_provider
  - local_alternative
```

### 2.7 Evidence before promotion

No experimental configuration becomes production champion without:

- baseline;
- candidate;
- dataset/scenes;
- metric;
- result;
- regressions;
- latency delta;
- cost delta;
- human approval;
- rollback target.

Supported experiment modes:

- A/B;
- Champion/Challenger;
- Shadow;
- Replay;
- Regression.

---

## 3. Platform architecture target

```text
                         FATHER PLATFORM
                               │
                   ┌───────────┴───────────┐
                   │                       │
               CONTROL PLANE          EXECUTION PLANE
                   │                       │
          Agent / Prompt / Recipe       Providers
               Registries            ├── Local LLM
                   │                 ├── ComfyUI
            Policy / Cost Guard       ├── External Free
                   │                 ├── External Paid opt-in
              Router / Planner        ├── TTS / Video
                   │                 └── Search / RAG
             Evaluation / QA
                   │
            Audit / Observability
                   │
                Artifacts
```

Core registries:

- Agent Registry;
- Prompt Registry;
- Model / Provider Registry;
- Capability Registry;
- Persona Registry;
- Scene Registry;
- Recipe Registry;
- Asset Registry.

Important separation:

```text
Agent ≠ Prompt ≠ Model ≠ Provider ≠ Persona ≠ Recipe
```

Each layer must be independently replaceable and versioned.

---

## 4. Two visual execution contours

### 4.1 Local R&D Laboratory

Purpose: high-volume experimentation at near-zero marginal cost.

Research areas:

- adult female and male persona consistency;
- body proportions;
- full-body generation;
- pose control;
- clothing and wardrobe;
- facial identity;
- expressions;
- camera angles;
- lighting;
- fashion;
- swimwear;
- adult artistic anatomy;
- inpainting;
- relighting;
- ControlNet / IP-Adapter / LoRA / equivalent identity strategies.

The local lab is used to acquire engineering knowledge and produce repeatable recipes.

It is not acceptable to end with "this model looked good." The result must be converted into measurable capability knowledge.

### 4.2 Production Content Pipeline

Purpose: commercial-quality, reproducible content.

Production is free to use:

- proven local recipes;
- high-quality free external services;
- hybrid workflows;
- paid providers only after explicit approval.

Commercial output prioritizes:

- product fidelity;
- stable brand style;
- repeatability;
- correct typography;
- correct factual data;
- series consistency;
- predictable resolution;
- provenance;
- low manual rework.

Diffusion/image models should generate visual assets, not authoritative commercial typography.

Preferred pattern:

```text
AI image generation
  ↓
hero / character / environment / product visual
  ↓
deterministic FATHER Composer
  ↓
logo + price + text + CTA + legal text + grid + fonts
  ↓
PNG / PDF / campaign asset
```

---

## 5. Persona Engine goal

The core visual capability is not "generate a beautiful image." It is:

```text
one persona
  ↓
same recognizable identity
  ↓
multiple angles
  ↓
multiple expressions
  ↓
multiple poses
  ↓
multiple outfits
  ↓
multiple scenes
  ↓
identity remains stable
```

Target products:

- Persona Passport;
- Emotion Sheet;
- Sticker Pack;
- Comic / Storyboard;
- Comic Promo Poster;
- Style Guide;
- fashion/full-body assets;
- video/avatar source material.

First production-oriented Persona MVP:

1. Persona Passport;
2. Emotion / Sticker Pack;
3. Comic Promo Poster.

Success criterion for the first recovered pipeline: reproduce at least four consistent outputs from one existing persona/reference before adding a new identity technology.

---

## 6. Visual safety and data separation

Adult artistic/anatomy modes are treated as explicit adult-only workflows.

Requirements:

- adult-only persona profiles;
- no child/teen persona routed into adult artistic workflow;
- no ambiguous-age routing;
- separate prompt/recipe namespaces;
- reference-image provenance where applicable;
- real-person identity workflows require explicit ownership/permission policy before production use.

Child/teen presets remain separate from adult artistic pipelines.

---

## 7. Current technical baseline — 2026-09-20

### 7.1 Local hardware/runtime

Validated working environment:

- NVIDIA GeForce RTX 3060, 12 GB VRAM;
- approximately 32 GB system RAM;
- Python 3.10.11;
- ComfyUI 0.16.3;
- PyTorch 2.5.1 + CUDA 12.1 runtime;
- ComfyUI HTTP/API reachable on `127.0.0.1:8188`.

The environment is functional enough for SDXL-class experiments. Do not rebuild the Python environment without a measured reason.

### 7.2 Local LLM baseline

Validated standard local pack:

- Ministral 3 3B Instruct Q4_K_M;
- Qwen3 Embedding 0.6B;
- Qwen3 Reranker 0.6B;
- Ministral 3 8B Instruct Q4_K_M;
- Ministral 3 14B Reasoning Q4_K_M.

Current routing hypothesis:

- 3B: constrained routing/classification;
- 8B: general content/creative tasks;
- 14B: reasoning, QA, prompt engineering;
- embedding/reranker: local RAG.

No additional LLM downloads without a measured capability gap.

### 7.3 ComfyUI / image runtime

Primary working root:

```text
G:\1\Прежде\1_izobraznie\ComfyUI
```

Secondary/legacy root:

```text
G:\1\Прежде\1_izobraznie\AI\ComfyUI\ComfyUI
```

Other ComfyUI copies are currently treated as research/source/docker roots until proven otherwise.

Validated findings:

- ComfyUI server works;
- GPU/CUDA works;
- `ComfyUI_IPAdapter_plus` custom node imports successfully;
- `ComfyUI_Controlnet_Aux` imports;
- AnimateDiff is present but motion models are not installed in the active root;
- DWPose currently falls back from accelerated ONNX path and requires later optimization if it becomes a production bottleneck;
- stray `custom_nodes/input`, `custom_nodes/output`, `custom_nodes/workflows` directories cause import noise and must be cleaned only after dependency review.

### 7.4 Image assets already present

Known local assets include SDXL/SD1.5 checkpoints, LoRA, IP-Adapter-related files, segmentation, pose and relighting components.

Examples already discovered:

- JuggernautXL v8;
- RealVisXL V5 Lightning;
- DreamShaperXL Lightning;
- SDXL Base 1.0;
- SDXL MSPaint Portrait;
- SD1.5 inpainting;
- IC-Light SD1.5;
- SAM;
- body pose model;
- Headshot LoRA;
- cinematic lighting LoRA;
- other legacy/research assets.

Do not download additional image checkpoints until the old MindForge/A1111/ComfyUI persona workflows are reproduced and benchmarked.

### 7.5 CLIP/IP-Adapter finding

Validated CLIP Vision file:

```text
G:\1\Прежде\1_izobraznie\ComfyUI\models\clip_vision\CLIP-ViT-H-14-laion2B-s32B-b79K.safetensors
size: 3,944,552,236 bytes
```

This file is treated as valid and should not be re-downloaded without evidence of corruption.

The existing `ip-adapter-plus-face_sdxl_vit-h.bin` copies discovered in active folders are invalid/incomplete or misplaced for the intended production path.

One misplaced file in `models/checkpoints` caused `CheckpointLoaderSimple` to try loading an IP-Adapter file as a diffusion checkpoint, producing a PyTorch stream/archive load error.

Decision: do not rush to download a replacement identity adapter until the legacy MindForge/A1111 identity workflow is audited. The previous system may already contain an alternate working identity strategy.

---

## 8. Legacy assessment targets

Primary roots to inspect:

```text
G:\1\Прежде\1_izobraznie\MindForge_Studio
G:\1\Прежде\1_izobraznie\AI\stable-diffusion-webui-OLD
G:\1\Прежде\1_izobraznie\ComfyUI
G:\1\Прежде\1_izobraznie\AI\ComfyUI\ComfyUI
```

Search specifically for:

- AUTOMATIC1111 workflows/configuration;
- LoRA used for persistent characters;
- IP-Adapter / FaceID;
- InstantID;
- ReActor;
- ControlNet;
- pose models;
- reference images;
- prompt templates;
- seeds;
- batch scripts;
- output series that demonstrate identity consistency.

Goal: recover the previously successful "one persona → many states" workflow before designing a replacement.

---

## 9. Commercial content engineering

High-quality commercial content must use a layered pipeline.

LLM responsibilities:

- research packet consumption;
- brief;
- copy;
- variants;
- structured facts;
- scene/prompt planning.

Image provider responsibilities:

- hero imagery;
- characters;
- environments;
- visual variants;
- product scenes where fidelity permits.

Deterministic composer responsibilities:

- typography;
- Russian text;
- price;
- CTA;
- logo;
- brand grid;
- legal/disclaimer text;
- final dimensions;
- export.

This avoids relying on diffusion models for exact text and layout.

---

## 10. Observability and evidence

Track at minimum:

- task ID;
- recipe ID;
- provider;
- model/version;
- prompt/version;
- workflow/version;
- input/reference asset IDs;
- seed/config;
- wall-clock latency;
- generation latency;
- retries;
- errors;
- peak VRAM/RAM where measurable;
- free-quota consumption;
- monetary cost if any;
- quality score;
- identity consistency score;
- regeneration/manual correction rate;
- final artifact path/ID.

Do not invent performance statistics.

Speedup, throughput, rework percentage, remaining effort and completion forecasts are reported only when enough telemetry exists.

---

## 11. Reliability requirements

Production workflows must support:

- timeout;
- retry with bounded policy;
- normalized errors;
- circuit-breaker/backoff where appropriate;
- provider health;
- provider fallback;
- partial job recovery;
- idempotency where applicable;
- rollback;
- version pinning;
- reproducible replay.

A failed provider must not crash unrelated platform capabilities.

---

## 12. Security requirements

- secrets are server-side only;
- no secrets in repository;
- least privilege;
- provider keys isolated by adapter/service;
- audit trail for writes and generated artifacts;
- upload MIME/size validation;
- public/private persona separation;
- user/project ownership;
- rate limits and quotas;
- no silent use of personal data;
- explicit provenance for reference assets;
- license/source metadata for models/providers where required.

---

## 13. Definition of production-ready

A capability is production-ready only when:

- contract is versioned;
- implementation is provider-independent at the core;
- at least one validated provider/runtime exists;
- fallback behavior is defined;
- tests exist;
- failure behavior is verified;
- telemetry exists;
- artifacts are traceable;
- prompt/model/provider versions are recorded;
- security constraints are enforced;
- regression baseline exists;
- rollback is possible;
- deployment/runbook exists.

For Persona Engine additionally:

- identity consistency is benchmarked;
- full-body and portrait paths work;
- multiple contexts preserve identity;
- one independent API/client can invoke the engine without the DZ-18 UI.

---

## 14. Current execution priorities

### P0 — Legacy persona recovery

Recover and reproduce the old MindForge/AUTOMATIC1111/ComfyUI persona workflow.

No new identity adapter download until this audit is complete unless the audit proves the capability is missing.

### P1 — Capability / Provider Registry

Expand the existing Model Zoo into a provider-aware execution fabric with:

- capability metadata;
- free quota/cost metadata;
- privacy classification;
- health;
- fallback;
- local/external flags.

### P2 — Recipe Registry

Turn successful experiments into versioned recipes.

### P3 — Persona Engine MVP

Produce one stable adult fictional persona across:

- front;
- 3/4;
- profile;
- full body;
- emotion variants;
- outfit/context variants.

### P4 — Automated QC

Measure:

- identity;
- face;
- anatomy;
- hands;
- pose;
- prompt adherence;
- artifacts.

### P5 — Commercial production templates

Implement:

- Persona Passport;
- Sticker/Emotion Pack;
- Comic Promo Poster;
- deterministic poster/commercial compositor.

---

## 15. Architecture decision log

### ADR-001 — Production target

Decision: build for exploitation, not demo-only completion.

Reason: DZ-18 is an incubator for reusable FATHER capabilities.

### ADR-002 — Reuse-first

Decision: inventory and recover legacy pipelines before downloading or rebuilding.

Reason: minimize time, disk use and duplicated engineering.

### ADR-003 — Capability-first routing

Decision: agents request capabilities; Router chooses providers.

Reason: provider/model replaceability.

### ADR-004 — Free-first cost guard

Decision: default to free external or local execution; paid execution requires explicit approval.

Reason: maximize operating value while keeping spend controlled.

### ADR-005 — Local visual R&D

Decision: keep a strong local visual lab for persona/body/pose/identity experimentation.

Reason: unlimited iterative experimentation with low marginal cost and full workflow control.

### ADR-006 — Hybrid production

Decision: commercial content may use local and external providers in one workflow.

Reason: choose best quality/cost capability rather than forcing all workloads onto local hardware.

### ADR-007 — Deterministic commercial composition

Decision: text, pricing, logo, CTA and layout are composed programmatically where exactness matters.

Reason: diffusion-generated typography is not a reliable production dependency.

### ADR-008 — Recipe as engineering asset

Decision: validated combinations become versioned recipes with evidence.

Reason: convert experiments into reusable organizational knowledge.

### ADR-009 — Persona consistency is a core capability

Decision: identity persistence is treated as a first-class platform capability, not a prompt trick.

Reason: Persona Passport, stickers, comics, storyboards and video all depend on stable identity.

### ADR-010 — No blind environment rebuild

Decision: do not reinstall Python/CUDA/ComfyUI environments merely to modernize versions.

Reason: current runtime works; upgrades require a measured benefit and rollback plan.

---

## 16. Change protocol

Every meaningful development change should update this protocol or a linked evidence document with:

```text
Date
Task / hypothesis
Reason
Baseline
Change
Evidence
Result
Regression / side effects
What to improve
How to improve
Priority
Decision: KEEP / REVISE / RETIRE
Next step
```

Large benchmark data stays in dedicated benchmark/evidence files; this protocol records the decision and links the evidence.

---

## 17. Current next action

Do not continue the Psiphon/network side quest unless network access becomes a real blocker for a measured missing dependency.

Return to the project:

```text
audit old MindForge / A1111 identity pipeline
  ↓
identify existing identity technology
  ↓
reproduce one persona
  ↓
generate ≥4 consistent outputs
  ↓
measure
  ↓
record recipe
  ↓
only then decide whether a new IP-Adapter download is necessary
```

This is the current canonical path.


---

## 18. Development log — 2026-09-20 — Persona audit discovery failure

### Task / hypothesis

Run the read-only legacy persona audit to discover the previously working MindForge / AUTOMATIC1111 / ComfyUI identity pipeline.

### Baseline

The first execution printed only the audit header and final `[done]` line. No runtime root sections were emitted.

### Root cause

The original PowerShell script contained a hard-coded path with Cyrillic characters inside a UTF-8 source file. Windows PowerShell 5.1 is known in this project to misdecode UTF-8 script source without a BOM. As a result, every `Test-Path` check could evaluate against a corrupted path and silently skip all roots.

A second engineering problem was also identified: the script treated "zero roots found" as a successful audit. This is unsafe diagnostic behavior because an empty result is materially different from "no interesting assets found."

### Change

`AUDIT_EXISTING_PERSONA.ps1` was changed to:

- avoid hard-coding the Cyrillic parent directory;
- discover the ASCII-named `1_izobraznie` root under `G:\1`;
- print discovered roots and missing expected roots;
- fail explicitly with a non-zero exit code if no image/runtime roots are found;
- add a dedicated identity/model asset section for LoRA, IP-Adapter, InstantID, FaceID, ReActor, Headshot, Control/Pose and CLIP Vision artifacts;
- remain read-only.

### Evidence

First run:

```text
FATHER Existing Persona Pipeline Audit
======================================

[done] Do not modify or delete anything yet.
```

Interpretation: the audit did not actually inspect any configured root.

### Result

Decision: `REVISE`.

The audit script itself required correction before its output could be accepted as evidence about the legacy system.

### Regression / side effects

No project/runtime files are modified by the audit. The revised discovery adds lightweight directory enumeration under `G:\1` and recursive read-only inspection only after a valid runtime root is found.

### What to improve

Diagnostic scripts must distinguish:

- target not found;
- target found but empty;
- target found with no matching assets;
- successful evidence collection.

### How to improve

Adopt fail-loud discovery and explicit exit codes for all future inventory/diagnostic scripts.

### Priority

P0.

### Next step

Pull the corrected script, rerun the persona audit, preserve the log, then classify discovered assets/workflows as `KEEP / MIGRATE / RETIRE`.


---

## 19. Development log — 2026-09-20 — Legacy persona audit produced first real evidence

### Task / hypothesis

Rerun the corrected persona audit and determine whether the old image stack already contains usable identity/persistence technology.

### Evidence

The corrected audit discovered four runtime roots:

- legacy ComfyUI;
- legacy AUTOMATIC1111;
- active ComfyUI;
- MindForge Studio.

The legacy ComfyUI contains installed identity-related components including:

- `ComfyUI_IPAdapter_plus`;
- `ComfyUI_FaceAnalysis`;
- `ComfyUI-ReActor`;
- `ComfyUI_UltimateSDUpscale`;
- AnimateDiff-related code.

A previous output image named `BOOKCRAFT-lora-check_00001_.png` exists, proving that this legacy tree was used for at least one real generation/test workflow.

Several model/LoRA files in the legacy tree are zero-length placeholders or incomplete files. Therefore file presence alone cannot be treated as evidence of a working model.

### Interpretation

The old stack is not empty and should not be replaced blindly.

There is already a substantial identity toolchain candidate:

```text
reference / generated face
  ↓
FaceAnalysis / ReActor / IPAdapter candidate
  ↓
SDXL / SD generation
  ↓
upscale / refinement
```

However, the first audit output is too noisy to determine which exact identity strategy produced the earlier successful persona work. Plugin source files and examples dominate the listing.

### Decision

Decision: `KEEP FOR INVESTIGATION`.

Do not download a new identity stack yet.

The next audit must be evidence-focused and answer four questions:

1. Which identity-related custom nodes/extensions are actually installed?
2. Which non-zero model weights exist for those components?
3. Which real workflow JSON/YAML files reference them?
4. Which generated outputs can serve as proof of prior use?

### Change

Added `AUDIT_PERSONA_EVIDENCE.ps1`, a concise read-only evidence audit that reports:

- identity/runtime components;
- candidate identity/model weights with ZERO/NONZERO status;
- workflow candidates;
- recent generated outputs.

### Priority

P0.

### Next step

Run the concise evidence audit, preserve its log, then select one historical workflow/output pair for reproduction.


---

## 20. Development log — 2026-09-20 — Persona evidence narrowed to active ComfyUI

### Evidence

The concise evidence audit found a strong active-runtime baseline in the primary ComfyUI tree.

Validated identity assets:

- CLIP Vision ViT-H: approximately 3.76 GB, non-zero;
- SDXL IP-Adapter Plus Face safetensors: approximately 808.3 MB, non-zero;
- a misplaced/incomplete 15.3 MB IP-Adapter-named file still exists under `models/checkpoints`;
- zero-length placeholder copies also exist and must not be treated as valid models.

Validated components in the active ComfyUI tree:

- `ComfyUI_IPAdapter_plus`;
- `ComfyUI_Controlnet_Aux`;
- AnimateDiff code.

Validated historical outputs:

- `output/ages/face_*.png`;
- `output/emotions/face_*.png`.

The age series contains multiple generated images and a `было` archive/copy set. The repeated byte sizes between some files suggest that some files may be copies/moves rather than fresh generations; this must be verified from embedded metadata and hashes before interpreting them as separate benchmark samples.

MindForge Studio contains orchestration/workflow candidates including:

- `workflows/studio_character_v1.json`;
- `workflows/web_hero_v1.json`.

It does not itself expose the same model/runtime asset tree, which is consistent with treating MindForge as an orchestration/product layer over a separate generation runtime.

### Interpretation

The earlier assumption that a new IP-Adapter weight must be downloaded is no longer valid. A non-zero approximately 808 MB SDXL Plus Face adapter already exists in the correct active `models/ipadapter` location.

Decision: `KEEP / VERIFY`.

Do not download another identity adapter until the existing 808 MB adapter is load-tested.

### Next forensic step

Recover provenance from:

- embedded ComfyUI PNG metadata in one age output;
- embedded ComfyUI PNG metadata in one emotion output;
- `workflow_api.json`;
- `simple_generation.json`;
- MindForge `studio_character_v1.json`;
- MindForge `web_hero_v1.json`.

The goal is to reconstruct the exact historical pipeline: checkpoint, adapter/LoRA, reference input, prompt, seed, sampler, dimensions and identity-control nodes.

### Change

Added `RECOVER_PERSONA_PROVENANCE.ps1`.

The script is read-only toward legacy/runtime assets. It stores extracted evidence under `benchmarks/persona_provenance`.


---

## 21. Development log — 2026-09-20 — Historical persona workflow identified

### Evidence

Provenance recovery produced a decisive split between two historical paths.

#### A. `ages` and `emotions` PNG outputs

Embedded ComfyUI prompt metadata references only the basic SDXL generation chain:

- `sd_xl_base_1.0.safetensors`;
- `CheckpointLoaderSimple`;
- `KSampler`;
- `VAEDecode`;
- seed/VAE data.

No IP-Adapter, InstantID, ReActor, FaceID or ControlNet identity nodes were present in the extracted prompt metadata.

Interpretation: these outputs are useful historical generation samples, but they are not sufficient evidence of a stable identity-preservation workflow.

#### B. MindForge `studio_character_v1.json`

This workflow explicitly references:

- `sd_xl_base_1.0.safetensors`;
- `CLIP-ViT-H-14-laion2B-s32B-b79K.safetensors`;
- `ip-adapter-plus-face_sdxl_vit-h.bin`;
- `controlnet-openpose-sdxl.safetensors`;
- `IPAdapterAdvanced`;
- `InstantIDFaceAnalysis`;
- `ControlNetApplyAdvanced`;
- `KSampler`.

This is the strongest recovered candidate for the historical "one persona → many poses/scenes" architecture.

#### C. MindForge `web_hero_v1.json`

This workflow explicitly references:

- SDXL Base;
- CLIP Vision ViT-H;
- `ip-adapter-plus_sdxl_vit-h.bin`;
- `IPAdapterAdvanced`;
- `KSampler`.

Interpretation: this appears to be a lighter identity/style-preservation path for hero/site imagery without the full pose stack.

### Critical compatibility finding

The historical workflow names `.bin` IP-Adapter assets, while the active ComfyUI tree contains a non-zero approximately 808.3 MB `ip-adapter-plus-face_sdxl_vit-h.safetensors` in the correct `models/ipadapter` directory.

Therefore the recovered workflow should not be executed blindly. It first needs a compatibility audit that resolves:

- whether the historical `.bin` reference has a valid current equivalent;
- whether `controlnet-openpose-sdxl.safetensors` is present and non-zero;
- whether the required InstantID node/provider is installed in the active ComfyUI;
- whether node names/API schemas still match the current plugin versions.

### Decision

Decision: `MIGRATE CANDIDATE`.

`studio_character_v1.json` is promoted to the primary recovery target.

The `ages` / `emotions` PNG series remains useful as visual history but is not accepted as proof of identity consistency.

### Change

Added `CHECK_PERSONA_WORKFLOW_COMPAT.ps1`.

The script performs a read-only filesystem compatibility audit for the recovered MindForge workflows and reports:

- referenced nodes;
- referenced model/assets;
- FOUND / ZERO / MISSING status;
- compatible alternate filename candidates;
- installed custom-node hints.

### Next step

Run the compatibility audit. If the required active components are present, create a migrated `studio_character_v2` workflow using current model filenames and validate it with one controlled reference image before any new downloads.


---

## 22. Development log — 2026-09-20 — Persona workflow compatibility status

### Compatibility result

The recovered `studio_character_v1.json` is only partially compatible with the active ComfyUI runtime filesystem.

Confirmed present:

- `sd_xl_base_1.0.safetensors` — non-zero;
- CLIP Vision ViT-H — non-zero;
- `IPAdapterAdvanced` provider candidate via `ComfyUI_IPAdapter_plus`;
- `ControlNetApplyAdvanced` provider candidate via the active ControlNet stack;
- non-zero IP-Adapter Plus Face weights exist, including a large adapter file in the active image runtime.

Confirmed missing or unresolved:

- `controlnet-openpose-sdxl.safetensors` is not present;
- no filesystem hint for a provider of `InstantIDFaceAnalysis`;
- `web_hero_v1.json` references `ip-adapter-plus_sdxl_vit-h.bin`, which is not present by that exact name.

### Important cleanup finding

There are multiple duplicate/misplaced adapter/CLIP files across:

- `models/checkpoints`;
- `models/ipadapter`;
- `models/clip_vision`;
- a backup folder.

Some are valid non-zero files, some are known-bad/misplaced historical copies.

Decision: do not delete yet. First determine which exact files the live ComfyUI runtime exposes through `/object_info` and which nodes actually load.

### Engineering decision

Do not install OpenPose/InstantID yet.

First test the live runtime itself. Filesystem presence is weaker evidence than successful runtime node registration.

Added `CHECK_PERSONA_RUNTIME.ps1` to query the primary ComfyUI API and report:

- whether ComfyUI is reachable;
- whether `IPAdapterAdvanced`, `InstantIDFaceAnalysis`, `ControlNetApplyAdvanced` and core loader nodes are actually registered;
- all runtime node names related to identity/pose;
- model choices exposed by loader nodes where available.

### Migration strategy

Use two stages:

1. **Identity MVP** — SDXL + CLIP Vision + existing IP-Adapter Face, no new downloads.
2. **Pose-controlled Persona v2** — add/recover pose control only after identity MVP is proven.

This reduces variables and avoids adding OpenPose/InstantID before their incremental value is measured.

### Next step

Run `CHECK_PERSONA_RUNTIME.ps1`. If the current IP-Adapter node is registered and its existing model is visible, build a minimal identity smoke workflow before any new dependency installation.


---

## 23. Development log — 2026-09-20 — Persona runtime check blocked by stopped ComfyUI

### Evidence

`CHECK_PERSONA_RUNTIME.ps1` attempted to query the primary ComfyUI API at:

```text
http://127.0.0.1:8188
```

Result:

```text
[FAIL] ComfyUI runtime is not reachable at http://127.0.0.1:8188
```

### Interpretation

This is not evidence of a broken Persona stack. It only shows that the primary ComfyUI runtime was not running at the time of the check.

### Decision

Decision: `NO CHANGE`.

Do not install, repair or modify dependencies yet.

### Next step

Start the known primary ComfyUI source runtime from:

```text
G:\1\Прежде\1_izobraznie\ComfyUI
```

using the existing Python environment, verify port 8188, then rerun `CHECK_PERSONA_RUNTIME.ps1`.


---

## 24. Development log — 2026-09-20 — Live ComfyUI persona runtime validated

### Runtime result

The primary ComfyUI runtime is reachable on `127.0.0.1:8188`.

Validated live environment:

- ComfyUI `0.16.3`;
- Python `3.10.11`;
- PyTorch `2.5.1+cu121`;
- NVIDIA GeForce RTX 3060 12 GB;
- approximately 11 GB VRAM free at idle during the check.

### Required runtime nodes

Registered:

- `IPAdapterAdvanced`;
- `ControlNetApplyAdvanced`;
- `CheckpointLoaderSimple`;
- `CLIPVisionLoader`;
- `ControlNetLoader`.

Not registered:

- `InstantIDFaceAnalysis`.

The runtime additionally exposes a rich current IP-Adapter stack including:

- `IPAdapterFaceID`;
- `IPAdapterUnifiedLoaderFaceID`;
- `IPAdapterInsightFaceLoader`;
- `IPAdapterPreciseComposition`;
- `IPAdapterPreciseStyleTransfer`;
- `IPAdapterRegionalConditioning`;
- batch/tiled/weights/embeds variants.

Pose preprocessors including `OpenposePreprocessor`, `DensePosePreprocessor`, MediaPipe face mesh and related pose nodes are registered.

### Loader state

`CheckpointLoaderSimple` exposes:

- valid `sd_xl_base_1.0.safetensors`;
- valid `juggernautXL_v8Rundiffusion.safetensors`;
- an invalid/misplaced IP-Adapter-named file that must never be selected as a checkpoint.

`CLIPVisionLoader` exposes:

- valid CLIP ViT-H;
- duplicate/backup entries;
- an incorrectly placed IP-Adapter-named file that must never be selected as CLIP Vision.

`IPAdapterModelLoader` exposes both:

- `ip-adapter-plus-face_sdxl_vit-h.bin`;
- `ip-adapter-plus-face_sdxl_vit-h.safetensors`.

`ControlNetLoader` currently exposes no model choices.

### Decision

Decision: `IDENTITY MVP READY / POSE MODEL BLOCKED`.

The live runtime is sufficient to build the first identity-preservation smoke test without any download.

InstantID is not required for the first MVP because the current IP-Adapter stack already provides FaceID/InsightFace-capable nodes.

Pose-controlled generation remains a second-stage task because no ControlNet model is currently exposed by `ControlNetLoader`.

### Migration path

Do not execute `studio_character_v1` unchanged.

Create a reduced `studio_character_v2_identity_smoke` derived from the recovered workflow:

```text
SDXL Base
  ↓
CLIP Vision ViT-H
  ↓
existing IP-Adapter Plus Face
  ↓
reference image
  ↓
IPAdapterAdvanced
  ↓
KSampler
  ↓
VAE Decode
  ↓
SaveImage
```

Exclude for the first smoke:

- `InstantIDFaceAnalysis`;
- ControlNet/OpenPose model dependency.

### Hygiene issue

The active ComfyUI model directories contain duplicate/misplaced files that pollute loader choices.

Decision: do not delete yet. After the first successful smoke, quarantine incorrect loader-path copies with hashes recorded so rollback remains possible.

### Change

Added `INSPECT_PERSONA_WORKFLOW.ps1` to print and normalize the exact recovered `studio_character_v1` node graph before generating the v2 migration.

### Next step

Inspect the historical node graph and inputs. Use the actual recovered wiring to build `studio_character_v2_identity_smoke` rather than inventing a new graph from memory.


---

## 25. Development log — 2026-09-20 — Evidence auto-publishing to GitHub

### User requirement

Generated diagnostic/evidence files that are useful for engineering analysis should be published to the active GitHub feature branch so they remain visible to the connected review workflow and are not trapped only on the local workstation.

### Engineering decision

Adopt controlled evidence publishing rather than unrestricted automatic `git add .`.

Added `PUBLISH_EVIDENCE.ps1` with the following guardrails:

- only files under `DZ_18. Integration with external services/benchmarks` are eligible;
- only text/evidence extensions are auto-published: JSON, TXT, MD, CSV, YAML/YML;
- files larger than 10 MB are skipped;
- likely API keys/tokens/passwords/Bearer secrets are scanned and blocked;
- models, images, binaries and runtime assets are not auto-published;
- only explicitly selected evidence paths are staged/committed;
- unrelated local/staged work is not intentionally included;
- publishing occurs to the current branch;
- a failed push does not delete local evidence or silently rewrite history.

### Integrated scripts

`INSPECT_PERSONA_WORKFLOW.ps1` now automatically publishes:

- `benchmarks/persona_provenance/studio_character_v1.normalized.json`;
- `benchmarks/persona_provenance/studio_character_v1.nodes.txt`.

`RECOVER_PERSONA_PROVENANCE.ps1` now publishes eligible textual provenance evidence produced under:

- `benchmarks/persona_provenance/`.

### Operational rule

From this point forward, new diagnostic scripts should follow the same pattern:

```text
generate evidence locally
  ↓
validate / redact / allowlist
  ↓
commit only evidence files
  ↓
push current feature branch
  ↓
analysis can read the evidence directly from GitHub
```

Do not auto-publish generated images, model weights, secrets, `.env`, raw credentials or large binary artifacts.

### Decision

Decision: `KEEP`.

This becomes the standard evidence handoff mechanism for FATHER development.


---

## 26. Development log — 2026-09-20 — GitHub evidence review exposed manifest/inspector gap

### Evidence review

The automatically published files were successfully read from GitHub.

`studio_character_v1.normalized.json` contains a compact MindForge persona manifest with:

- checkpoint: `sd_xl_base_1.0.safetensors`;
- identity adapter: `IPAdapterAdvanced`;
- CLIP Vision ViT-H;
- IP-Adapter Plus Face;
- optional InstantID face analysis;
- optional ControlNet/OpenPose stage;
- sampler: DPM++ 2M, Karras, 40 steps, CFG 7.0;
- IP-Adapter weight 0.45, linear, full 0.0→1.0 range;
- ControlNet strength 0.65, active 0.0→0.85.

The manifest has explicit high-level connections:

```text
checkpoint.model
  -> ipadapter.model
  -> controlnet.model
  -> sampler.model
```

However, this is not a complete runnable ComfyUI API prompt. It omits several execution-critical inputs such as positive/negative conditioning, latent/image input, reference image wiring, VAE decode/save wiring and concrete node link tuples.

### Inspector defect

`studio_character_v1.nodes.txt` showed only `NODE nodes: <unknown>` because the inspector supported a top-level node map and a `nodes` list, but not a `nodes` dictionary.

Decision: `REVISE`.

The inspector was corrected to support dictionary-based MindForge manifests.

### Next engineering requirement

Before generating `studio_character_v2_identity_smoke`, capture the **live ComfyUI schemas** for the exact nodes we intend to use. This avoids inventing required input names or old plugin API shapes.

Added `CAPTURE_PERSONA_RUNTIME_SCHEMA.ps1`.

It queries live `/object_info`, extracts only Persona-relevant nodes, writes:

- `benchmarks/persona_runtime/persona_runtime_schema.json`;
- `benchmarks/persona_runtime/persona_runtime_schema.txt`;

and auto-publishes both through the guarded evidence publisher.

### Decision

Decision: `SCHEMA-FIRST MIGRATION`.

Do not hand-author the runnable v2 graph until the live runtime schema is captured and reviewed.
