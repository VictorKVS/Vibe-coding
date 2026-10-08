# Production Roadmap — FATHER Persona / Media Engine

Status: `TARGET = PRODUCTION`

## 1. Product goal

DZ-18 is the incubator and demo shell. The target product is a reusable production-grade Persona/Media Engine used by:
- FATHER agents;
- websites;
- training products;
- comics/storyboards;
- avatar/video workflows;
- podcast/TTS workflows;
- interactive assistants;
- future applications.

The engine must be reusable outside DZ-18 without copying UI-specific code.

## 2. Canonical architecture

```text
Persona Registry
      ↓
Persona Runtime
      ↓
Scene Engine
      ↓
Emotion / Age / Wardrobe / Context policies
      ↓
Prompt Builder
      ↓
Provider Adapter Layer
      ├── Image
      ├── Avatar
      ├── TTS
      └── Video
      ↓
Asset Store + Metadata
      ↓
Site / Agent / Comic / Avatar / Podcast clients
```

## 3. Production capabilities

### Persona
- stable persona_id;
- versioned identity specification;
- male/female reference personas;
- age presets;
- voice binding;
- wardrobe library;
- visual style policies;
- reference assets;
- negative identity constraints;
- lifecycle/version history.

### Scene
- typed scene model;
- emotion and intensity;
- pose/action;
- environment;
- season/time;
- clothes;
- props;
- camera;
- dialogue/narration;
- deterministic scene IDs;
- partial regeneration.

### Consistency
- identity anchor injection;
- provider-independent consistency contract;
- reference image support where provider allows;
- benchmark for face/persona consistency;
- regression suite across emotions/backgrounds/clothes/ages.

### Providers
Adapters only. Core must not know provider-specific API shapes.

Required interfaces:
- ImageProvider;
- AvatarProvider;
- TTSProvider;
- VideoProvider.

Provider requirements:
- health/status;
- timeout/retry;
- normalized errors;
- rate-limit handling;
- cost metadata;
- model/version metadata;
- audit-safe request metadata;
- no secret leakage.

## 4. API surface

Target service API:

```text
GET    /personas
POST   /personas
GET    /personas/:id
POST   /personas/:id/versions

POST   /storyboards
GET    /storyboards/:id

POST   /scenes
PATCH  /scenes/:id
POST   /scenes/:id/render
POST   /scenes/:id/regenerate

GET    /providers
GET    /providers/:id/voices
GET    /providers/:id/avatars

GET    /jobs/:id
GET    /assets/:id
```

All write operations must be auditable.

## 5. Storage

Persist:
- persona definitions;
- persona versions;
- scene definitions;
- storyboard definitions;
- generated asset metadata;
- provider/model version;
- prompt version;
- seed/config where available;
- source/reference asset links;
- job status;
- error status;
- cost/latency;
- user/project ownership;
- audit events.

Generated binaries may live in object/file storage; DB stores canonical metadata and refs.

## 6. Security

Production requirements:
- provider secrets server-side only;
- RBAC for persona/project access;
- separate public/private personas;
- input sanitization;
- prompt-injection-safe provider prompts where applicable;
- upload validation;
- MIME/size limits;
- audit trail;
- rate limiting;
- quotas;
- provider failover policy;
- no PII assumptions in public demo;
- explicit handling for user-owned images and reference assets.

## 7. Observability

Track:
- provider latency;
- render success rate;
- retry rate;
- cost per asset;
- persona consistency score;
- regeneration rate;
- prompt version;
- provider/model version;
- user corrections;
- failed scene types;
- age/emotion failure patterns.

No invented production statistics. Baseline first, then measured comparison.

## 8. Quality gates

### Q0 Schema
Persona/Scene/Provider contracts stable and versioned.

### Q1 Dual reference
Adult female and adult male work through the same engine.

### Q2 Age architecture
At least one child/teen preset works without special-case code.

### Q3 Emotion benchmark
Reference personas rendered across the required emotion set.

### Q4 Context benchmark
Office / outdoor / training / casual contexts preserve identity.

### Q5 Provider portability
At least two providers can satisfy one media interface OR one provider plus a validated mock adapter proves portability.

### Q6 Failure behavior
Timeouts, missing keys, provider errors, invalid assets, partial jobs handled safely.

### Q7 Persistence/audit
Every generated asset can be traced to persona version + scene + provider/model + prompt version.

### Q8 API
Independent client can create storyboard and request render without DZ-18 UI.

### Q9 Website integration
Embed/use component from another site without copying engine internals.

### Q10 Agent integration
FATHER agent can request a persona scene through service contract.

## 9. A/B and self-improvement

Version and compare:
- identity prompts;
- emotion prompts;
- scene planner prompts;
- provider routing;
- negative constraints;
- consistency strategies.

Experiment modes:
- A/B;
- Champion/Challenger;
- Shadow;
- Replay;
- Regression.

Each proposed improvement must show:
- baseline;
- candidate;
- metric;
- dataset/scenes;
- result;
- regressions;
- cost/latency delta;
- recommendation;
- human approval status.

The engine may propose improvements but must not silently replace production champion settings.

## 10. Delivery phases

### Phase A — DZ-18 MVP
- female reference;
- male reference;
- age preset smoke test;
- emotion switching;
- scene switching;
- Comic/Storyboard;
- voices/avatars external API;
- publishable demo.

### Phase B — Engine extraction
Move reusable contracts/runtime from DZ-18 UI into shared package/service.

### Phase C — Production service
Persistence, API, auth/RBAC, provider jobs, asset store, audit, observability.

### Phase D — Quality laboratory
Consistency benchmark, prompt experiments, provider comparisons, regression.

### Phase E — FATHER integration
Use same Persona Engine from agents and sites.

## 11. Definition of Production Ready

Production-ready means all are true:
- one shared engine, no per-site forks;
- versioned Persona and Scene contracts;
- female and male reference personas;
- age presets data-driven;
- provider abstraction;
- persisted state;
- auditable generation;
- API;
- security controls;
- error/retry handling;
- observability;
- regression tests;
- A/B framework;
- rollback/champion policy;
- site integration example;
- FATHER agent integration example;
- deployment/runbook;
- backup/restore for metadata;
- measured performance baseline;
- no secret in repository.

DZ-18 completion is milestone 1, not the end of the product.
