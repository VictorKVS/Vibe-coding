# FATHER Reuse-First Plan

## Principle

Do not download or rebuild what already exists.

Before adding any model, adapter, workflow or runtime:

1. inspect existing MindForge / AUTOMATIC1111 / ComfyUI assets;
2. identify the working persona pipeline;
3. reuse working checkpoints, LoRA, ControlNet, IP-Adapter, prompts and reference images;
4. migrate only the proven parts into FATHER;
5. add a new component only for a measured missing capability.

## Priority

### P0 — recover existing persona workflow

Target capability:

```text
one persona
  -> same identity
  -> multiple expressions
  -> multiple poses
  -> multiple outfits
  -> multiple scenes
```

### P1 — wrap it in FATHER

```text
Persona Registry
  -> Prompt profile
  -> Image workflow
  -> QC
  -> Asset Registry
```

### P2 — product templates

- Persona Passport
- Emotion Sheet
- Sticker Pack
- Comic Promo Poster

## No-download rule

Do not download FLUX, Qwen Image, new SDXL checkpoints or another identity adapter until the recovered stack is benchmarked.

## Existing roots to inspect

- G:\1\Прежде\1_izobraznie\MindForge_Studio
- G:\1\Прежде\1_izobraznie\AI\stable-diffusion-webui-OLD
- G:\1\Прежде\1_izobraznie\ComfyUI
- G:\1\Прежде\1_izobraznie\AI\ComfyUI\ComfyUI

## Success criterion

Reuse an existing persona/reference and reproduce at least four consistent outputs before building anything new.
