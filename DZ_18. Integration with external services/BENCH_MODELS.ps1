param(
  [int]$Context = 4096,
  [int]$Predict = 0,
  [int]$GpuLayers = 999
)

$ErrorActionPreference = "Stop"
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$outDir = Join-Path $PSScriptRoot ("benchmarks\" + $timestamp)
New-Item -ItemType Directory -Force -Path $outDir | Out-Null

$cases = @(
  @{ model = "3b"; promptFile = "router_ru.txt"; predict = 160 },
  @{ model = "8b"; promptFile = "creative_ru.txt"; predict = 256 },
  @{ model = "14b"; promptFile = "prompt_engineer_ru.txt"; predict = 512 }
)

$summary = @()

foreach ($case in $cases) {
  $log = Join-Path $outDir ($case.model + ".log")
  Write-Host ""
  Write-Host ("=== Benchmark " + $case.model + " ===") -ForegroundColor Cyan
  $start = Get-Date

  $runner = Join-Path $PSScriptRoot "RUN_MODEL_SMOKE.ps1"
  $promptPath = Join-Path $PSScriptRoot ("benchmarks\prompts\" + $case.promptFile)
  $tokenBudget = if ($Predict -gt 0) { $Predict } else { $case.predict }

  & $runner -Model $case.model -PromptFile $promptPath -Context $Context -Predict $tokenBudget -GpuLayers $GpuLayers *>&1 | Tee-Object -FilePath $log

  $elapsed = ((Get-Date) - $start).TotalSeconds

  $logText = Get-Content -Raw -Encoding UTF8 $log
  $promptTps = $null
  $generationTps = $null

  if ($logText -match 'Prompt:\s*([0-9.]+)\s*t/s\s*\|\s*Generation:\s*([0-9.]+)\s*t/s') {
    $promptTps = [double]::Parse($Matches[1], [Globalization.CultureInfo]::InvariantCulture)
    $generationTps = [double]::Parse($Matches[2], [Globalization.CultureInfo]::InvariantCulture)
  }

  $summary += [PSCustomObject]@{
    Model = $case.model
    Predict = $tokenBudget
    Seconds = [math]::Round($elapsed, 2)
    PromptTps = $promptTps
    GenerationTps = $generationTps
    Log = $log
  }
}

$csv = Join-Path $outDir "summary.csv"
$summary | Export-Csv $csv -NoTypeInformation -Encoding UTF8

Write-Host ""
Write-Host "Benchmark batch complete." -ForegroundColor Green
$summary | Format-Table -AutoSize
Write-Host ("Logs: " + $outDir)
