# CODEX TASK — DZ-18 FATHER Content Generator

## Mission

Рабочий каталог:
`DZ_18. Integration with external services`

Нужно построить publishable web app **FATHER Content Generator**. Не называть генератор `ALINA Content Studio`.

## Architectural boundary — mandatory

```text
ALINA Analyst -> ResearchPacket -> shared/contracts -> ContentBrief -> FATHER Content Generator
```

ALINA Analyst отвечает за research/RAG/graph/reports и фактическую основу.

Content Generator отвечает за:
- briefs;
- personas;
- scenes;
- storyboard;
- images;
- audio;
- avatars;
- video;
- provider adapters.

Generator MUST NOT silently rewrite verified facts. Допустимые возвратные состояния:
- NEED_RESEARCH
- CONFLICT_FOUND
- MISSING_FACT
- SOURCE_REQUIRED

Не импортировать внутренние классы ALINA Analyst напрямую. Интеграция только через `src/shared/contracts`.

## Existing code skeleton

```text
src/
├── content_generator/
│   ├── briefs/
│   ├── personas/
│   ├── scenes/
│   ├── storyboard/
│   └── providers/
└── shared/
    └── contracts/
```

Сначала сохранить эту границу, затем выбирать UI/runtime.

## MVP priorities

1. Application shell.
2. Versioned prompt registry.
3. Newsletter.
4. Podcast.
5. Video Avatar external API (real avatars + voices lists).
6. Comic / Storyboard using Persona/Scene Engine.
7. Tests + publish + screenshots.

## Persona Engine

Reference personas:
- F-01 adult female;
- M-01 adult male.

Age presets:
- child_6_9
- child_10_12
- teen_13_17
- young_adult_18_29
- adult_30_49
- mature_50_64
- senior_65_plus

Minimum scene emotions:
neutral, friendly, focused, thinking, doubtful, concerned, surprised, confident, strict, explaining, happy.

All personas MUST use the same engine path.

## Provider abstraction

Core interfaces:
- ImageProvider
- AvatarProvider
- TTSProvider
- VideoProvider

HeyGen is the preferred first AvatarProvider, but provider-specific payloads must remain inside its adapter.

Secrets are server-side only. Never expose API keys to browser/client payloads or logs.

## Required tests

- ResearchPacket/ContentBrief validation;
- factual constraints preserved through handoff;
- Persona/Scene registry;
- provider DTO normalization;
- no-key graceful state;
- API secret never returned to client;
- HeyGen mocked adapter tests;
- application smoke test;
- production build.

## Do not do yet

Until baseline is green, do not spend time on realtime animation, LoRA training, complex lip-sync, custom video rendering, or full production FATHER extraction.
