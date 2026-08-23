param([switch]$Verify)

$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$RuntimeRoot = Join-Path $ProjectRoot ".runtime"
$Python = Join-Path $ProjectRoot ".venv\Scripts\python.exe"
$BackendUrl = "http://127.0.0.1:8018/api/health"
$ReadinessUrl = "http://127.0.0.1:8018/api/readiness"
$LlmModelsUrl = "http://127.0.0.1:1234/v1/models"
$AppUrl = "http://127.0.0.1:5173"

Set-Location -LiteralPath $ProjectRoot
New-Item -ItemType Directory -Force -Path $RuntimeRoot | Out-Null
$TraceRoot = Join-Path $RuntimeRoot "traces"
New-Item -ItemType Directory -Force -Path $TraceRoot | Out-Null
$RunId = [guid]::NewGuid().ToString()
$RunTrace = Join-Path $TraceRoot ("start-{0:yyyyMMdd-HHmmss}.jsonl" -f (Get-Date))
$env:BOOKCRAFT_RUN_ID = $RunId
$env:BOOKCRAFT_TRACE_ROOT = $TraceRoot

function Write-RunTrace([string]$Event, [string]$Status, [string]$Detail = "") {
    $record = [ordered]@{
        timestamp = (Get-Date).ToUniversalTime().ToString("o")
        run_id = $RunId
        component = "launcher"
        event = $Event
        status = $Status
        detail = $Detail
    }
    ($record | ConvertTo-Json -Compress) | Add-Content -LiteralPath $RunTrace -Encoding utf8
}
function Write-Step([string]$Text) {
    Write-Host "`n== $Text" -ForegroundColor Cyan
    Write-RunTrace "launch.step" "started" $Text
}
function Write-Ok([string]$Text) {
    Write-Host "   READY  $Text" -ForegroundColor Green
    Write-RunTrace "service.ready" "ready" $Text
}
function Stop-Launch([string]$Problem, [string]$Action) {
    Write-RunTrace "launch.blocked" "blocked" "$Problem ACTION: $Action"
    Write-Host "`n   BLOCKED  $Problem" -ForegroundColor Red
    Write-Host "   ACTION   $Action" -ForegroundColor Yellow
    throw $Problem
}
function Test-TcpPort([int]$Port) {
    $client = [System.Net.Sockets.TcpClient]::new()
    try {
        $result = $client.BeginConnect("127.0.0.1", $Port, $null, $null)
        return $result.AsyncWaitHandle.WaitOne(700, $false) -and $client.Connected
    } catch { return $false } finally { $client.Dispose() }
}
function Test-Url([string]$Url, [int]$TimeoutSec = 2) {
    try {
        Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec $TimeoutSec | Out-Null
        return $true
    } catch { return $false }
}
function Get-LlmState {
    try {
        $response = Invoke-RestMethod -Uri $LlmModelsUrl -TimeoutSec 4
        $ids = @($response.data | ForEach-Object { $_.id } | Where-Object { $_ })
        if ($ids.Count -eq 0) { return @{ State = "model-not-loaded"; Models = @() } }
        return @{ State = "ready"; Models = $ids }
    } catch {
        $statusCode = 0
        if ($_.Exception.Response -and $_.Exception.Response.StatusCode) {
            $statusCode = [int]$_.Exception.Response.StatusCode
        }
        if ($statusCode -eq 401) { return @{ State = "authentication-required"; Models = @() } }
        if (Test-TcpPort 1234) { return @{ State = "http-error"; Models = @() } }
        return @{ State = "server-stopped"; Models = @() }
    }
}
function Find-LlamaServer {
    $candidates = @(
        $env:BOOKCRAFT_LLAMA_SERVER,
        (Join-Path $env:USERPROFILE ".docker\bin\inference\llama-server.exe")
    ) | Where-Object { $_ -and (Test-Path -LiteralPath $_) }
    return $candidates | Select-Object -First 1
}
function Find-PreferredModel {
    if ($env:BOOKCRAFT_MODEL_PATH -and (Test-Path -LiteralPath $env:BOOKCRAFT_MODEL_PATH)) {
        return $env:BOOKCRAFT_MODEL_PATH
    }
    $modelRoot = Join-Path $env:USERPROFILE ".lmstudio\models"
    if (-not (Test-Path -LiteralPath $modelRoot)) { return $null }
    $models = @(Get-ChildItem -LiteralPath $modelRoot -Filter "*.gguf" -File -Recurse -ErrorAction SilentlyContinue |
        Where-Object { $_.Name -notmatch "mmproj|embedding" })
    $preferred = $models | Where-Object { $_.Name -match "GigaChat3.*Q4|Qwen2\.5.*Instruct.*Q4" } | Select-Object -First 1
    if ($preferred) { return $preferred.FullName }
    $fallback = $models | Where-Object { $_.Length -le 10GB } | Sort-Object Length -Descending | Select-Object -First 1
    if ($fallback) { return $fallback.FullName }
    return $null
}
function Wait-ForUrl([string]$Url, [int]$Seconds) {
    for ($attempt = 1; $attempt -le $Seconds; $attempt++) {
        if (Test-Url $Url 2) { return $true }
        Start-Sleep -Seconds 1
    }
    return $false
}

