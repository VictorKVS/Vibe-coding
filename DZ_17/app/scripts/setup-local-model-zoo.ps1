param(
  [ValidateSet('qwen','gemma','all')]
  [string]$Models = 'all',
  [switch]$SkipRuntime,
  [switch]$ForceDownload
)

$ErrorActionPreference = 'Stop'
$AppDir = Split-Path -Parent $PSScriptRoot
$ModelsDir = Join-Path $AppDir 'models'
New-Item -ItemType Directory -Force -Path $ModelsDir | Out-Null

$existingZoo = @(
  $env:FATHER_MODELS_ROOT,
  'F:\FATHER_MODELS',
  'D:\FATHER_MODELS',
  'E:\FATHER_MODELS',
  'G:\FATHER_MODELS'
) | Where-Object { $_ -and (Test-Path $_) } | Select-Object -First 1

if ($existingZoo -and -not $ForceDownload) {
  Write-Host "[ALINA] Existing centralized model zoo detected: $existingZoo" -ForegroundColor Green
  Write-Host "[ALINA] Nothing will be downloaded or copied." -ForegroundColor Green
  Write-Host "[ALINA] Use the existing-zoo registrar instead:" -ForegroundColor Cyan
  Write-Host "  powershell -ExecutionPolicy Bypass -File .\scripts\configure-existing-model-zoo.ps1 -ZooRoot `"$existingZoo`" -WriteEnv"
  Write-Host "[ALINA] Pass -ForceDownload only if you intentionally want extra duplicate weights." -ForegroundColor Yellow
  exit 0
}

Write-Host "[ALINA] Fallback local model downloader" -ForegroundColor Cyan
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
  Download-Gguf `
    'https://huggingface.co/Qwen/Qwen3-4B-GGUF/resolve/main/Qwen3-4B-Q4_K_M.gguf?download=true' `
    'Qwen3-4B-Q4_K_M.gguf' `
    'Qwen3-4B Q4_K_M'
}

if ($Models -eq 'gemma' -or $Models -eq 'all') {
  Download-Gguf `
    'https://huggingface.co/ggml-org/gemma-3-4b-it-GGUF/resolve/main/gemma-3-4b-it-Q4_K_M.gguf?download=true' `
    'gemma-3-4b-it-Q4_K_M.gguf' `
    'Gemma 3 4B IT Q4_K_M'
}

Write-Host ""
Write-Host "[ALINA] Local GGUF inventory:" -ForegroundColor Cyan
Get-ChildItem $ModelsDir -Filter '*.gguf' |
  Select-Object Name,@{n='SizeGB';e={[math]::Round($_.Length/1GB,2)}} |
  Format-Table -AutoSize

Write-Host "[ALINA] Restart with: npm run dev:models" -ForegroundColor Green
