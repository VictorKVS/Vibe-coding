$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "FATHER Persona Smoke Preview Publisher" -ForegroundColor Cyan
Write-Host "====================================="
Write-Host ""

$repoRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$outDir = Join-Path $repoRoot "benchmarks\persona_smoke\preview"
New-Item -ItemType Directory -Force -Path $outDir | Out-Null

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
$reference = Join-Path $comfyRoot "input\reference_face.jpg"
$output = Join-Path $comfyRoot "output\FATHER\persona\identity_smoke_bin_00001_.png"

if (-not (Test-Path -LiteralPath $reference)) {
  Write-Host ("[FAIL] Reference image not found: " + $reference) -ForegroundColor Red
  exit 3
}

if (-not (Test-Path -LiteralPath $output)) {
  Write-Host ("[FAIL] Smoke output not found: " + $output) -ForegroundColor Red
  exit 4
}

$py = @'
import base64
import hashlib
import json
import sys
from pathlib import Path

from PIL import Image, ImageOps, ImageDraw

reference = Path(sys.argv[1])
output = Path(sys.argv[2])
out_dir = Path(sys.argv[3])

def sha256(path):
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()

def fit_square(path, size=512):
    im = Image.open(path).convert("RGB")
    return ImageOps.fit(im, (size, size), method=Image.Resampling.LANCZOS)

ref_im = fit_square(reference)
out_im = fit_square(output)

canvas = Image.new("RGB", (1024, 560), "white")
canvas.paste(ref_im, (0, 48))
canvas.paste(out_im, (512, 48))

draw = ImageDraw.Draw(canvas)
draw.text((16, 14), "REFERENCE", fill="black")
draw.text((528, 14), "IDENTITY SMOKE OUTPUT", fill="black")

preview_jpg = out_dir / "identity_smoke_bin_compare.jpg"
canvas.save(preview_jpg, format="JPEG", quality=88, optimize=True)

preview_b64 = out_dir / "identity_smoke_bin_compare.base64.txt"
preview_b64.write_text(base64.b64encode(preview_jpg.read_bytes()).decode("ascii"), encoding="ascii")

manifest = {
    "reference": {
        "source": str(reference),
        "sha256": sha256(reference),
        "size_bytes": reference.stat().st_size,
        "dimensions": list(Image.open(reference).size),
    },
    "output": {
        "source": str(output),
        "sha256": sha256(output),
        "size_bytes": output.stat().st_size,
        "dimensions": list(Image.open(output).size),
    },
    "preview": {
        "local_file": str(preview_jpg),
        "base64_file": str(preview_b64),
        "size_bytes": preview_jpg.stat().st_size,
        "dimensions": list(canvas.size),
        "format": "JPEG",
        "quality": 88,
    },
}

manifest_path = out_dir / "identity_smoke_bin_compare.manifest.json"
manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")

print("[REFERENCE]", reference)
print("[OUTPUT]", output)
print("[PREVIEW]", preview_jpg)
print("[BASE64]", preview_b64)
print("[MANIFEST]", manifest_path)
'@

$tempPy = Join-Path $env:TEMP "father_persona_smoke_preview.py"
Set-Content -LiteralPath $tempPy -Value $py -Encoding UTF8

$python = (Get-Command python.exe -ErrorAction SilentlyContinue).Source
if (-not $python) {
  Write-Host "[FAIL] python.exe not found in PATH." -ForegroundColor Red
  exit 5
}

& $python $tempPy $reference $output $outDir
if ($LASTEXITCODE -ne 0) {
  Write-Host ("[FAIL] Preview generator exit code: " + $LASTEXITCODE) -ForegroundColor Red
  exit $LASTEXITCODE
}

$base64File = Join-Path $outDir "identity_smoke_bin_compare.base64.txt"
$manifestFile = Join-Path $outDir "identity_smoke_bin_compare.manifest.json"

$publisher = Join-Path $repoRoot "PUBLISH_EVIDENCE.ps1"
if (Test-Path -LiteralPath $publisher) {
  Write-Host ""
  Write-Host "[PUBLISH] Sending visual comparison evidence to GitHub..." -ForegroundColor Yellow
  & $publisher -Paths @($base64File, $manifestFile) -Message "evidence: publish persona smoke visual comparison"
} else {
  Write-Host "[WARN] Evidence publisher not found. Preview remains local only." -ForegroundColor DarkYellow
}

Write-Host ""
Write-Host "[done] Persona smoke preview evidence prepared." -ForegroundColor Cyan
