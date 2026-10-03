$ErrorActionPreference = "Stop"

$Root = Split-Path -Parent $MyInvocation.MyCommand.Path

$env:PYTHONPATH = Join-Path $Root "src"

Write-Host ""
Write-Host "FATHER Runtime Status" -ForegroundColor Cyan
Write-Host ""

python -m father.runtime.core.health
