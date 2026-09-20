# FATHER Image Zoo Benchmark

## Why benchmark before downloading more models

The current machine already contains several SDXL-class checkpoints and control assets. The goal is to assign roles using evidence rather than model popularity.

## Test principle

Each checkpoint receives the same scene definition and, where technically meaningful, the same seed.

The benchmark separates three things:

1. base checkpoint quality;
2. identity/control pipeline quality;
3. layout/composition quality.

A checkpoint should not be blamed for failures caused by a missing pose adapter, identity adapter or layout engine.

## Six benchmark cases

### IMG-BENCH-001 — Neutral adult portrait

Checks:

- face quality;
- eyes;
- skin;
- hair;
- obvious artifacts.

### IMG-BENCH-002 — Full body adult character

Checks:

- anatomy;
- hands;
- feet;
- limbs;
- body proportions;
- framing.

### IMG-BENCH-003 — Fashion runway

Checks:

- clothing structure;
- pose;
- body consistency;
- scene composition;
- lighting.

### IMG-BENCH-004 — Swimwear editorial

Checks:

- explicitly adult subject;
- anatomy;
- material rendering;
- pose stability;
- artifact rate.

### IMG-BENCH-005 — Persona consistency sheet

Uses IP-Adapter.

Generate the same fictional adult persona as:

- front portrait;
- 3/4 portrait;
- profile;
- full body.

This test is more important than a single attractive image because FATHER needs repeatable characters.

### IMG-BENCH-006 — Comic promo poster assets

Generate visual assets only.

Text and final layout should be composed deterministically outside the diffusion checkpoint.

That avoids asking the image model to solve typography and layout at the same time.

## Scoring

Use 0–5 per criterion.

```text
0 = unusable
1 = major failure
2 = weak
3 = acceptable
4 = good
5 = production candidate
```

Do not calculate an overall winner across all capabilities.

Assign a model to a role only when it performs adequately for that role.

## Expected architecture after benchmark

```text
Image Router
  ├── portrait -> selected checkpoint
  ├── full body -> selected checkpoint
  ├── fashion -> selected checkpoint
  ├── persona -> checkpoint + IP-Adapter
  ├── pose -> checkpoint + pose control
  ├── edit -> inpainting
  ├── relight -> IC-Light
  └── poster -> generated panels + deterministic compositor
```

## Next step

Run:

```powershell
.\CHECK_IMAGE_ZOO.ps1
```

The inventory CSV becomes the source of truth for local paths and duplicates.

After exact paths are known, build ComfyUI workflows around those existing assets instead of copying or downloading them again.
