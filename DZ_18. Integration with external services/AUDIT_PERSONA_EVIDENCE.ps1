$ErrorActionPreference = "Continue"

Write-Host ""
Write-Host "FATHER Persona Evidence Audit" -ForegroundColor Cyan
Write-Host "============================="
Write-Host ""

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
  Write-Host "[FAIL] No 1_izobraznie root discovered under G:\1" -ForegroundColor Red
  exit 2
}

function Write-AssetLine {
  param(
    [System.IO.FileInfo]$File,
    [string]$Kind
  )

  $state = if ($File.Length -eq 0) { "ZERO" } else { "NONZERO" }
  $mb = [math]::Round($File.Length / 1MB, 1)

  Write-Host ("[{0}] [{1}] {2,10} MB  {3}" -f $Kind, $state, $mb, $File.FullName)
}

foreach ($imageRoot in $imageRoots) {
  $roots = @(
    (Join-Path $imageRoot "MindForge_Studio"),
    (Join-Path $imageRoot "AI\stable-diffusion-webui-OLD"),
    (Join-Path $imageRoot "ComfyUI"),
    (Join-Path $imageRoot "AI\ComfyUI\ComfyUI")
  ) | Where-Object { Test-Path -LiteralPath $_ } | Sort-Object -Unique

  foreach ($root in $roots) {
    Write-Host ""
    Write-Host ("=== " + $root + " ===") -ForegroundColor Yellow

    Write-Host "[Identity/runtime components]" -ForegroundColor Green

    $componentRoots = @(
      (Join-Path $root "custom_nodes"),
      (Join-Path $root "extensions")
    ) | Where-Object { Test-Path -LiteralPath $_ }

    $components = foreach ($componentRoot in $componentRoots) {
      Get-ChildItem -LiteralPath $componentRoot -Directory -ErrorAction SilentlyContinue |
        Where-Object {
          $_.Name -match "IPAdapter|ReActor|FaceAnalysis|InstantID|ControlNet|Controlnet|UltimateSDUpscale|AnimateDiff|ADetailer|Roop|Face"
        }
    }

    if ($components) {
      $components |
        Sort-Object FullName -Unique |
        ForEach-Object { Write-Host ("[COMPONENT] " + $_.FullName) }
    } else {
      Write-Host "[COMPONENT] none matched"
    }

    Write-Host "[Identity/model assets]" -ForegroundColor Green

    $modelRoots = @(
      (Join-Path $root "models"),
      (Join-Path $root "custom_nodes")
    ) | Where-Object { Test-Path -LiteralPath $_ }

    $modelFiles = foreach ($modelRoot in $modelRoots) {
      Get-ChildItem -LiteralPath $modelRoot -Recurse -File -ErrorAction SilentlyContinue |
        Where-Object {
          $_.Extension -match "^\.(safetensors|bin|pt|pth|ckpt)$" -and
          $_.FullName -match "ip.?adapter|instant.?id|face.?id|reactor|headshot|identity|character|control|pose|clip.?vision|mspaint"
        }
    }

    if ($modelFiles) {
      $modelFiles |
        Sort-Object FullName -Unique |
        ForEach-Object { Write-AssetLine -File $_ -Kind "MODEL" }
    } else {
      Write-Host "[MODEL] none matched"
    }

    Write-Host "[Workflow candidates]" -ForegroundColor Green

    $workflowFiles = Get-ChildItem -LiteralPath $root -Recurse -File -ErrorAction SilentlyContinue |
      Where-Object {
        $_.Extension -in @(".json", ".yaml", ".yml") -and
        (
          $_.FullName -match "\\workflow" -or
          $_.Name -match "workflow|persona|character|scene|prompt|preset"
        )
      } |
      Sort-Object LastWriteTime -Descending |
      Select-Object -First 30

    if ($workflowFiles) {
      foreach ($wf in $workflowFiles) {
        Write-Host ("[WORKFLOW] {0:u}  {1} bytes  {2}" -f $wf.LastWriteTime, $wf.Length, $wf.FullName)
      }
    } else {
      Write-Host "[WORKFLOW] none matched"
    }

    Write-Host "[Recent generated images]" -ForegroundColor Green

    $outputRoots = @(
      (Join-Path $root "output"),
      (Join-Path $root "outputs")
    ) | Where-Object { Test-Path -LiteralPath $_ }

    $outputs = foreach ($outputRoot in $outputRoots) {
      Get-ChildItem -LiteralPath $outputRoot -Recurse -File -ErrorAction SilentlyContinue |
        Where-Object { $_.Extension -in @(".png", ".jpg", ".jpeg", ".webp") }
    }

    if ($outputs) {
      $outputs |
        Sort-Object LastWriteTime -Descending |
        Select-Object -First 20 |
        ForEach-Object {
          Write-Host ("[OUTPUT] {0:u}  {1,8} KB  {2}" -f $_.LastWriteTime, [math]::Round($_.Length / 1KB, 1), $_.FullName)
        }
    } else {
      Write-Host "[OUTPUT] none found"
    }
  }
}

Write-Host ""
Write-Host "[done] Evidence audit complete. Read-only. No files were modified." -ForegroundColor Cyan
