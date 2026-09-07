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

New-Item -ItemType Directory -Force -Path $RuntimeRoot, $TraceRoot | Out-Null
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

function Test-BookcraftPython([string]$PythonPath) {
    if (-not $PythonPath -or -not (Test-Path -LiteralPath $PythonPath)) { return $false }
    try {
        & $PythonPath -c "import sys, fastapi, uvicorn, httpx, dotenv; assert sys.version_info >= (3, 11)" *> $null
        return $LASTEXITCODE -eq 0
    } catch { return $false }
}

function Find-Python311Plus {
    $py = Get-Command py.exe -ErrorAction SilentlyContinue
    if ($py) {
        foreach ($version in @("3.13", "3.12", "3.11")) {
            try {
                $resolved = & $py.Source "-$version" -c "import sys; print(sys.executable)" 2>$null
                if ($LASTEXITCODE -eq 0 -and $resolved) { return ($resolved | Select-Object -Last 1).Trim() }
            } catch {}
        }
    }

    foreach ($candidate in @(
        "$env:LOCALAPPDATA\Programs\Python\Python313\python.exe",
        "$env:LOCALAPPDATA\Programs\Python\Python312\python.exe",
        "$env:LOCALAPPDATA\Programs\Python\Python311\python.exe"
    )) {
        if (Test-Path -LiteralPath $candidate) { return $candidate }
    }

    $python = Get-Command python.exe -ErrorAction SilentlyContinue
    if ($python) {
        try {
            & $python.Source -c "import sys; raise SystemExit(0 if sys.version_info >= (3,11) else 1)" *> $null
            if ($LASTEXITCODE -eq 0) { return $python.Source }
        } catch {}
    }
    return $null
}

function Ensure-BookcraftPython([string]$Root) {
    foreach ($environmentName in @(".venv-runtime", ".venv")) {
        $venvPython = Join-Path $Root "$environmentName\Scripts\python.exe"
        if (Test-BookcraftPython $venvPython) { return [string]$venvPython }
    }

    $basePython = Find-Python311Plus
    if (-not $basePython) {
        throw "BOOK.CRAFT требует Python 3.11+. Сейчас найден только старый Python. Установите Python 3.12 и повторите запуск."
    }

    $venvRoot = Join-Path $Root ".venv-runtime"
    $venvPython = Join-Path $venvRoot "Scripts\python.exe"
    Write-Host "SETUP  Python runtime: $basePython" -ForegroundColor Cyan
    Write-RunTrace "dependencies.python" "installing" $basePython
    if (Test-Path -LiteralPath $venvRoot) { Remove-Item -LiteralPath $venvRoot -Recurse -Force }
    & $basePython -m venv $venvRoot | Out-Host
    if ($LASTEXITCODE -ne 0) { throw "Не удалось создать .venv-runtime." }
    & $venvPython -m pip install --disable-pip-version-check -r (Join-Path $Root "backend\requirements.txt") | Out-Host
    if ($LASTEXITCODE -ne 0) { throw "Не удалось установить Python-зависимости BOOK.CRAFT." }
    if (-not (Test-BookcraftPython $venvPython)) { throw "Python runtime создан, но зависимости не прошли проверку." }
    Write-Host "READY  Python runtime" -ForegroundColor Green
    Write-RunTrace "dependencies.python" "ready" $venvPython
    return [string]$venvPython
}

function Ensure-FrontendDependencies([string]$Root) {
    $vite = Join-Path $Root "node_modules\.bin\vite.cmd"
    if (Test-Path -LiteralPath $vite) { return }
    $npm = (Get-Command npm.cmd -ErrorAction Stop).Source
    Write-Host "SETUP  Frontend dependencies (npm ci)" -ForegroundColor Cyan
    Write-RunTrace "dependencies.frontend" "installing" "npm ci"
    Push-Location $Root
    try {
        & $npm ci | Out-Host
        if ($LASTEXITCODE -ne 0) { throw "npm ci завершился с кодом $LASTEXITCODE" }
    } finally { Pop-Location }
    if (-not (Test-Path -LiteralPath $vite)) { throw "Vite не найден после npm ci." }
    Write-Host "READY  Frontend dependencies" -ForegroundColor Green
    Write-RunTrace "dependencies.frontend" "ready" "node_modules"
}