Clear-Host
Write-Host "BOOK.CRAFT MEDIA - RELIABLE LOCAL START" -ForegroundColor Magenta
Write-Host "Frontend 5173 | Gateway 8018 | LLM 1234" -ForegroundColor DarkGray
Write-RunTrace "launch.start" "started" $ProjectRoot

Write-Step "1/5 Prerequisites"
if (-not (Get-Command py.exe -ErrorAction SilentlyContinue)) {
    Stop-Launch "Python launcher py.exe not found." "Install Python 3.12 and reopen PowerShell."
}
if (-not (Get-Command node.exe -ErrorAction SilentlyContinue) -or -not (Get-Command npm.cmd -ErrorAction SilentlyContinue)) {
    Stop-Launch "Node.js or npm not found." "Install Node.js LTS and reopen PowerShell."
}
Write-Ok "Python, Node.js and npm"

if (-not (Test-Path -LiteralPath $Python)) {
    Write-Host "   Creating isolated Python environment..." -ForegroundColor Yellow
    & py.exe -m venv (Join-Path $ProjectRoot ".venv")
}
if (-not (Test-Path -LiteralPath (Join-Path $ProjectRoot "node_modules"))) {
    Write-Host "   Installing UI dependencies (first run only)..." -ForegroundColor Yellow
    & npm.cmd install --no-audit --no-fund
    if ($LASTEXITCODE -ne 0) { Stop-Launch "npm install failed." "Check network and npm output." }
}
& $Python -c "import fastapi, uvicorn, httpx, multipart" 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "   Installing Gateway dependencies (first run only)..." -ForegroundColor Yellow
    & $Python -m pip install -q -r (Join-Path $ProjectRoot "backend\requirements.txt")
    if ($LASTEXITCODE -ne 0) { Stop-Launch "Backend dependency installation failed." "Check pip output." }
}
Write-Ok "Project dependencies"

Write-Step "2/5 Acceptance checks"
if ($Verify) {
    & npm.cmd test
    if ($LASTEXITCODE -ne 0) { Stop-Launch "Acceptance tests failed." "Save the output; do not start the demo." }
    & $Python (Join-Path $ProjectRoot "tests\test_media_contract.py")
    if ($LASTEXITCODE -ne 0) { Stop-Launch "Media contract failed." "Save the output and repair the contract." }
    Write-Ok "Automated checks"
} else {
    Write-Host "   SKIP   Normal start. Use .\START_BOOKCRAFT_MEDIA.ps1 -Verify for full checks." -ForegroundColor DarkGray
}

Write-Step "3/5 Media Gateway"
if (-not (Test-Url $BackendUrl)) {
    if (Test-TcpPort 8018) {
        Stop-Launch "Port 8018 is occupied by another service." "Close that service or change BOOK.CRAFT configuration."
    }
    $backendOut = Join-Path $RuntimeRoot "gateway.out.log"
    $backendErr = Join-Path $RuntimeRoot "gateway.err.log"
    $process = Start-Process -FilePath $Python -ArgumentList @(
        "-m", "uvicorn", "backend.app:app", "--host", "127.0.0.1", "--port", "8018"
    ) -WorkingDirectory $ProjectRoot -RedirectStandardOutput $backendOut -RedirectStandardError $backendErr -PassThru
    $process.Id | Set-Content -LiteralPath (Join-Path $RuntimeRoot "gateway.pid")
    if (-not (Wait-ForUrl $BackendUrl 30)) { Stop-Launch "Media Gateway did not start." "Open $backendErr" }
}
Write-Ok "Media Gateway http://127.0.0.1:8018"

