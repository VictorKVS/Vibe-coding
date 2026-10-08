# FATHER Image Model Zoo

## Architecture

```text
Prompt Engineer
      |
      v
Image Prompt Contract
      |
      v
Image Model Router
  ├── Draft Generator
  ├── Production Generator
  ├── Image Editor
  ├── Identity Adapter
  └── Layered Editor
      |
      v
Persona / Scene QC
```

The generator is selected by task. Persona identity is not bound to one image model.

## Starter

### FLUX.1-schnell

Use for:
- quick concepts;
- fast previews;
- prompt experiments;
- draft storyboard frames.

License: Apache-2.0.

### SDXL 1.0

Use as the main ComfyUI ecosystem base:
- LoRA;
- ControlNet;
- IP-Adapter;
- custom checkpoints;
- style packs;
- pose/depth workflows.

License: OpenRAIL++.

## Standard

Adds IP-Adapter for SDXL.

Use for:
- reference-image conditioning;
- keeping F-01/M-01 recognizable across scenes;
- transferring visual style;
- wardrobe and environment variants.

The regular IP-Adapter is the default path. FaceID/InsightFace-based workflows require separate license review before commercial use.

## Heavy

### Qwen-Image-2512

Primary high-quality optional generator:
- final illustrations;
- posters;
- covers;
- complex scenes;
- image text.

### Qwen-Image-Edit-2511

Natural-language editing:
- keep character, change clothes;
- keep character, change location;
- replace props;
- repair individual storyboard frames.

### Qwen-Image-Layered

Design-oriented pipeline:
- separate editable layers;
- character/background/props decomposition;
- comic and banner assembly.

## Recommended FATHER pipeline

```text
ContentBrief
   ↓
SceneSpec
   ↓
Prompt Engineer
   ↓
Image Router
   ├── preview → FLUX.1-schnell
   ├── controlled persona → SDXL + IP-Adapter
   ├── final heavy → Qwen-Image-2512
   ├── correction → Qwen-Image-Edit-2511
   └── editable asset → Qwen-Image-Layered
   ↓
Persona Consistency QC
   ↓
Asset Registry
```

## Download

```powershell
cd "G:\1\Vibe coding\Vibe-coding-router\DZ_18. Integration with external services"

# Basic generators
.\DOWNLOAD_IMAGE_MODELS.ps1 -Tier starter

# Recommended persona toolkit
.\DOWNLOAD_IMAGE_MODELS.ps1 -Tier standard

# Very large Qwen image family
.\DOWNLOAD_IMAGE_MODELS.ps1 -Tier heavy
```

Heavy tier is intentionally separate because the Qwen Image repositories are large.