function Resolve-Python([string]$Root) {
    foreach ($environmentName in @(".venv-runtime", ".venv")) {
        $venvPython = Join-Path $Root "$environmentName\Scripts\python.exe"
        if (Test-Path -LiteralPath $venvPython) {
            try {
                & $venvPython -c "import fastapi, uvicorn" *> $null
                if ($LASTEXITCODE -eq 0) { return [string]$venvPython }
            } catch {}
        }
    }
    $python = Get-Command python.exe -ErrorAction SilentlyContinue
    if ($python) { return [string]$python.Source }
    $py = Get-Command py.exe -ErrorAction SilentlyContinue
    if ($py) { return [string]$py.Source }
    throw "Python с FastAPI и Uvicorn не найден."
}

Set-Location -LiteralPath $ProjectRoot
$owned = @()

$python = [string](Ensure-BookcraftPython $ProjectRoot | Select-Object -Last 1)
Ensure-FrontendDependencies $ProjectRoot

if (-not (Test-Http $BackendUrl)) {
    $backendLog = Join-Path $RuntimeRoot "backend.log"
    $process = Start-Process -FilePath $python -ArgumentList @("-m", "uvicorn", "backend.model_router_resilient_app:app", "--host", "127.0.0.1", "--port", "8018") -WorkingDirectory $ProjectRoot -RedirectStandardOutput $backendLog -RedirectStandardError (Join-Path $RuntimeRoot "backend.err.log") -WindowStyle Hidden -PassThru
    $owned += [ordered]@{ name = "bookcraft-backend"; pid = $process.Id; started_at = (Get-Date).ToUniversalTime().ToString("o") }
}

if (-not (Test-Http $AppUrl)) {
    $npm = [string](Get-Command npm.cmd -ErrorAction Stop).Source
    $frontendLog = Join-Path $RuntimeRoot "frontend.log"
    $process = Start-Process -FilePath $npm -ArgumentList @("run", "dev", "--", "--host", "127.0.0.1") -WorkingDirectory $ProjectRoot -RedirectStandardOutput $frontendLog -RedirectStandardError (Join-Path $RuntimeRoot "frontend.err.log") -WindowStyle Hidden -PassThru
    $owned += [ordered]@{ name = "bookcraft-frontend"; pid = $process.Id; started_at = (Get-Date).ToUniversalTime().ToString("o") }
}

if ((Test-Path -LiteralPath $MindForgeRoot) -and -not (Test-Http $MindForgeUrl)) {
    try {
        $mindPython = [string](Resolve-Python $MindForgeRoot | Select-Object -Last 1)
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
else {
    Write-Host "OPTIONAL  ComfyUI не запущен; текст, STT и Model Router продолжат работать." -ForegroundColor Yellow
    Write-RunTrace "service.degraded" "optional" "ComfyUI 8188 is not running"
}

$GigaChatCompatibility = @("--no-jinja", "--chat-template", "chatml")
Write-RunTrace "launch.finish" "complete" "frontend=$frontendReady backend=$backendReady mindforge=$mindForgeReady llm=$llmReady comfy=$comfyReady"

if ($Verify -and (-not $backendReady -or -not $frontendReady)) { throw "Обязательные сервисы BOOK.CRAFT не готовы." }
if ($frontendReady) { Start-Process $AppUrl }

Write-Host ""
Write-Host "BOOK.CRAFT: $AppUrl"
Write-Host "MindForge:   $MindForgeUrl"
Write-Host "Models:      manual selection or resilient AUTO router via LM Studio"
Write-Host "Sound:       microphone/file -> Whisper; text -> selected local model"
