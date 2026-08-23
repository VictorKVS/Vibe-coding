$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$RuntimeRoot = Join-Path $ProjectRoot ".runtime"

if (-not (Test-Path -LiteralPath $RuntimeRoot)) {
    Write-Host "BOOK.CRAFT has no recorded local processes." -ForegroundColor Yellow
    exit 0
}

foreach ($name in @("ui", "gateway", "llm")) {
    $pidFile = Join-Path $RuntimeRoot "$name.pid"
    if (-not (Test-Path -LiteralPath $pidFile)) { continue }
    $recordedPid = [int](Get-Content -LiteralPath $pidFile -Raw)
    $process = Get-Process -Id $recordedPid -ErrorAction SilentlyContinue
    if (-not $process) {
        Remove-Item -LiteralPath $pidFile -Force
        continue
    }
    $commandLine = (Get-CimInstance Win32_Process -Filter "ProcessId = $recordedPid" -ErrorAction SilentlyContinue).CommandLine
    $owned = $commandLine -and ($commandLine.Contains($ProjectRoot) -or $commandLine -match "llama-server.*--port.?1234")
    if ($owned) {
        Stop-Process -Id $recordedPid -Force
        Write-Host "STOPPED $name (PID $recordedPid)" -ForegroundColor Green
        Remove-Item -LiteralPath $pidFile -Force
    } else {
        Write-Host "SKIPPED $name: PID $recordedPid no longer belongs to BOOK.CRAFT." -ForegroundColor Yellow
    }
}

Write-Host "LM Studio itself was not stopped; BOOK.CRAFT never terminates external applications." -ForegroundColor DarkGray
