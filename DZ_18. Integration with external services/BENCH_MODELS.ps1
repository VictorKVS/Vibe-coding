param(
  [int]$Context = 4096,
  [int]$Predict = 128,
  [int]$GpuLayers = 999
)

$ErrorActionPreference = "Stop"
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$outDir = Join-Path $PSScriptRoot ("benchmarks\" + $timestamp)
New-Item -ItemType Directory -Force -Path $outDir | Out-Null

$cases = @(
  @{ model = "3b"; prompt = "Классифицируй запрос одним словом: Пользователь просит кратко переписать текст. Категория:" },
  @{ model = "8b"; prompt = "На русском языке предложи три варианта развития персонажа, который впервые оказался в незнакомом городе. Кратко и без лишней воды." },
  @{ model = "14b"; prompt = "Ты Prompt Engineer. Найди три риска в системном промпте: Отвечай уверенно, даже если данных недостаточно. Затем предложи безопасную улучшенную формулировку." }
)

$summary = @()

foreach ($case in $cases) {
  $log = Join-Path $outDir ($case.model + ".log")
  Write-Host ""
  Write-Host ("=== Benchmark " + $case.model + " ===") -ForegroundColor Cyan
  $start = Get-Date

  $runner = Join-Path $PSScriptRoot "RUN_MODEL_SMOKE.ps1"
  & $runner -Model $case.model -Prompt $case.prompt -Context $Context -Predict $Predict -GpuLayers $GpuLayers *>&1 | Tee-Object -FilePath $log

  $elapsed = ((Get-Date) - $start).TotalSeconds
  $summary += [PSCustomObject]@{ Model = $case.model; Seconds = [math]::Round($elapsed, 2); Log = $log }
}

$csv = Join-Path $outDir "summary.csv"
$summary | Export-Csv $csv -NoTypeInformation -Encoding UTF8

Write-Host ""
Write-Host "Benchmark batch complete." -ForegroundColor Green
$summary | Format-Table -AutoSize
Write-Host ("Logs: " + $outDir)
