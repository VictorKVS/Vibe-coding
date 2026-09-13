param(
  [ValidateSet('qwen','gemma','all')]
  [string]$Models = 'all',
  [switch]$SkipRuntime
)

$ErrorActionPreference = 'Stop'
$AppDir = Split-Path -Parent $PSScriptRoot
$ModelsDir = Join-Path $AppDir 'models'
New-Item -ItemType Directory -Force -Path $ModelsDir | Out-Null

Write-Host "[ALINA] Local model zoo setup" -ForegroundColor Cyan
Write-Host "[ALINA] app:    $AppDir"
Write-Host "[ALINA] models: $ModelsDir"

if (-not $SkipRuntime) {
  $server = Get-Command llama-server.exe -ErrorAction SilentlyContinue
  if (-not $server) {
    Write-Host "[ALINA] llama.cpp not found in PATH; installing with WinGet..." -ForegroundColor Yellow
    winget install llama.cpp --accept-package-agreements --accept-source-agreements
    Write-Host "[ALINA] WinGet install finished. If llama-server.exe is still not visible, open a new PowerShell after this script." -ForegroundColor Yellow
  } else {
    Write-Host "[ALINA] llama.cpp: $($server.Source)" -ForegroundColor Green
  }
}

function Download-Gguf([string]$Url,[string]$Name,[string]$Label) {
  $target = Join-Path $ModelsDir $Name
  if (Test-Path $target) {
    Write-Host "[ALINA] already present: $Name" -ForegroundColor Green
    return
  }
  Write-Host "[ALINA] downloading $Label -> $Name" -ForegroundColor Cyan
  Write-Host "[ALINA] URL: $Url"
  & curl.exe -L --fail --retry 5 --retry-delay 3 -C - -o $target $Url
  if ($LASTEXITCODE -ne 0) { throw "Download failed for $Label (curl exit $LASTEXITCODE)" }
  Write-Host "[ALINA] ready: $target" -ForegroundColor Green
}

if ($Models -eq 'qwen' -or $Models -eq 'all') {
  # Official Qwen GGUF, Apache-2.0. Q4_K_M is about 2.5 GB.
  Download-Gguf `
    'https://huggingface.co/Qwen/Qwen3-4B-GGUF/resolve/main/Qwen3-4B-Q4_K_M.gguf?download=true' `
    'Qwen3-4B-Q4_K_M.gguf' `
    'Qwen3-4B Q4_K_M'
}

if ($Models -eq 'gemma' -or $Models -eq 'all') {
  # ggml-org conversion of Gemma 3 4B IT, Gemma license. Q4_K_M is about 2.49 GB.
  Download-Gguf `
    'https://huggingface.co/ggml-org/gemma-3-4b-it-GGUF/resolve/main/gemma-3-4b-it-Q4_K_M.gguf?download=true' `
    'gemma-3-4b-it-Q4_K_M.gguf' `
    'Gemma 3 4B IT Q4_K_M'
}

Write-Host ""
Write-Host "[ALINA] Local GGUF inventory:" -ForegroundColor Cyan
Get-ChildItem $ModelsDir -Filter '*.gguf' | Select-Object Name,@{n='SizeGB';e={[math]::Round($_.Length/1GB,2)}} | Format-Table -AutoSize

Write-Host "[ALINA] Recommended .env.local local section:" -ForegroundColor Cyan
Write-Host 'LLAMA_AUTOSTART=1'
Write-Host 'LLAMA_SERVER_BIN=llama-server.exe'
Write-Host 'LLAMA_MODELS_DIR=models'
Write-Host 'LLAMA_HOST=127.0.0.1'
Write-Host 'LLAMA_PORT=8081'
Write-Host 'LLAMA_BASE_URL=http://127.0.0.1:8081'
Write-Host 'LLAMA_CTX_SIZE=8192'
Write-Host 'LLAMA_PARALLEL=1'
Write-Host 'LLAMA_GPU_LAYERS=99'
Write-Host ""
Write-Host "[ALINA] Restart with: npm run dev:models" -ForegroundColor Green
