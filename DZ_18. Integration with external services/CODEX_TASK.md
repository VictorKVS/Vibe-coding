# CODEX TASK — DZ-18 ALINA Content Studio

## Mission
Собрать полностью рабочее ДЗ-18 в каталоге:
`DZ_18. Integration with external services`

Не делать отдельный экспериментальный проект. Результат должен быть самостоятельным publishable web app и одновременно первым Persona/Media Engine prototype для FATHER.

## MVP PRIORITY — ENGINE FIRST

Главный результат MVP — не набор вкладок, а **единый Persona/Scene Engine**.

Обязательные reference-персонажи:
- F-01 adult female;
- M-01 adult male.

Оба обязаны использовать один и тот же engine path.

Возраст — data-driven параметр:
- child_6_9;
- child_10_12;
- teen_13_17;
- young_adult_18_29;
- adult_30_49;
- mature_50_64;
- senior_65_plus.

До advanced polish необходимо доказать:
- один Persona Registry;
- один Scene Registry;
- emotion switching;
- wardrobe/background switching;
- provider abstraction;
- female + male storyboard demo;
- минимум один child/teen preset smoke test.

Полный контракт: `PERSONA_ENGINE_MVP.md`.

## Source-of-truth по заданию
Обязательные функции:
- AI content assistant based on scenario;
- три основных раздела с индивидуальным дизайном/логикой;
- самостоятельно написанные system prompts;
- external service integration для Video Avatar;
- API list voices;
- API list avatars;
- дополнительная вкладка;
- published app;
- screenshots итогового тестирования.

Дополнительная вкладка выбрана: **Comic / Storyboard**.

## P0 — Repository intake
1. Inspect existing repo and reusable media/content code.
2. Create REUSE / EXTEND / NEW matrix.
3. Do not copy giant modules if shared code can be reused safely.
4. Establish local run + build + lint baseline.
5. Add .env.example, never secrets.

Exit gate: app builds locally and structure is documented.

## P1 — Application shell
Create responsive Russian UI:
- left/top navigation;
- tabs: Рассылки / Подкасты / Видео-аватар / Комикс;
- common input panel;
- result/preview panel;
- status/error layer;
- day/night-ready corporate styling.

Exit gate: all routes/tabs work without provider keys.

## P2 — Prompt/LLM layer
Create versioned prompt registry written specifically for this project.

Prompts:
- newsletter;
- podcast;
- avatar script;
- comic/storyboard;
- emotion/scene planner.

Contract:
```text
prompt_id
version
role
objective
input schema
output schema
hard constraints
fallback behavior
```

Do not put system prompts inline inside random components.

Exit gate: each content mode receives structured JSON result with validation.

## P3 — Newsletter
Implement:
- subject;
- preheader;
- body;
- CTA;
- tone/audience;
- optional image brief;
- preview;
- copy/export.

Exit gate: deterministic UI + LLM provider abstraction + validation.

## P4 — Podcast
Implement:
- podcast outline/script;
- speakers or narrator;
- duration target;
- voice settings;
- TTS provider abstraction;
- playable result when provider configured;
- demo-safe fallback when not configured.

Exit gate: script generation independent from TTS availability.

## P5 — Video Avatar external API
Preferred provider: HeyGen, provider adapter mandatory.

Server-only:
- HEYGEN_API_KEY;
- GET/list avatars;
- GET/list voices;
- normalized provider DTO;
- error handling;
- timeout;
- no secret leakage to client.

UI:
- search/filter;
- avatar card;
- voice card;
- selected pair;
- provider health/status;
- optional video generation;
- optional polling if generation implemented.

Important: assignment only requires listing voices + avatars through real API. Video generation is bonus.

Exit gate:
- real API integration demonstrable;
- explicit mode if mocked;
- screenshots can prove lists are loaded.

## P6 — Comic / Storyboard
Build Persona/Scene MVP.

### Persona Registry
Minimum:
```ts
type Persona = {
  id: string
  name: string
  identityPrompt: string
  visualAnchor: string
  personality: string
  voiceProfile?: string
  defaultWardrobe: string[]
  allowedStyles: string[]
  negativeConstraints: string[]
}
```

### Scene
```ts
type Scene = {
  id: string
  personaId: string
  order: number
  purpose: string
  emotion: string
  pose: string
  action: string
  environment: string
  wardrobe: string
  props: string[]
  dialogue: string
  imagePrompt: string
}
```

Minimum emotions:
neutral, friendly, focused, thinking, doubtful, concerned,
surprised, confident, strict, explaining, happy.

Workflow:
```text
topic
→ comic script
→ scene plan
→ emotion map
→ persona consistency injection
→ image prompts
→ generated/placeholder frames
→ comic strip preview
```

Image provider must be an adapter. Do not couple Persona Registry to one image API.

Exit gate:
- same persona identity data reused in all frames;
- visible emotion changes;
- 4–9 frame story;
- frame regeneration does not rewrite entire story.

## P7 — Shared Media Core
Create reusable:
- media provider interface;
- image task;
- audio task;
- avatar task;
- job status;
- provider metadata;
- error normalization.

This should later be extractable to FATHER shared module.

## P8 — Tests
At minimum:
- prompt output schema tests;
- Persona/Scene registry tests;
- provider DTO normalization tests;
- API key never returned to client test;
- HeyGen adapter mocked unit tests;
- no-key graceful state;
- tab smoke test;
- production build.

## P9 — Submission package
Create:
- README;
- architecture;
- run instructions;
- environment variables;
- provider setup;
- demo scenario;
- screenshots checklist;
- assignment requirement matrix: REQUIREMENT -> IMPLEMENTATION -> EVIDENCE;
- publish instructions / actual URL when deployed.

## Do not overbuild before baseline
Before all mandatory assignment checks pass, do NOT spend time on:
- full-body realtime animation;
- complex lip-sync;
- LoRA training;
- multi-character continuity engine;
- production FATHER integration;
- custom video renderer.

Those belong to POLISH.

## Phase B — Polish
After baseline passes:
1. consistent face benchmark;
2. emotion sheet;
3. pose sheet;
4. wardrobe/background policy;
5. comic templates;
6. motion comic;
7. lip-sync/TTS;
8. character animation;
9. shared FATHER module extraction;
10. A/B testing of prompts and visual consistency.

## Required final report
```text
WHAT WAS REQUIRED
WHAT WAS IMPLEMENTED
WHERE IN CODE
HOW TESTED
SCREENSHOT / URL EVIDENCE
KNOWN LIMITATIONS
NEXT POLISH TASKS
```
