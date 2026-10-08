param(
  [string]$ModelRoot = "$PSScriptRoot\models"
)

$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "FATHER Model Zoo check" -ForegroundColor Cyan
Write-Host "Root: $ModelRoot"
Write-Host ""

$expected = @(
  @{
    name = "Qwen3 Embedding 0.6B"
    folder = "qwen3-embedding-0.6b"
    kind = "RAG embedding"
  },
  @{
    name = "Qwen3 Reranker 0.6B"
    folder = "qwen3-reranker-0.6b"
    kind = "RAG reranker"
  },
  @{
    name = "Ministral 3 8B Instruct Q4"
    folder = "ministral-8b-instruct-q4"
    kind = "General / creative"
  },
  @{
    name = "Ministral 3 14B Reasoning Q4"
    folder = "ministral-14b-reasoning-q4"
    kind = "Reasoning / QA / prompt engineering"
  },
  @{
    name = "Ministral 3 3B Instruct Q4"
    folder = "ministral-3b-instruct-q4"
    kind = "Fast router"
  }
)

$totalBytes = 0
$rows = @()

foreach ($model in $expected) {
  $path = Join-Path $ModelRoot $model.folder

  if (Test-Path $path) {
    $files = Get-ChildItem $path -Recurse -File -ErrorAction SilentlyContinue |
      Where-Object {
        $_.FullName -notmatch "\\.cache\\huggingface\\download"
      }

    $bytes = ($files | Measure-Object Length -Sum).Sum
    if ($null -eq $bytes) { $bytes = 0 }

    $totalBytes += $bytes

    $rows += [PSCustomObject]@{
      Status = "OK"
      Model = $model.name
      Role = $model.kind
      GB = [math]::Round($bytes / 1GB, 2)
      Path = $path
    }
  }
  else {
    $rows += [PSCustomObject]@{
      Status = "MISSING"
      Model = $model.name
      Role = $model.kind
      GB = 0
      Path = $path
    }
  }
}

$rows | Format-Table -AutoSize

Write-Host ""
Write-Host ("Installed size: {0} GB" -f [math]::Round($totalBytes / 1GB, 2)) -ForegroundColor Cyan

$missing = @($rows | Where-Object Status -eq "MISSING")

if ($missing.Count -eq 0) {
  Write-Host "Model Zoo standard pack: COMPLETE" -ForegroundColor Green
  exit 0
}

Write-Host ""
Write-Host "Missing models:" -ForegroundColor Yellow
$missing | ForEach-Object { Write-Host (" - " + $_.Model) }

Write-Host ""
Write-Host "This is not necessarily an error: the 3B router may not have been included in the visible download log." -ForegroundColor Yellow
exit 2
