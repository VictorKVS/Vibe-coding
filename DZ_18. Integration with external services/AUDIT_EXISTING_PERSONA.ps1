$ErrorActionPreference = "Continue"

Write-Host ""
Write-Host "FATHER Existing Persona Pipeline Audit" -ForegroundColor Cyan
Write-Host "======================================"
Write-Host ""

# Do not hard-code the Cyrillic parent directory here.
# Windows PowerShell 5.1 may decode a UTF-8 .ps1 without BOM incorrectly.
# Discover the ASCII-named image root from G:\1 instead.
$baseRoot = "G:\1"
$imageRoots = @()

Get-ChildItem -LiteralPath $baseRoot -Directory -ErrorAction SilentlyContinue |
  ForEach-Object {
    $candidate = Join-Path $_.FullName "1_izobraznie"
    if (Test-Path -LiteralPath $candidate) {
      $imageRoots += (Get-Item -LiteralPath $candidate).FullName
    }
  }

$imageRoots = @($imageRoots | Sort-Object -Unique)

if ($imageRoots.Count -eq 0) {
  Write-Host "[FAIL] Could not discover an existing 1_izobraznie root under G:\1." -ForegroundColor Red
  Write-Host "[INFO] Nothing was modified. Check the actual directory layout." -ForegroundColor Yellow
  exit 2
}

Write-Host "[Discovery]" -ForegroundColor Green
$imageRoots | ForEach-Object { Write-Host ("  image root: " + $_) }

$roots = @()

foreach ($imageRoot in $imageRoots) {
  $candidates = @(
    (Join-Path $imageRoot "MindForge_Studio"),
    (Join-Path $imageRoot "AI\stable-diffusion-webui-OLD"),
    (Join-Path $imageRoot "ComfyUI"),
    (Join-Path $imageRoot "AI\ComfyUI\ComfyUI")
  )

  foreach ($candidate in $candidates) {
    if (Test-Path -LiteralPath $candidate) {
      $roots += (Get-Item -LiteralPath $candidate).FullName
    } else {
      Write-Host ("[MISS] " + $candidate) -ForegroundColor DarkYellow
    }
  }
}

$roots = @($roots | Sort-Object -Unique)

if ($roots.Count -eq 0) {
  Write-Host "[FAIL] Image root was found, but no known persona/runtime roots were found." -ForegroundColor Red
  Write-Host "[INFO] Nothing was modified." -ForegroundColor Yellow
  exit 3
}

Write-Host ""
Write-Host ("[OK] Runtime roots discovered: " + $roots.Count) -ForegroundColor Cyan
$roots | ForEach-Object { Write-Host ("  root: " + $_) }

foreach ($root in $roots) {
  Write-Host ""
  Write-Host ("=== " + $root + " ===") -ForegroundColor Yellow

  $interestingDirs = Get-ChildItem -LiteralPath $root -Directory -ErrorAction SilentlyContinue |
    Where-Object {
      $_.Name -match "workflow|persona|character|reference|input|output|lora|embedding|control|ipadapter|instantid|face|model"
    }

  if ($interestingDirs) {
    Write-Host "[Interesting directories]" -ForegroundColor Green
    $interestingDirs |
      Select-Object Name, FullName |
      Format-Table -AutoSize
  }

  Write-Host "[Likely workflow/config files]" -ForegroundColor Green
  Get-ChildItem -LiteralPath $root -Recurse -File -Include "*.json","*.yaml","*.yml" -ErrorAction SilentlyContinue |
    Where-Object {
      $_.FullName -match "workflow|persona|character|prompt|config|preset|registry|scene|face|instant|adapter"
    } |
    Sort-Object LastWriteTime -Descending |
    Select-Object -First 50 LastWriteTime, Length, FullName |
    Format-Table -AutoSize

  Write-Host "[Likely identity/model assets]" -ForegroundColor Green
  Get-ChildItem -LiteralPath $root -Recurse -File -Include "*.safetensors","*.pt","*.pth","*.bin","*.ckpt" -ErrorAction SilentlyContinue |
    Where-Object {
      $_.FullName -match "lora|ip.?adapter|instant.?id|face.?id|reactor|headshot|identity|character|control|pose|clip.?vision"
    } |
    Sort-Object LastWriteTime -Descending |
    Select-Object -First 60 LastWriteTime, Length, FullName |
    Format-Table -AutoSize

  Write-Host "[Likely persona/reference images]" -ForegroundColor Green
  Get-ChildItem -LiteralPath $root -Recurse -File -Include "*.png","*.jpg","*.jpeg","*.webp" -ErrorAction SilentlyContinue |
    Where-Object {
      $_.FullName -match "persona|character|reference|face|identity|input|portrait|headshot"
    } |
    Sort-Object LastWriteTime -Descending |
    Select-Object -First 40 LastWriteTime, Length, FullName |
    Format-Table -AutoSize
}

Write-Host ""
Write-Host "[done] Read-only audit complete. Do not modify or delete anything yet." -ForegroundColor Cyan
