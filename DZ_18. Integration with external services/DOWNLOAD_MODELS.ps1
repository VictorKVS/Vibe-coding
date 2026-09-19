param(
  [ValidateSet("lite","standard","heavy")]
  [string]$Tier = "standard",

  [string]$ModelRoot = "$PSScriptRoot\models"
)

$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "FATHER Model Zoo downloader" -ForegroundColor Cyan
Write-Host "Tier: $Tier"
Write-Host "Target: $ModelRoot"
Write-Host ""

if (-not (Get-Command huggingface-cli -ErrorAction SilentlyContinue)) {
    Write-Host "[setup] Installing huggingface_hub CLI..." -ForegroundColor Yellow
    python -m pip install -U "huggingface_hub[cli]"
}

New-Item -ItemType Directory -Force -Path $ModelRoot | Out-Null

$models = @(
  @{
    tier="lite";
    repo="mistralai/Ministral-3-3B-Instruct-2512-GGUF";
    include="*Q4_K_M.gguf";
    folder="ministral-3b-instruct-q4"
  },
  @{
    tier="lite";
    repo="Qwen/Qwen3-Embedding-0.6B";
    include="";
    folder="qwen3-embedding-0.6b"
  },
  @{
    tier="lite";
    repo="Qwen/Qwen3-Reranker-0.6B";
    include="";
    folder="qwen3-reranker-0.6b"
  },
  @{
    tier="standard";
    repo="mistralai/Ministral-3-8B-Instruct-2512-GGUF";
    include="*Q4_K_M.gguf";
    folder="ministral-8b-instruct-q4"
  },
  @{
    tier="standard";
    repo="mistralai/Ministral-3-14B-Reasoning-2512-GGUF";
    include="*Q4_K_M.gguf";
    folder="ministral-14b-reasoning-q4"
  },
  @{
    tier="heavy";
    repo="Qwen/Qwen3-Embedding-4B";
    include="";
    folder="qwen3-embedding-4b"
  },
  @{
    tier="heavy";
    repo="Qwen/Qwen3-Coder-30B-A3B-Instruct";
    include="";
    folder="qwen3-coder-30b-a3b"
  }
)

$rank = @{ lite = 0; standard = 1; heavy = 2 }
$limit = $rank[$Tier]

foreach ($model in $models) {
    if ($rank[$model.tier] -gt $limit) { continue }

    $target = Join-Path $ModelRoot $model.folder
    Write-Host "[download] $($model.repo) -> $target" -ForegroundColor Green

    $args = @(
      "download",
      $model.repo,
      "--local-dir",
      $target
    )

    if ($model.include) {
      $args += @("--include", $model.include)
    }

    huggingface-cli @args
}

Write-Host ""
Write-Host "[done] Model Zoo tier '$Tier' downloaded." -ForegroundColor Cyan
Write-Host "Models root: $ModelRoot"
