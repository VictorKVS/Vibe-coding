[CmdletBinding()]
param([switch]$Verify)

$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$RuntimeRoot = Join-Path $ProjectRoot ".runtime"
$TraceRoot = Join-Path $RuntimeRoot "traces"
$RunId = [guid]::NewGuid().ToString()
$RunTrace = Join-Path $TraceRoot ("start-{0:yyyyMMdd-HHmmss}.jsonl" -f (Get-Date))
$PidFile = Join-Path $RuntimeRoot "owned-processes.json"
$BackendUrl = "http://127.0.0.1:8018/api/health"
$ReadinessUrl = "http://127.0.0.1:8018/api/readiness"
$LlmModelsUrl = "http://127.0.0.1:1234/v1/models"
$ComfyUrl = "http://127.0.0.1:8188/system_stats"
$AppUrl = "http://127.0.0.1:5173"
$MindForgeUrl = "http://127.0.0.1:8000/health"
$MindForgeRoot = if ($env:MINDFORGE_STUDIO_ROOT) { $env:MINDFORGE_STUDIO_ROOT } else { "G:\1\Прежде\1_izobraznie\MindForge_Studio" }

New-Item -ItemType Directory -Force -Path $TraceRoot | Out-Null
$env:BOOKCRAFT_RUN_ID = $RunId
$env:BOOKCRAFT_TRACE_ROOT = $TraceRoot

function Write-RunTrace([string]$Event, [string]$Status, [string]$Detail = "") {
    [ordered]@{
        timestamp = (Get-Date).ToUniversalTime().ToString("o")
        run_id = $RunId
        component = "launcher"
        event = $Event
        status = $Status
        detail = $Detail
    } | ConvertTo-Json -Compress | Add-Content -LiteralPath $RunTrace -Encoding utf8
}

function Test-Http([string]$Url, [int]$TimeoutSec = 3) {
    try {
        $response = Invoke-WebRequest -UseBasicParsing -Uri $Url -TimeoutSec $TimeoutSec
        return $response.StatusCode -ge 200 -and $response.StatusCode -lt 300
    } catch { return $false }
}

function Wait-Http([string]$Name, [string]$Url, [int]$Seconds = 25) {
    $deadline = (Get-Date).AddSeconds($Seconds)
    do {
        if (Test-Http $Url) {
            Write-Host "READY  $Name  $Url" -ForegroundColor Green
            Write-RunTrace "service.ready" "ready" $Name
            return $true
        }
        Start-Sleep -Milliseconds 500
    } while ((Get-Date) -lt $deadline)
    Write-Host "WAIT   $Name  $Url" -ForegroundColor Yellow
    Write-RunTrace "service.unavailable" "waiting" $Name
    return $false
}

function Resolve-Python([string]$Root) {
    foreach ($environmentName in @(".venv-runtime", ".venv")) {
        $venvPython = Join-Path $Root "$environmentName\Scripts\python.exe"
        if (Test-Path -LiteralPath $venvPython) {
            try {
                & $venvPython -c "import fastapi, uvicorn" *> $null
                if ($LASTEXITCODE -eq 0) { return $venvPython }
            } catch {}
        }
    }
    $python = Get-Command python.exe -ErrorAction SilentlyContinue
    if ($python) { return $python.Source }
    $py = Get-Command py.exe -ErrorAction SilentlyContinue
    if ($py) { return $py.Source }
    throw "Python с FastAPI и Uvicorn не найден. Создайте .venv-runtime и установите backend/requirements.txt."
}

Set-Location -LiteralPath $ProjectRoot
$owned = @()

if (-not (Test-Http $BackendUrl)) {
    $python = Resolve-Python $ProjectRoot
    $backendLog = Join-Path $RuntimeRoot "backend.log"
    $process = Start-Process -FilePath $python -ArgumentList @("-m", "uvicorn", "backend.app:app", "--host", "127.0.0.1", "--port", "8018") -WorkingDirectory $ProjectRoot -RedirectStandardOutput $backendLog -RedirectStandardError (Join-Path $RuntimeRoot "backend.err.log") -WindowStyle Hidden -PassThru
    $owned += [ordered]@{ name = "bookcraft-backend"; pid = $process.Id; started_at = (Get-Date).ToUniversalTime().ToString("o") }
}

