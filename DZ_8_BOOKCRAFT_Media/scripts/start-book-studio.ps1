$ErrorActionPreference = "Stop"

$ProjectRoot = Split-Path -Parent $PSScriptRoot
$LlamaServer = "C:\Users\1\.docker\bin\inference\llama-server.exe"
$ModelPath = "C:\Users\1\.lmstudio\models\bartowski\ai-sage_GigaChat3-10B-A1.8B-GGUF\ai-sage_GigaChat3-10B-A1.8B-Q4_K_S.gguf"
$LlmHealth = "http://127.0.0.1:1234/health"
$LlmCompletion = "http://127.0.0.1:1234/v1/chat/completions"
$AppUrl = "http://127.0.0.1:5173"
$script:ChecksPassed = 0

function Write-Check([string]$Label, [string]$Detail = "") {
    $script:ChecksPassed++
    $suffix = if ($Detail) { " - $Detail" } else { "" }
    Write-Host "  [OK] $Label$suffix" -ForegroundColor Green
}

function Stop-Preflight([string]$Problem, [string]$Fix) {
    Write-Host ""
    Write-Host "  [ERROR] $Problem" -ForegroundColor Red
    Write-Host "  Action: $Fix" -ForegroundColor Yellow
    throw "Preflight failed."
}

function Test-Url([string]$Url, [int]$TimeoutSec = 2) {
    try {
        Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec $TimeoutSec | Out-Null
        return $true
    } catch {
        return $false
    }
}

function Test-TcpPort([int]$Port) {
    try {
        $client = New-Object System.Net.Sockets.TcpClient
        $result = $client.BeginConnect("127.0.0.1", $Port, $null, $null)
        $connected = $result.AsyncWaitHandle.WaitOne(700, $false) -and $client.Connected
        $client.Close()
        return $connected
    } catch {
        return $false
    }
}

function Test-LlmAnswer {
    try {
        $body = @{
            model = "gigachat-local"
            messages = @(@{ role = "user"; content = "Reply with one word only: READY" })
            temperature = 0
            max_tokens = 12
            stream = $false
        } | ConvertTo-Json -Depth 5
        $response = Invoke-RestMethod -Uri $LlmCompletion -Method Post -ContentType "application/json" -Body $body -TimeoutSec 45
        $content = $response.choices[0].message.content
        return -not [string]::IsNullOrWhiteSpace($content)
    } catch {
        return $false
    }
}

Clear-Host
Write-Host "===============================================" -ForegroundColor DarkMagenta
Write-Host " BOOK.CRAFT - DEMO READINESS CHECK" -ForegroundColor Magenta
Write-Host "===============================================" -ForegroundColor DarkMagenta

Write-Host "`n[1/6] Checking environment..." -ForegroundColor Cyan
if (-not (Test-Path $LlamaServer)) {
    Stop-Preflight "llama-server.exe not found" "Check path: $LlamaServer"
}
Write-Check "llama-server.exe found"

if (-not (Test-Path $ModelPath)) {
    Stop-Preflight "Local GigaChat model not found" "Check path: $ModelPath"
}
$modelSizeGb = [math]::Round((Get-Item $ModelPath).Length / 1GB, 1)
Write-Check "GigaChat model found" "$modelSizeGb GB"

if (-not (Get-Command node.exe -ErrorAction SilentlyContinue)) {
    Stop-Preflight "Node.js is not in PATH" "Install Node.js LTS and reopen PowerShell."
}
if (-not (Get-Command npm.cmd -ErrorAction SilentlyContinue)) {
    Stop-Preflight "npm is not in PATH" "Reinstall Node.js LTS with npm."
}
$nodeVersion = (& node.exe --version).Trim()
Write-Check "Node.js and npm available" $nodeVersion

Set-Location $ProjectRoot

Write-Host "`n[2/6] Checking dependencies..." -ForegroundColor Cyan
if (-not (Test-Path (Join-Path $ProjectRoot "node_modules"))) {
    Write-Host "  First run: installing dependencies..." -ForegroundColor Yellow
    & npm.cmd install --no-audit --no-fund
    if ($LASTEXITCODE -ne 0) {
        Stop-Preflight "npm install failed" "Check internet access and run again."
    }
}
Write-Check "UI dependencies installed"

Write-Host "`n[3/6] Running M0-M1 acceptance tests..." -ForegroundColor Cyan
& npm.cmd test
if ($LASTEXITCODE -ne 0) {
    Stop-Preflight "MIN/MED/MAX tests failed" "Do not record the video; save this console output."
}
Write-Check "MIN / MED / MAX are green"

Write-Host "`n[4/6] Checking local GigaChat..." -ForegroundColor Cyan
if (-not (Test-Url $LlmHealth)) {
    if (Test-TcpPort 1234) {
        Stop-Preflight "Port 1234 is occupied" "Close the program using port 1234 and run again."
    }
    Write-Host "  Starting llama-server; first start may take up to 90 seconds..." -ForegroundColor Yellow
    $arguments = @(
        "-m", ('"' + $ModelPath + '"'),
        "--host", "127.0.0.1",
        "--port", "1234",
        "-ngl", "99",
        "-c", "8192",
        "--no-jinja",
        "--chat-template", "chatml"
    )
    Start-Process -FilePath $LlamaServer -ArgumentList $arguments -WorkingDirectory (Split-Path $LlamaServer)

    $ready = $false
    for ($attempt = 1; $attempt -le 90; $attempt++) {
        Start-Sleep -Seconds 1
        if (Test-Url $LlmHealth) {
            $ready = $true
            break
        }
    }
    if (-not $ready) {
        Stop-Preflight "GigaChat did not start in 90 seconds" "Check llama-server and available VRAM."
    }
}
Write-Check "Model server is responding" "127.0.0.1:1234"

if (-not (Test-LlmAnswer)) {
    Stop-Preflight "Server runs but model returned no answer" "Check llama-server, then restart BOOK.CRAFT."
}
Write-Check "GigaChat control generation passed"

Write-Host "`n[5/6] Starting UI..." -ForegroundColor Cyan
if (-not (Test-Url $AppUrl)) {
    if (Test-TcpPort 5173) {
        Stop-Preflight "Port 5173 is occupied" "Close the old Vite/Node process and run again."
    }
    Start-Process -FilePath "npm.cmd" -ArgumentList @("run", "dev") -WorkingDirectory $ProjectRoot
    for ($attempt = 1; $attempt -le 45; $attempt++) {
        Start-Sleep -Seconds 1
        if (Test-Url $AppUrl) { break }
    }
}
if (-not (Test-Url $AppUrl)) {
    Stop-Preflight "UI did not start" "Check npm/Vite window and run again."
}
Write-Check "UI is responding" $AppUrl

Write-Host "`n[6/6] BOOK.CRAFT READY FOR DEMO" -ForegroundColor Green
Write-Host "  Checks passed: $script:ChecksPassed" -ForegroundColor Green
Write-Host "  In the app: Book script -> Load demo -> Send" -ForegroundColor White
Write-Host "  Keep llama-server and Vite windows open while recording." -ForegroundColor DarkGray
Start-Process $AppUrl
