$ErrorActionPreference = 'Stop'

Write-Host '=== SONYA Local Diagnostics ===' -ForegroundColor Cyan

Write-Host "`n[Node]" -ForegroundColor Yellow
node --version
npm --version

Write-Host "`n[Ollama]" -ForegroundColor Yellow
ollama --version
$tags = Invoke-RestMethod http://127.0.0.1:11434/api/tags
$tags.models | Select-Object name, size | Format-Table -AutoSize

$profile = if ($env:SONYA_AGENT_PROFILE) { $env:SONYA_AGENT_PROFILE } else { 'BALANCED' }
$visionModel = if ($env:SONYA_VISION_MODEL) { $env:SONYA_VISION_MODEL } else { 'qwen3-vl:8b-instruct-q4_K_M' }
$reasoningDefault = if ($profile -eq 'DEEP') { 'qwen2.5:7b' } else { 'qwen2.5:3b' }
$reasoningModel = if ($env:SONYA_REASONING_MODEL) { $env:SONYA_REASONING_MODEL } else { $reasoningDefault }

Write-Host "`n[Expected agent stack]" -ForegroundColor Yellow
Write-Host "Profile:  $profile"
Write-Host "Vision:   $visionModel"
Write-Host "Analyst:  $reasoningModel"
Write-Host 'RAG:      food-vision-kb.md v3'
Write-Host 'Image:    <= 1280 px / <= 1.2 MP'

$visionExists = $tags.models | Where-Object { $_.name -eq $visionModel }
$reasoningExists = $tags.models | Where-Object { $_.name -eq $reasoningModel }

if ($visionExists) {
    Write-Host '[OK] Vision model is installed.' -ForegroundColor Green
} else {
    Write-Host "[ERROR] Vision model '$visionModel' is not installed." -ForegroundColor Red
}

if ($reasoningExists) {
    Write-Host '[OK] Analyst model is installed.' -ForegroundColor Green
} else {
    Write-Host "[ERROR] Analyst model '$reasoningModel' is not installed." -ForegroundColor Red
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

    $apiVision = if ($health.visionModel) { $health.visionModel } else { $health.model }
    $apiReasoning = $health.reasoningModel

    if ($apiVision -eq $visionModel) {
        Write-Host '[OK] Local API is using the expected vision model.' -ForegroundColor Green
    } else {
        Write-Host "[WARN] Local API vision model '$apiVision', expected '$visionModel'." -ForegroundColor Yellow
    }

    if ($apiReasoning -eq $reasoningModel) {
        Write-Host '[OK] Local API is using the expected analyst model.' -ForegroundColor Green
    } elseif ($apiReasoning) {
        Write-Host "[WARN] Local API analyst model '$apiReasoning', expected '$reasoningModel'." -ForegroundColor Yellow
    }

    if ($health.ragLoaded) {
        Write-Host "[OK] RAG loaded: $($health.ragChars) chars." -ForegroundColor Green
    } else {
        Write-Host '[WARN] RAG fallback is active.' -ForegroundColor Yellow
    }

    if ($apiVision -ne $visionModel -or ($apiReasoning -and $apiReasoning -ne $reasoningModel)) {
        Write-Host 'Run STOP_SONYA.ps1 and START_SONYA.cmd to replace the stale API process.' -ForegroundColor Yellow
    }
} catch {
    Write-Host 'Local API is not running yet.' -ForegroundColor DarkYellow
}

Write-Host "`nDiagnostics complete." -ForegroundColor Green