if (-not (Test-Http $AppUrl)) {
    $npm = (Get-Command npm.cmd -ErrorAction Stop).Source
    $frontendLog = Join-Path $RuntimeRoot "frontend.log"
    $process = Start-Process -FilePath $npm -ArgumentList @("run", "dev", "--", "--host", "127.0.0.1") -WorkingDirectory $ProjectRoot -RedirectStandardOutput $frontendLog -RedirectStandardError (Join-Path $RuntimeRoot "frontend.err.log") -WindowStyle Hidden -PassThru
    $owned += [ordered]@{ name = "bookcraft-frontend"; pid = $process.Id; started_at = (Get-Date).ToUniversalTime().ToString("o") }
}

if ((Test-Path -LiteralPath $MindForgeRoot) -and -not (Test-Http $MindForgeUrl)) {
    try {
        $mindPython = Resolve-Python $MindForgeRoot
        $process = Start-Process -FilePath $mindPython -ArgumentList @("-m", "uvicorn", "services.api.main:app", "--host", "127.0.0.1", "--port", "8000") -WorkingDirectory $MindForgeRoot -RedirectStandardOutput (Join-Path $RuntimeRoot "mindforge.log") -RedirectStandardError (Join-Path $RuntimeRoot "mindforge.err.log") -WindowStyle Hidden -PassThru
        $owned += [ordered]@{ name = "mindforge-api"; pid = $process.Id; started_at = (Get-Date).ToUniversalTime().ToString("o") }
    } catch {
        Write-Host "OPTIONAL  MindForge Studio не запущен: $($_.Exception.Message)" -ForegroundColor Yellow
        Write-RunTrace "mindforge.start" "optional-failed" $_.Exception.Message
    }
}

if ($owned.Count) { $owned | ConvertTo-Json | Set-Content -LiteralPath $PidFile -Encoding utf8 }

$backendReady = Wait-Http "Media Gateway" $BackendUrl
$frontendReady = Wait-Http "BOOK.CRAFT" $AppUrl
$mindForgeReady = Wait-Http "MindForge Studio" $MindForgeUrl 8
$llmReady = Test-Http $LlmModelsUrl
$comfyReady = Test-Http $ComfyUrl

if ($llmReady) { Write-Host "READY  LM Studio  http://127.0.0.1:1234" -ForegroundColor Green }
else { Write-Host "OPTIONAL  LM Studio не готов; возможны состояния model-not-loaded или authentication-required (Require Authentication)." -ForegroundColor Yellow }
if ($comfyReady) { Write-Host "READY  ComfyUI  http://127.0.0.1:8188" -ForegroundColor Green }
elseif ($Verify) { throw "ComfyUI обязателен в режиме -Verify, но API не отвечает." }
else { Write-Host "OPTIONAL  ComfyUI не запущен; текст и системный звук продолжат работать." -ForegroundColor Yellow }

# Compatibility arguments retained for managed llama.cpp profiles:
$GigaChatCompatibility = @("--no-jinja", "--chat-template", "chatml")
Write-RunTrace "launch.finish" "complete" "frontend=$frontendReady backend=$backendReady mindforge=$mindForgeReady llm=$llmReady comfy=$comfyReady"

if ($Verify -and (-not $backendReady -or -not $frontendReady)) { throw "Обязательные сервисы BOOK.CRAFT не готовы." }
if ($frontendReady) { Start-Process $AppUrl }

Write-Host ""
Write-Host "BOOK.CRAFT: $AppUrl"
Write-Host "MindForge:   $MindForgeUrl"
Write-Host "Sound:      microphone -> Whisper; text -> system voice; Piper/Silero planned"
