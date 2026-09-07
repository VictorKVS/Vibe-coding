$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$RuntimeRoot = Join-Path $ProjectRoot ".runtime"
$OwnedFile = Join-Path $RuntimeRoot "owned-processes.json"

function Stop-OwnedProcess([int]$ProcessId, [string]$Name) {
    $process = Get-Process -Id $ProcessId -ErrorAction SilentlyContinue
    if (-not $process) { return $true }

    $commandLine = (Get-CimInstance Win32_Process -Filter "ProcessId = $ProcessId" -ErrorAction SilentlyContinue).CommandLine
    $owned = $commandLine -and $commandLine.Contains($ProjectRoot)
    if ($owned) {
        Stop-Process -Id $ProcessId -Force -ErrorAction SilentlyContinue
        Write-Host "STOPPED $Name (PID $ProcessId)" -ForegroundColor Green
        return $true
    }

    Write-Host "SKIPPED ${Name}: PID $ProcessId no longer belongs to BOOK.CRAFT." -ForegroundColor Yellow
    return $false
}

if (-not (Test-Path -LiteralPath $RuntimeRoot)) {
    Write-Host "BOOK.CRAFT has no recorded local processes." -ForegroundColor Yellow
    exit 0
}

# Current launcher format.
if (Test-Path -LiteralPath $OwnedFile) {
    try {
        $records = Get-Content -LiteralPath $OwnedFile -Raw | ConvertFrom-Json
        foreach ($record in @($records)) {
            if ($null -eq $record.pid) { continue }
            [void](Stop-OwnedProcess -ProcessId ([int]$record.pid) -Name ([string]$record.name))
        }
    } catch {
        Write-Host "WARNING  Could not parse owned-processes.json: $($_.Exception.Message)" -ForegroundColor Yellow
    }
    Remove-Item -LiteralPath $OwnedFile -Force -ErrorAction SilentlyContinue
}

# Legacy pid files, retained for old local runs.
foreach ($name in @("ui", "gateway", "llm")) {
    $pidFile = Join-Path $RuntimeRoot "$name.pid"
    if (-not (Test-Path -LiteralPath $pidFile)) { continue }
    try {
        $recordedPid = [int](Get-Content -LiteralPath $pidFile -Raw)
        [void](Stop-OwnedProcess -ProcessId $recordedPid -Name $name)
    } catch {}
    Remove-Item -LiteralPath $pidFile -Force -ErrorAction SilentlyContinue
}

Write-Host "LM Studio itself was not stopped; BOOK.CRAFT never terminates external applications." -ForegroundColor DarkGray
