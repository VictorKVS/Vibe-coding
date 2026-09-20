$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "FATHER llama.cpp installer" -ForegroundColor Cyan
Write-Host "=========================="
Write-Host ""

$existing = Get-Command llama-cli -CommandType Application -ErrorAction SilentlyContinue
if ($existing) {
  Write-Host ("llama.cpp already installed: " + $existing.Source) -ForegroundColor Green
  llama-cli --version
  Write-Host ""
  llama-cli --list-devices 2>&1
  exit 0
}

if (-not (Get-Command winget -ErrorAction SilentlyContinue)) {
  throw "winget is not available."
}

Write-Host "[install] Official llama.cpp package via winget..." -ForegroundColor Yellow
winget install --id ggml.llamacpp -e --accept-package-agreements --accept-source-agreements

Write-Host ""
Write-Host "Refreshing PATH for current PowerShell..." -ForegroundColor Yellow

$machinePath = [Environment]::GetEnvironmentVariable("Path", "Machine")
$userPath = [Environment]::GetEnvironmentVariable("Path", "User")
$env:Path = "$machinePath;$userPath"

$cli = Get-Command llama-cli -CommandType Application -ErrorAction SilentlyContinue

if (-not $cli) {
  Write-Host "llama.cpp installed, but llama-cli is not visible in this shell yet." -ForegroundColor Yellow
  Write-Host "Close PowerShell, open it again, then run:"
  Write-Host "  llama-cli --version"
  Write-Host "  llama-cli --list-devices"
  exit 0
}

Write-Host ("Installed: " + $cli.Source) -ForegroundColor Green
llama-cli --version

Write-Host ""
Write-Host "[devices]" -ForegroundColor Yellow
llama-cli --list-devices 2>&1

Write-Host ""
Write-Host "[done]" -ForegroundColor Cyan
