$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$RuntimeRoot = Join-Path $ProjectRoot ".runtime"
$OwnedFile = Join-Path $RuntimeRoot "owned-processes.json"

function Get-ProcessCommandLine([int]$ProcessId) {
    try {
        return (Get-CimInstance Win32_Process -Filter "ProcessId = $ProcessId" -ErrorAction Stop).CommandLine
    } catch {
        return $null
    }
}

function Test-BookcraftOwnedProcess([int]$ProcessId) {
    $commandLine = Get-ProcessCommandLine $ProcessId
    if (-not $commandLine) { return $false }
    return $commandLine.Contains($ProjectRoot)
}

function Stop-OwnedProcess([int]$ProcessId, [string]$Name) {
    $process = Get-Process -Id $ProcessId -ErrorAction SilentlyContinue
    if (-not $process) { return $true }

    if (Test-BookcraftOwnedProcess $ProcessId) {
        Stop-Process -Id $ProcessId -Force -ErrorAction SilentlyContinue
        Write-Host "STOPPED $Name (PID $ProcessId)" -ForegroundColor Green
        return $true
    }

    Write-Host "SKIPPED ${Name}: PID $ProcessId no longer belongs to BOOK.CRAFT." -ForegroundColor Yellow
    return $false
}

function Stop-OwnedListener([int]$Port, [string]$Name) {
    $listeners = @()
    try {
        $listeners = @(Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue)
    } catch {
        return
    }

    foreach ($listener in $listeners) {
        $pid = [int]$listener.OwningProcess
        if ($pid -le 0) { continue }
        if (Test-BookcraftOwnedProcess $pid) {
            Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
            Write-Host "STOPPED stale $Name listener on :$Port (PID $pid)" -ForegroundColor Green
        } else {
            Write-Host "SKIPPED :$Port listener PID $pid; it does not belong to this BOOK.CRAFT worktree." -ForegroundColor DarkGray
        }
    }
}

if (-not (Test-Path -LiteralPath $RuntimeRoot)) {
    Write-Host "BOOK.CRAFT has no recorded local processes." -ForegroundColor Yellow
} else {
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
}

# Important: npm.cmd can exit while its child node/vite process continues to listen.
# Therefore the process registry alone is not authoritative. Always inspect the
# actual BOOK.CRAFT ports and terminate only listeners whose command line belongs
# to this worktree. This guarantees that a git update cannot leave a stale UI.
Stop-OwnedListener -Port 8018 -Name "backend"
Stop-OwnedListener -Port 5173 -Name "frontend"

Write-Host "LM Studio itself was not stopped; BOOK.CRAFT never terminates external applications." -ForegroundColor DarkGray
