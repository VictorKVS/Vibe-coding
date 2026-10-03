# FATHER Image Zoo — Local Inventory

## Decision

Do not download additional image-generation models yet.

The local machine already has enough components to build and benchmark a useful Persona / Scene / Storyboard image pipeline.

## Confirmed categories from the local inventory

### Main SDXL generators

- JuggernautXL v8 Rundiffusion
- RealVisXL V5.0 Lightning
- DreamShaperXL Lightning
- Stable Diffusion XL Base 1.0
- SDXL MSPaint Portrait

### Identity / consistency

- IP-Adapter Plus Face SDXL ViT-H
- CLIP ViT-H encoder is also present

### Editing / control

- Stable Diffusion 1.5 Inpainting Q8 GGUF
- IC-Light SD1.5
- body pose model
- SAM ViT-H / ViT-L

### LoRA / style assets

- Headshot
- Cinematic Lighting
- epiCRealismXL KiSS Enhancer
- FLUX Detailed Skin Portraits

The FLUX portrait LoRA is present, but a FLUX base checkpoint was not confirmed in the supplied inventory. Do not download a FLUX base model until a benchmark or product requirement proves that SDXL cannot cover the needed use case.

## Initial routing

```text
Fast realistic preview
  -> RealVisXL Lightning

Primary realistic final
  -> JuggernautXL v8

Neutral compatibility baseline
  -> SDXL Base 1.0

Portrait specialist
  -> SDXL MSPaint Portrait

Character consistency
  -> SDXL checkpoint + IP-Adapter Plus Face

Pose
  -> SDXL checkpoint + body pose control

Mask / object isolation
  -> SAM

Local repair / replacement
  -> SD1.5 Inpainting

Relighting
  -> IC-Light

Style/detail
  -> optional LoRA
```

## Rule

A new image model is admitted only when the current stack fails a measured requirement such as:

- text rendering inside images;
- materially better identity consistency;
- materially better instruction-based editing;
- materially better generation quality at acceptable latency;
- a required style not reproducible with current checkpoints/LoRA.

Until such a gap is measured, downloading FLUX/Qwen Image or additional SDXL checkpoints is unnecessary duplication.
