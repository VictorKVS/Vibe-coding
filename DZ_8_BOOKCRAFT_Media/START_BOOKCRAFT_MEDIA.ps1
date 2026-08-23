$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location -LiteralPath $ProjectRoot

Write-Host ""
Write-Host "BOOK.CRAFT MEDIA - DZ-8" -ForegroundColor Yellow
Write-Host "AI ART / VOICE / LOCAL MODELS" -ForegroundColor DarkCyan
Write-Host ""

$Python = Join-Path $ProjectRoot ".venv\Scripts\python.exe"
if (-not (Test-Path -LiteralPath $Python)) {
    Write-Host "[1/4] Creating Python environment..." -ForegroundColor Cyan
    py -m venv (Join-Path $ProjectRoot ".venv")
}

Write-Host "[2/4] Checking Media Gateway dependencies..." -ForegroundColor Cyan
& $Python -m pip install -q -r (Join-Path $ProjectRoot "backend\requirements.txt")
if ($LASTEXITCODE -ne 0) {
    throw "Backend dependency installation failed."
}

$HealthUrl = "http://127.0.0.1:8018/api/health"
$BackendReady = $false
try {
    $null = Invoke-RestMethod -Uri $HealthUrl -TimeoutSec 2
    $BackendReady = $true
} catch {
    $BackendReady = $false
}

if (-not $BackendReady) {
    Write-Host "[3/4] Starting local Media Gateway on port 8018..." -ForegroundColor Cyan
    $BackendCommand = @"
Set-Location -LiteralPath '$ProjectRoot'
& '$Python' -m uvicorn backend.app:app --host 127.0.0.1 --port 8018
"@
    Start-Process PowerShell.exe -ArgumentList @(
        "-NoExit",
        "-NoProfile",
        "-ExecutionPolicy", "Bypass",
        "-Command", $BackendCommand
    ) | Out-Null

    foreach ($Attempt in 1..30) {
        Start-Sleep -Milliseconds 500
        try {
            $null = Invoke-RestMethod -Uri $HealthUrl -TimeoutSec 2
            $BackendReady = $true
            break
        } catch {
            $BackendReady = $false
        }
    }
}

if (-not $BackendReady) {
    throw "Media Gateway did not start on http://127.0.0.1:8018."
}
Write-Host "  [OK] Media Gateway is responding" -ForegroundColor Green

Write-Host "[4/4] Starting local model and BOOK.CRAFT UI..." -ForegroundColor Cyan
$BaseLauncher = Join-Path $ProjectRoot "scripts\start-book-studio.ps1"
if (-not (Test-Path -LiteralPath $BaseLauncher)) {
    throw "Base launcher not found: $BaseLauncher"
}

& PowerShell.exe -NoProfile -ExecutionPolicy Bypass -File $BaseLauncher
