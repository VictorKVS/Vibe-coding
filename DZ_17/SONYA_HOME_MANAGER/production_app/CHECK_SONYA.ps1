$ErrorActionPreference = 'Stop'

Write-Host '=== SONYA Local Diagnostics ===' -ForegroundColor Cyan

Write-Host "`n[Node]" -ForegroundColor Yellow
node --version
npm --version

Write-Host "`n[Ollama]" -ForegroundColor Yellow
ollama --version
$tags = Invoke-RestMethod http://127.0.0.1:11434/api/tags
$tags.models | Select-Object name, size | Format-Table -AutoSize

Write-Host "`n[Expected model]" -ForegroundColor Yellow
$model = if ($env:SONYA_VISION_MODEL) { $env:SONYA_VISION_MODEL } else { 'llava:7b' }
Write-Host $model
$modelExists = $tags.models | Where-Object { $_.name -eq $model }
if ($modelExists) {
    Write-Host '[OK] Expected model is installed.' -ForegroundColor Green
} else {
    Write-Host '[ERROR] Expected model is not installed.' -ForegroundColor Red
}

Write-Host "`n[Ports]" -ForegroundColor Yellow
foreach ($port in @(8787, 5173)) {
    $listeners = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
    if (-not $listeners) {
        Write-Host "Port ${port}: free" -ForegroundColor DarkGray
        continue
    }
    foreach ($listener in $listeners) {
        $pidValue = $listener.OwningProcess
        $proc = Get-CimInstance Win32_Process -Filter "ProcessId=$pidValue" -ErrorAction SilentlyContinue
        Write-Host "Port ${port}: PID $pidValue $($proc.Name)" -ForegroundColor Cyan
        if ($proc.CommandLine) { Write-Host "  $($proc.CommandLine)" -ForegroundColor DarkGray }
    }
}

Write-Host "`n[Local API]" -ForegroundColor Yellow
try {
    $health = Invoke-RestMethod http://127.0.0.1:8787/api/_healthcheck
    $health | ConvertTo-Json -Depth 5
    if ($health.model -eq $model) {
        Write-Host '[OK] Local API is using the expected model.' -ForegroundColor Green
    } else {
        Write-Host "[WARN] Local API reports model '$($health.model)', expected '$model'." -ForegroundColor Yellow
        Write-Host 'Run STOP_SONYA.ps1 and START_SONYA.cmd to replace the stale API process.' -ForegroundColor Yellow
    }
} catch {
    Write-Host 'Local API is not running yet.' -ForegroundColor DarkYellow
}

Write-Host "`nDiagnostics complete." -ForegroundColor Green
