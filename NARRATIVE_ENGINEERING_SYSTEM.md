# BOOK.CRAFT · Narrative Engineering System

## Product principle

BOOK.CRAFT is not a chat wrapper. It is a narrative engineering workspace where a work of fiction is treated as a structured system with a source of truth, entities, scenes, continuity rules, visual identity and production pipelines.

Primary user flow:

`Cover/Login → Format → Projects → Whole Work → Scenes → Characters → Comic → Video`

Technical controls are hidden behind `⚙ Под капотом` and remain observable through TRACE.

## Core invariant

No scene, comic panel or video shot may recreate a main character from scratch.

Every appearance references one canonical `character_id` and a versioned visual/textual profile. If a change is intentional, it creates a new continuity state rather than silently replacing the character.

## Narrative knowledge model

### Work

- `work_id`
- title
- type: story / novel / collection / comic / video
- source provenance
- current canon version

### Chapter

- `chapter_id`
- `work_id`
- order
- title
- source span

### Scene

- `scene_id`
- chapter
- order
- location
- time
- participants
- goal
- conflict
- outcome
- source spans
- continuity state before / after

### Beat

- `beat_id`
- `scene_id`
- dramatic function
- action
- participants
- emotion
- dialogue refs
- visual emphasis

### Character

- `character_id`
- canonical name
- aliases
- role
- biography
- age / age range
- appearance
- voice / speech style
- motivation
- relationships
- possessions
- visual anchors
- immutable traits

### Dialogue

- `dialogue_id`
- `scene_id`
- speaker `character_id`
- addressee(s)
- exact/source text reference
- emotion
- subtext
- order

### Event / Timeline

- `event_id`
- scene
- participants
- cause
- effect
- temporal position
- canon confidence

### Location / Object / Relationship

All use stable IDs and versioned facts with provenance.

## Comic pipeline

`Scene → Beat → Panel plan → Visual prompt → Generated panel → Page layout`

Each panel stores:

- `panel_id`
- `beat_id`
- participating `character_id`s
- shot size / camera angle
- composition
- dialogue bubble refs
- location ref
- visual continuity snapshot
- generated asset versions

A panel prompt is assembled from canonical data. It does not invent character identity independently.

## Video pipeline

`Scene → Beat → Shot → Asset → Voice → Subtitle → Timeline → Export`

Each shot references the same canonical entities as text and comic.

## Continuity engine

Mandatory checks:

1. character identity does not drift;
2. aliases resolve to one stable ID;
3. age, physical traits and role change only via explicit continuity event;
4. possessions cannot appear/disappear without a traceable event;
5. relationship changes are tied to events;
6. dialogue is attributed to a speaker;
7. scene time/location is consistent with surrounding timeline;
8. comic/video assets use the visual profile version valid for that scene.

## UI hierarchy

### Page 1 · Cover + authorization

Premium minimal screen explaining four platform capabilities. Authorization is secondary, not the visual center.

### Page 2A · Format

Story / Book / Comic / Video.

### Page 2B · Projects by format

Continue / Deploy / Rename / Duplicate / Rework / Build / Delete / New.

### Page 3A · Whole work

Clean full-screen manuscript reading surface.

### Page 3B · Scene engineering

Scene cards, ordering, participants, conflict, outcome, continuity warnings, scene split/merge.

### Page 3C · Character Bible

Canonical identity, visual sheet, speech style, relationships, timeline appearances and contradictions.

### Page 3D · Comic storyboard

Scene → beats → panels → page.

### Page 3E · Video pipeline

Scenes → shots → visual → sound → timeline.

### Under the hood

`⚙ Под капотом` reveals:

- active model and runtime;
- local/external agent switcher;
- project memory and sources;
- entity/canon diagnostics;
- ComfyUI/media backends;
- TRACE and correlation IDs;
- fallback/quarantine state.

## Trace contract

Each user action records:

`page → control → intended action → expected state → observed state → result`

Each long operation records lifecycle start/progress/terminal events.

Important narrative lifecycle events:

- `narrative.ingest.start/ready/error`
- `narrative.parse.start/ready/error`
- `narrative.character.detected/merged/conflict`
- `narrative.scene.detected/split/merged`
- `narrative.dialogue.attributed/ambiguous`
- `narrative.canon.created/updated/conflict`
- `comic.storyboard.start/ready/error`
- `comic.panel.generate.start/ready/error`
- `video.shot.build.start/ready/error`

## Storage direction

Browser storage is only for lightweight UI state and demo metadata.

Production project data should use:

- SQLite for structured entities and versions;
- filesystem/object storage for originals and media assets;
- vector index for semantic retrieval;
- append-only JSONL for runtime trace;
- explicit provenance from every derived fact back to source spans.

## Target UX

The author sees a simple creative workspace.

The engineer can open the same project and inspect the complete system state without leaving the product.
