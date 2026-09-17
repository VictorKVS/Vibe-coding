param(
    [switch]$Quiet
)

$ErrorActionPreference = 'SilentlyContinue'
$ports = @(8787, 5173)
$stopped = @()

foreach ($port in $ports) {
    $listeners = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
    foreach ($listener in $listeners) {
        $pidValue = $listener.OwningProcess
        if (-not $pidValue) { continue }

        $process = Get-CimInstance Win32_Process -Filter "ProcessId=$pidValue" -ErrorAction SilentlyContinue
        if (-not $process) { continue }

        $name = [string]$process.Name
        $commandLine = [string]$process.CommandLine

        if ($name -ieq 'node.exe') {
            if (-not $Quiet) {
                Write-Host "Stopping stale SONYA Node process PID $pidValue on port $port" -ForegroundColor Yellow
                if ($commandLine) { Write-Host "  $commandLine" -ForegroundColor DarkGray }
            }
            Stop-Process -Id $pidValue -Force -ErrorAction SilentlyContinue
            $stopped += $pidValue
        } elseif (-not $Quiet) {
            Write-Host "Port $port is occupied by non-Node process PID $pidValue ($name). It was NOT stopped." -ForegroundColor Red
        }
    }
}

Start-Sleep -Milliseconds 500

if (-not $Quiet) {
    if ($stopped.Count -gt 0) {
        Write-Host "Stopped $($stopped.Count) stale Node process(es)." -ForegroundColor Green
    } else {
        Write-Host 'No stale SONYA Node listeners found on ports 8787/5173.' -ForegroundColor Green
    }
}
