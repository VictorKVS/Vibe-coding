param(
  [ValidateSet("starter","standard","heavy")]
  [string]$Tier = "standard",

  [string]$ModelRoot = "$PSScriptRoot\models\image"
)

$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "FATHER Image Model Zoo downloader" -ForegroundColor Cyan
Write-Host "Tier: $Tier"
Write-Host "Target: $ModelRoot"
Write-Host ""

if (-not (Get-Command hf -ErrorAction SilentlyContinue)) {
    Write-Host "[setup] Installing Hugging Face hf CLI..." -ForegroundColor Yellow
    powershell -ExecutionPolicy ByPass -Command "irm https://hf.co/cli/install.ps1 | iex"
}

if (-not (Get-Command hf -ErrorAction SilentlyContinue)) {
    throw "Hugging Face hf CLI was not found. Reopen PowerShell and run again."
}

New-Item -ItemType Directory -Force -Path $ModelRoot | Out-Null

$models = @(
  @{
    tier="starter";
    repo="black-forest-labs/FLUX.1-schnell";
    folder="flux1-schnell"
  },
  @{
    tier="starter";
    repo="stabilityai/stable-diffusion-xl-base-1.0";
    folder="sdxl-base-1.0"
  },
  @{
    tier="standard";
    repo="h94/IP-Adapter";
    folder="ip-adapter"
  },
  @{
    tier="heavy";
    repo="Qwen/Qwen-Image-2512";
    folder="qwen-image-2512"
  },
  @{
    tier="heavy";
    repo="Qwen/Qwen-Image-Edit-2511";
    folder="qwen-image-edit-2511"
  },
  @{
    tier="heavy";
    repo="Qwen/Qwen-Image-Layered";
    folder="qwen-image-layered"
  }
)

$rank = @{ starter = 0; standard = 1; heavy = 2 }
$limit = $rank[$Tier]

foreach ($model in $models) {
    if ($rank[$model.tier] -gt $limit) { continue }

    $target = Join-Path $ModelRoot $model.folder
    Write-Host "[download] $($model.repo) -> $target" -ForegroundColor Green

    hf download $model.repo --local-dir $target
}

Write-Host ""
Write-Host "[done] Image Model Zoo tier '$Tier' downloaded." -ForegroundColor Cyan
Write-Host "Image models root: $ModelRoot"
