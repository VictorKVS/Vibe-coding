param(
  [ValidateSet("3b","8b","14b")]
  [string]$Model = "3b",
  [string]$Prompt = "",
  [string]$PromptFile = "",
  [int]$Context = 4096,
  [int]$Predict = 0,
  [int]$GpuLayers = 999
)

$ErrorActionPreference = "Stop"

# Force UTF-8 end-to-end for Russian prompts and llama.cpp console output.
[Console]::InputEncoding = [System.Text.UTF8Encoding]::new($false)
[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new($false)
$OutputEncoding = [System.Text.UTF8Encoding]::new($false)
try { chcp 65001 | Out-Null } catch {}

function Find-LlamaCli {
  $cmd = Get-Command llama-cli -CommandType Application -ErrorAction SilentlyContinue
  if ($cmd) { return $cmd.Source }

  $roots = @(
    "$env:LOCALAPPDATA\Microsoft\WinGet\Links",
    "$env:LOCALAPPDATA\Microsoft\WinGet\Packages"
  )

  foreach ($root in $roots) {
    if (-not (Test-Path $root)) { continue }
    $file = Get-ChildItem $root -Recurse -File -Filter "llama-cli.exe" -ErrorAction SilentlyContinue | Select-Object -First 1
    if ($file) { return $file.FullName }
  }

  throw "llama-cli.exe not found. Run INSTALL_LLAMA_CPP.ps1 first."
}

$models = @{
  "3b" = @{ name = "Ministral 3 3B Instruct Q4_K_M"; folder = "ministral-3b-instruct-q4"; predict = 160 }
  "8b" = @{ name = "Ministral 3 8B Instruct Q4_K_M"; folder = "ministral-8b-instruct-q4"; predict = 256 }
  "14b" = @{ name = "Ministral 3 14B Reasoning Q4_K_M"; folder = "ministral-14b-reasoning-q4"; predict = 512 }
}

$spec = $models[$Model]

if ($Predict -le 0) {
  $Predict = $spec.predict
}

if ($PromptFile) {
  if (-not (Test-Path $PromptFile)) {
    throw "Prompt file not found: $PromptFile"
  }
  $Prompt = Get-Content -Raw -Encoding UTF8 $PromptFile
}
elseif (-not $Prompt) {
  $defaultPromptFile = Join-Path $PSScriptRoot "benchmarks\prompts\smoke_ru.txt"
  if (-not (Test-Path $defaultPromptFile)) {
    throw "Default prompt file not found: $defaultPromptFile"
  }
  $Prompt = Get-Content -Raw -Encoding UTF8 $defaultPromptFile
}
$modelDir = Join-Path $PSScriptRoot ("models\" + $spec.folder)
$gguf = Get-ChildItem $modelDir -File -Filter "*.gguf" -ErrorAction SilentlyContinue | Sort-Object Length -Descending | Select-Object -First 1

if (-not $gguf) { throw "GGUF not found in $modelDir" }

$llama = Find-LlamaCli

Write-Host ""
Write-Host "FATHER Local Model Smoke Run" -ForegroundColor Cyan
Write-Host "============================"
Write-Host ("Model:      " + $spec.name)
Write-Host ("GGUF:       " + $gguf.FullName)
Write-Host ("Context:    " + $Context)
Write-Host ("Predict:    " + $Predict)
Write-Host ("GPU layers: " + $GpuLayers)
Write-Host ""

Write-Host "[GPU before]" -ForegroundColor Yellow
if (Get-Command nvidia-smi -ErrorAction SilentlyContinue) {
  nvidia-smi --query-gpu=name,memory.used,memory.free,utilization.gpu --format=csv,noheader
}

Write-Host ""
Write-Host "[inference]" -ForegroundColor Yellow

$args = @("-m", $gguf.FullName, "-ngl", "$GpuLayers", "-c", "$Context", "-n", "$Predict", "--temp", "0.2", "--single-turn", "--show-timings", "-p", $Prompt)
& $llama @args
$exitCode = $LASTEXITCODE

Write-Host ""
Write-Host "[GPU after]" -ForegroundColor Yellow
if (Get-Command nvidia-smi -ErrorAction SilentlyContinue) {
  nvidia-smi --query-gpu=name,memory.used,memory.free,utilization.gpu --format=csv,noheader
}

Write-Host ""
if ($exitCode -eq 0) {
  Write-Host "[PASS] Local inference completed." -ForegroundColor Green
} else {
  Write-Host ("[FAIL] llama-cli exit code: " + $exitCode) -ForegroundColor Red
  exit $exitCode
}
