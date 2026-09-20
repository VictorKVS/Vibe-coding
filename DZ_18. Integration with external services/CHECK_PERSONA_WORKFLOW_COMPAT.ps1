$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "FATHER Persona Workflow Compatibility Audit" -ForegroundColor Cyan
Write-Host "==========================================="
Write-Host ""

# Discover the image root without hard-coded Cyrillic source text.
$imageRoot = Get-ChildItem -LiteralPath "G:\1" -Directory -ErrorAction SilentlyContinue |
  ForEach-Object {
    $candidate = Join-Path $_.FullName "1_izobraznie"
    if (Test-Path -LiteralPath $candidate) { Get-Item -LiteralPath $candidate }
  } |
  Select-Object -First 1

if ($null -eq $imageRoot) {
  Write-Host "[FAIL] 1_izobraznie root not found under G:\1" -ForegroundColor Red
  exit 2
}

$comfyRoot = Join-Path $imageRoot.FullName "ComfyUI"
$mindForgeRoot = Join-Path $imageRoot.FullName "MindForge_Studio"

if (-not (Test-Path -LiteralPath $comfyRoot)) {
  Write-Host "[FAIL] Active ComfyUI root not found." -ForegroundColor Red
  exit 3
}

$workflows = @(
  (Join-Path $mindForgeRoot "workflows\studio_character_v1.json"),
  (Join-Path $mindForgeRoot "workflows\web_hero_v1.json")
) | Where-Object { Test-Path -LiteralPath $_ }

if ($workflows.Count -eq 0) {
  Write-Host "[FAIL] MindForge target workflows not found." -ForegroundColor Red
  exit 4
}

$modelRoots = @(
  (Join-Path $comfyRoot "models\checkpoints"),
  (Join-Path $comfyRoot "models\ipadapter"),
  (Join-Path $comfyRoot "models\clip_vision"),
  (Join-Path $comfyRoot "models\controlnet"),
  (Join-Path $comfyRoot "models\loras")
) | Where-Object { Test-Path -LiteralPath $_ }

$customNodesRoot = Join-Path $comfyRoot "custom_nodes"

$py = @'
import json
import os
import re
import sys
from pathlib import Path

comfy_root = Path(sys.argv[1])
custom_nodes_root = Path(sys.argv[2])
model_roots = [Path(x) for x in sys.argv[3].split("|") if x]
workflows = [Path(x) for x in sys.argv[4:]]

def collect(obj, strings, class_types):
    if isinstance(obj, dict):
        for k, v in obj.items():
            if k == "class_type" and isinstance(v, str):
                class_types.add(v)
            collect(k, strings, class_types)
            collect(v, strings, class_types)
    elif isinstance(obj, list):
        for v in obj:
            collect(v, strings, class_types)
    elif isinstance(obj, str):
        strings.append(obj)

def find_model_file(name):
    matches = []
    for root in model_roots:
        if not root.exists():
            continue
        for p in root.rglob("*"):
            if p.is_file() and p.name.lower() == name.lower():
                matches.append(p)
    return matches

def installed_component_hints():
    hints = {}
    if not custom_nodes_root.exists():
        return hints
    for d in custom_nodes_root.iterdir():
        if d.is_dir():
            low = d.name.lower()
            for key in ["ipadapter", "instantid", "reactor", "faceanalysis", "controlnet", "controlnet_aux"]:
                if key in low:
                    hints.setdefault(key, []).append(d)
    return hints

hints = installed_component_hints()

for wf in workflows:
    print()
    print(f"=== {wf} ===")
    with wf.open("r", encoding="utf-8-sig") as f:
        data = json.load(f)

    strings = []
    class_types = set()
    collect(data, strings, class_types)

    model_names = sorted({
        s for s in strings
        if re.search(r"\.(safetensors|ckpt|bin|pt|pth)$", s, re.I)
    })

    interesting_nodes = sorted({
        c for c in class_types
        if re.search(r"ipadapter|instantid|face|controlnet|reactor|ksampler|checkpoint|clipvision", c, re.I)
    })

    print("[Referenced nodes]")
    if interesting_nodes:
        for node in interesting_nodes:
            print("  -", node)
    else:
        print("  none")

    print("[Referenced model/assets]")
    for name in model_names:
        matches = find_model_file(Path(name).name)
        if not matches:
            print(f"  [MISSING] {name}")
            alt = None
            lower = Path(name).name.lower()
            if lower.endswith(".bin"):
                stem = Path(name).stem
                for ext in [".safetensors", ".pt", ".pth"]:
                    candidate = stem + ext
                    alt_matches = find_model_file(candidate)
                    if alt_matches:
                        alt = alt_matches
                        break
            if alt:
                for p in alt:
                    size_mb = p.stat().st_size / (1024*1024)
                    state = "ZERO" if p.stat().st_size == 0 else "NONZERO"
                    print(f"    [ALT {state}] {size_mb:.1f} MB  {p}")
        else:
            for p in matches:
                size_mb = p.stat().st_size / (1024*1024)
                state = "ZERO" if p.stat().st_size == 0 else "NONZERO"
                print(f"  [FOUND {state}] {size_mb:.1f} MB  {p}")

    print("[Installed component hints]")
    required = {
        "IPAdapterAdvanced": "ipadapter",
        "InstantIDFaceAnalysis": "instantid",
        "ControlNetApplyAdvanced": "controlnet",
    }
    for node, key in required.items():
        if node in class_types:
            matches = []
            for hint_key, dirs in hints.items():
                if key in hint_key:
                    matches.extend(dirs)
            if matches:
                for p in sorted(set(matches)):
                    print(f"  [FOUND] {node} candidate provider: {p}")
            else:
                print(f"  [MISSING?] {node}: no matching custom-node directory hint found")

print()
print("[NOTE] This is a filesystem compatibility audit. A FOUND component still requires runtime load testing.")
'@

$tempPy = Join-Path $env:TEMP "father_persona_workflow_compat.py"
Set-Content -LiteralPath $tempPy -Value $py -Encoding UTF8

$python = (Get-Command python.exe -ErrorAction SilentlyContinue).Source
if (-not $python) {
  Write-Host "[FAIL] python.exe not found in PATH." -ForegroundColor Red
  exit 5
}

$modelArg = ($modelRoots -join "|")
$args = @($tempPy, $comfyRoot, $customNodesRoot, $modelArg) + $workflows

& $python @args

if ($LASTEXITCODE -ne 0) {
  Write-Host ("[FAIL] Compatibility audit exit code: " + $LASTEXITCODE) -ForegroundColor Red
  exit $LASTEXITCODE
}

Write-Host ""
Write-Host "[done] Compatibility audit complete. No runtime/model files were modified." -ForegroundColor Cyan