Write-Step "4/5 Local model"
$llm = Get-LlmState
if ($llm.State -eq "authentication-required") {
    Stop-Launch "LM Studio requires an API token." "LM Studio > Developer > Server Settings: turn off Require Authentication for this local demo."
}
if ($llm.State -eq "model-not-loaded") {
    Stop-Launch "LM Studio API is running but no model is loaded." "Load one text model in LM Studio, then run this launcher again."
}
if ($llm.State -eq "http-error") {
    Stop-Launch "Port 1234 responds with an incompatible HTTP service." "Stop the service on port 1234 or configure LM Studio correctly."
}
if ($llm.State -eq "server-stopped") {
    $llamaServer = Find-LlamaServer
    $modelPath = Find-PreferredModel
    if (-not $llamaServer -or -not $modelPath) {
        $lmStudio = Join-Path $env:LOCALAPPDATA "Programs\LM Studio\LM Studio.exe"
        if (Test-Path -LiteralPath $lmStudio) { Start-Process -FilePath $lmStudio | Out-Null }
        Stop-Launch "No local model API is running on port 1234." "In LM Studio load a model, switch Status to Running, disable Require Authentication, then run this launcher again."
    }
    Write-Host "   Starting llama-server with: $(Split-Path $modelPath -Leaf)" -ForegroundColor Yellow
    $llmOut = Join-Path $RuntimeRoot "llm.out.log"
    $llmErr = Join-Path $RuntimeRoot "llm.err.log"
    $process = Start-Process -FilePath $llamaServer -ArgumentList @(
        "-m", ('"' + $modelPath + '"'), "--host", "127.0.0.1", "--port", "1234", "-ngl", "99", "-c", "8192"
    ) -WorkingDirectory (Split-Path $llamaServer) -RedirectStandardOutput $llmOut -RedirectStandardError $llmErr -PassThru
    $process.Id | Set-Content -LiteralPath (Join-Path $RuntimeRoot "llm.pid")
    $ready = $false
    for ($attempt = 1; $attempt -le 120; $attempt++) {
        Start-Sleep -Seconds 1
        $llm = Get-LlmState
        if ($llm.State -eq "ready") { $ready = $true; break }
    }
    if (-not $ready) { Stop-Launch "Local model did not become ready in 120 seconds." "Open $llmErr" }
}
$llm = Get-LlmState
if ($llm.State -ne "ready") { Stop-Launch "Local model readiness is $($llm.State)." "Check LM Studio Local Server." }
Write-Ok "Local model: $($llm.Models -join ', ')"

Write-Step "5/5 BOOK.CRAFT interface"
if (-not (Test-Url $AppUrl)) {
    if (Test-TcpPort 5173) {
        Stop-Launch "Port 5173 is occupied but does not serve BOOK.CRAFT." "Close the old Node/Vite process, then run again."
    }
    $uiOut = Join-Path $RuntimeRoot "ui.out.log"
    $uiErr = Join-Path $RuntimeRoot "ui.err.log"
    $process = Start-Process -FilePath "npm.cmd" -ArgumentList @("run", "dev", "--", "--host", "127.0.0.1", "--port", "5173") `
        -WorkingDirectory $ProjectRoot -RedirectStandardOutput $uiOut -RedirectStandardError $uiErr -PassThru
    $process.Id | Set-Content -LiteralPath (Join-Path $RuntimeRoot "ui.pid")
    if (-not (Wait-ForUrl $AppUrl 45)) { Stop-Launch "BOOK.CRAFT UI did not start." "Open $uiErr" }
}
Write-Ok "Frontend $AppUrl"

$readiness = Invoke-RestMethod -Uri $ReadinessUrl -TimeoutSec 5
if ($readiness.status -ne "ready") {
    Stop-Launch "Final readiness check is degraded: $($readiness.llm.message)" "Correct the reported LM Studio state."
}

Write-Host "`nBOOK.CRAFT MEDIA IS READY" -ForegroundColor Green
Write-Host "  Frontend       READY  $AppUrl"
Write-Host "  Media Gateway  READY  http://127.0.0.1:8018"
Write-Host "  Local model    READY  $($llm.Models -join ', ')"
Write-Host "  Logs                 $RuntimeRoot" -ForegroundColor DarkGray
Write-RunTrace "launch.finish" "ready" $AppUrl
Start-Process $AppUrl
