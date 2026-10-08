$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "FATHER Persona Provenance Recovery" -ForegroundColor Cyan
Write-Host "=================================="
Write-Host ""

$repoRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$outDir = Join-Path $repoRoot "benchmarks\persona_provenance"
New-Item -ItemType Directory -Force -Path $outDir | Out-Null

# Avoid hard-coded Cyrillic source text for Windows PowerShell 5.1.
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

$targets = @()

$ageDir = Join-Path $comfyRoot "output\ages"
if (Test-Path -LiteralPath $ageDir) {
  $ageImage = Get-ChildItem -LiteralPath $ageDir -File -Filter "*.png" -ErrorAction SilentlyContinue |
    Sort-Object LastWriteTime -Descending |
    Select-Object -First 1
  if ($ageImage) { $targets += $ageImage.FullName }
}

$emotionDir = Join-Path $comfyRoot "output\emotions"
if (Test-Path -LiteralPath $emotionDir) {
  $emotionImage = Get-ChildItem -LiteralPath $emotionDir -File -Filter "*.png" -ErrorAction SilentlyContinue |
    Sort-Object LastWriteTime -Descending |
    Select-Object -First 1
  if ($emotionImage) { $targets += $emotionImage.FullName }
}

$workflowCandidates = @(
  (Join-Path $comfyRoot "workflow_api.json"),
  (Join-Path $comfyRoot "workflows\simple_generation.json"),
  (Join-Path $mindForgeRoot "workflows\studio_character_v1.json"),
  (Join-Path $mindForgeRoot "workflows\web_hero_v1.json")
) | Where-Object { Test-Path -LiteralPath $_ }

Write-Host ("[INFO] Image root: " + $imageRoot.FullName)
Write-Host ("[INFO] PNG targets: " + $targets.Count)
$targets | ForEach-Object { Write-Host ("  PNG: " + $_) }

Write-Host ("[INFO] Workflow files: " + $workflowCandidates.Count)
$workflowCandidates | ForEach-Object { Write-Host ("  JSON: " + $_) }

$py = @'
import json
import os
import re
import sys
from pathlib import Path

try:
    from PIL import Image
except Exception as e:
    print("[FAIL] Pillow import failed:", repr(e))
    sys.exit(10)

out_dir = Path(sys.argv[1])
items = sys.argv[2:]

def collect_strings(obj, out):
    if isinstance(obj, dict):
        for k, v in obj.items():
            collect_strings(k, out)
            collect_strings(v, out)
    elif isinstance(obj, list):
        for v in obj:
            collect_strings(v, out)
    elif isinstance(obj, str):
        out.append(obj)

def summarize_json(label, data):
    strings = []
    collect_strings(data, strings)
    needles = [
        "IPAdapter", "IP Adapter", "ReActor", "FaceAnalysis", "FaceID",
        "InstantID", "ControlNet", "Lora", "LoRA", "LoadImage",
        "CheckpointLoader", "CLIPVision", "KSampler", "VAE", "seed"
    ]
    hits = sorted({s for s in strings if any(n.lower() in s.lower() for n in needles)})
    models = sorted({
        s for s in strings
        if re.search(r"\.(safetensors|ckpt|bin|pt|pth|gguf)$", s, re.I)
    })
    print(f"[SUMMARY] {label}")
    if models:
        print("  model/assets:")
        for x in models[:40]:
            print("   -", x)
    else:
        print("  model/assets: none found in JSON strings")
    if hits:
        print("  identity/workflow hits:")
        for x in hits[:60]:
            print("   -", x)
    else:
        print("  identity/workflow hits: none")

for raw in items:
    p = Path(raw)
    if not p.exists():
        continue

    safe_name = re.sub(r"[^A-Za-z0-9_.-]+", "_", p.name)

    if p.suffix.lower() == ".png":
        try:
            im = Image.open(p)
            info = dict(im.info)
            serializable = {}
            for k, v in info.items():
                if isinstance(v, bytes):
                    serializable[k] = v.decode("utf-8", errors="replace")
                else:
                    serializable[k] = v

            out_file = out_dir / f"{safe_name}.metadata.json"
            with out_file.open("w", encoding="utf-8") as f:
                json.dump(serializable, f, ensure_ascii=False, indent=2)

            print(f"[PNG] {p}")
            print("  size:", im.size)
            print("  metadata keys:", ", ".join(sorted(serializable.keys())) or "none")
            print("  saved:", out_file)

            for key in ("prompt", "workflow"):
                if key in serializable:
                    try:
                        parsed = json.loads(serializable[key]) if isinstance(serializable[key], str) else serializable[key]
                        summarize_json(f"{p.name}:{key}", parsed)
                    except Exception as e:
                        print(f"  [WARN] cannot parse {key}: {e!r}")
        except Exception as e:
            print(f"[WARN] PNG metadata read failed for {p}: {e!r}")

    elif p.suffix.lower() == ".json":
        try:
            with p.open("r", encoding="utf-8-sig") as f:
                data = json.load(f)
            print(f"[JSON] {p}")
            summarize_json(p.name, data)
        except Exception as e:
            print(f"[WARN] JSON read failed for {p}: {e!r}")
'@

$tempPy = Join-Path $env:TEMP "father_persona_provenance.py"
Set-Content -LiteralPath $tempPy -Value $py -Encoding UTF8

$python = (Get-Command python.exe -ErrorAction SilentlyContinue).Source
if (-not $python) {
  Write-Host "[FAIL] python.exe not found in PATH." -ForegroundColor Red
  exit 4
}

$args = @($tempPy, $outDir) + $targets + $workflowCandidates

Write-Host ""
Write-Host "[RUN] Extracting embedded ComfyUI PNG metadata and workflow evidence..." -ForegroundColor Yellow
& $python @args

if ($LASTEXITCODE -ne 0) {
  Write-Host ("[FAIL] Provenance extractor exit code: " + $LASTEXITCODE) -ForegroundColor Red
  exit $LASTEXITCODE
}

Write-Host ""

$publisher = Join-Path $repoRoot "PUBLISH_EVIDENCE.ps1"
if (Test-Path -LiteralPath $publisher) {
  Write-Host "[PUBLISH] Sending selected provenance evidence to GitHub..." -ForegroundColor Yellow
  & $publisher -Paths @($outDir) -Message "evidence: publish persona provenance"
} else {
  Write-Host "[WARN] Evidence publisher not found. Files remain local only." -ForegroundColor DarkYellow
}

Write-Host ""
Write-Host ("[done] Read-only provenance recovery complete. Evidence saved to: " + $outDir) -ForegroundColor Cyan
