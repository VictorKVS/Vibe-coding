# FATHER Image Generation Policy

## Purpose

FATHER Image Studio supports multiple visual domains using the same Image Zoo and different prompt/workflow profiles.

Supported capability groups include:

- portrait;
- full body;
- fashion;
- swimwear;
- artistic adult nude;
- anatomy reference;
- expression sheets;
- sticker packs;
- comics;
- promo posters;
- identity consistency;
- pose control;
- inpainting;
- relighting.

## Adult artistic nude / anatomy mode

This is a separate workflow profile, not a separate mandatory base model.

Recommended local candidates from the current inventory:

- JuggernautXL v8;
- RealVisXL V5;
- SDXL Base 1.0;
- IP-Adapter Plus Face SDXL when identity consistency is needed;
- body pose control for repeatable poses;
- SAM / inpainting for masks and repair.

## Safety boundary

Adult visual workflows must enforce:

1. subject is explicitly adult;
2. ambiguous/young-looking age is rejected or rerouted to non-nude output;
3. no sexualized depiction of minors;
4. no non-consensual sexualized deepfake workflow for real people;
5. identity reference and consent/provenance should be recorded for real-person workflows;
6. family/child personas are isolated from adult-content presets;
7. prompt templates for adult mode are stored separately from general-purpose prompt templates.

## Architecture

```text
Scene / Persona request
        ↓
Capability classifier
        ↓
Policy gate
        ├── general
        ├── fashion
        ├── swimwear
        ├── anatomy reference
        └── adult artistic nude
                ↓
Prompt profile
                ↓
Image Router
                ↓
SDXL checkpoint + optional controls
```

## Product rule

Do not download a dedicated adult/nude model unless the installed SDXL stack fails a measured requirement.

First benchmark the existing checkpoints for:

- anatomy correctness;
- skin realism;
- full-body consistency;
- pose adherence;
- identity consistency;
- artifact rate;
- inpainting quality.

Only then consider adding a specialist checkpoint or LoRA.
