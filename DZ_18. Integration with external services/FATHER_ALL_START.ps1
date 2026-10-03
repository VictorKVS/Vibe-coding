$ErrorActionPreference = "Stop"

$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $Root

$env:PYTHONPATH = Join-Path $Root "src"

$Logs = Join-Path $Root "runtime-data\logs"
$ConfigDir = Join-Path $Root "runtime-data\config"

New-Item -ItemType Directory -Force $Logs | Out-Null
New-Item -ItemType Directory -Force $ConfigDir | Out-Null


function Test-Port {
    param([int]$Port)

    try {
        $client = New-Object System.Net.Sockets.TcpClient

        $result = $client.BeginConnect(
            "127.0.0.1",
            $Port,
            $null,
            $null
        )

        $ok = $result.AsyncWaitHandle.WaitOne(500)

        if ($ok) {
            $client.EndConnect($result)
        }

        $client.Close()
        return $ok
    }
    catch {
        return $false
    }
}


function Wait-Port {
    param(
        [int]$Port,
        [int]$TimeoutSeconds = 30
    )

    for ($i = 0; $i -lt $TimeoutSeconds; $i++) {
        if (Test-Port $Port) {
            return $true
        }

        Start-Sleep -Seconds 1
    }

    return $false
}


function Show-Port {
    param(
        [string]$Name,
        [int]$Port
    )

    if (Test-Port $Port) {
        Write-Host (
            "{0,-18} :{1,-6} READY" -f $Name, $Port
        ) -ForegroundColor Green
    }
    else {
        Write-Host (
            "{0,-18} :{1,-6} STOPPED" -f $Name, $Port
        ) -ForegroundColor Red
    }
}


Write-Host ""
Write-Host "============================================================"
Write-Host "                 FATHER PLATFORM START"
Write-Host "============================================================"
Write-Host ""


# ============================================================
# 1. OLLAMA
# ============================================================

Write-Host "[1/5] OLLAMA" -ForegroundColor Cyan

if (-not (Test-Port 11434)) {

    if (-not (Get-Command ollama -ErrorAction SilentlyContinue)) {
        throw "Ollama executable not found."
    }

    Write-Host "      Starting Ollama..."

    Start-Process `
        -FilePath "ollama" `
        -ArgumentList "serve" `
        -WindowStyle Hidden

    if (-not (Wait-Port 11434 20)) {
        throw "Ollama failed to start on port 11434."
    }
}

Write-Host "      READY :11434" -ForegroundColor Green


# ============================================================
# 2. COMFYUI
# ============================================================

Write-Host "[2/5] COMFYUI" -ForegroundColor Cyan

if (-not (Test-Port 8188)) {

    $ComfyConfig = Join-Path `
        $ConfigDir `
        "comfyui.local.json"

    if (-not (Test-Path $ComfyConfig)) {
        throw "ComfyUI launch config not found: $ComfyConfig"
    }

    $comfy = Get-Content `
        $ComfyConfig `
        -Raw |
        ConvertFrom-Json

    if (-not (Test-Path $comfy.executable)) {
        throw "ComfyUI Python not found: $($comfy.executable)"
    }

    Write-Host "      Starting ComfyUI..."
    Write-Host "      $($comfy.executable)"
    Write-Host "      $($comfy.arguments)"

    Start-Process `
        -FilePath $comfy.executable `
        -ArgumentList $comfy.arguments `
        -WorkingDirectory $comfy.working_directory `
        -RedirectStandardOutput (
            Join-Path $Logs "comfyui.out.log"
        ) `
        -RedirectStandardError (
            Join-Path $Logs "comfyui.err.log"
        ) `
        -WindowStyle Hidden

    if (-not (Wait-Port 8188 120)) {

        Write-Host ""
        Write-Host "COMFYUI ERROR LOG" -ForegroundColor Red

        Get-Content `
            (Join-Path $Logs "comfyui.err.log") `
            -Tail 40 `
            -ErrorAction SilentlyContinue

        throw "ComfyUI failed to start on port 8188."
    }
}

Write-Host "      READY :8188" -ForegroundColor Green


# ============================================================
# 3. FATHER API
# ============================================================

Write-Host "[3/5] FATHER API" -ForegroundColor Cyan

if (-not (Test-Port 8010)) {

    Write-Host "      Starting FATHER Runtime..."

    Start-Process `
        -FilePath "python" `
        -ArgumentList @(
            "-m",
            "uvicorn",
            "father.runtime.api.app:app",
            "--host",
            "127.0.0.1",
            "--port",
            "8010"
        ) `
        -WorkingDirectory $Root `
        -RedirectStandardOutput (
            Join-Path $Logs "father-api.out.log"
        ) `
        -RedirectStandardError (
            Join-Path $Logs "father-api.err.log"
        ) `
        -WindowStyle Hidden

    if (-not (Wait-Port 8010 30)) {

        Get-Content `
            (Join-Path $Logs "father-api.err.log") `
            -Tail 40 `
            -ErrorAction SilentlyContinue

        throw "FATHER API failed to start."
    }
}

Write-Host "      READY :8010" -ForegroundColor Green


# ============================================================
# 4. DZ18 NODE API
# ============================================================

Write-Host "[4/5] DZ18 API" -ForegroundColor Cyan

if (-not (Test-Port 5190)) {

    Write-Host "      Starting Node API..."

    Start-Process `
        -FilePath "npm.cmd" `
        -ArgumentList @(
            "run",
            "dev:api"
        ) `
        -WorkingDirectory $Root `
        -RedirectStandardOutput (
            Join-Path $Logs "dz18-api.out.log"
        ) `
        -RedirectStandardError (
            Join-Path $Logs "dz18-api.err.log"
        ) `
        -WindowStyle Hidden

    if (-not (Wait-Port 5190 30)) {

        Get-Content `
            (Join-Path $Logs "dz18-api.err.log") `
            -Tail 40 `
            -ErrorAction SilentlyContinue

        throw "DZ18 Node API failed to start."
    }
}

Write-Host "      READY :5190" -ForegroundColor Green


# ============================================================
# 5. VITE
# ============================================================

Write-Host "[5/5] DZ18 WEB" -ForegroundColor Cyan

if (-not (Test-Port 5188)) {

    Write-Host "      Starting Vite..."

    Start-Process `
        -FilePath "npm.cmd" `
        -ArgumentList @(
            "run",
            "dev:web",
            "--",
            "--host",
            "127.0.0.1",
            "--port",
            "5188"
        ) `
        -WorkingDirectory $Root `
        -RedirectStandardOutput (
            Join-Path $Logs "vite.out.log"
        ) `
        -RedirectStandardError (
            Join-Path $Logs "vite.err.log"
        ) `
        -WindowStyle Hidden

    if (-not (Wait-Port 5188 30)) {

        Get-Content `
            (Join-Path $Logs "vite.err.log") `
            -Tail 40 `
            -ErrorAction SilentlyContinue

        throw "Vite failed to start."
    }
}

Write-Host "      READY :5188" -ForegroundColor Green


# ============================================================
# FINAL STATUS
# ============================================================

Write-Host ""
Write-Host "============================================================"
Write-Host "                    FATHER STATUS"
Write-Host "============================================================"

Show-Port "Ollama" 11434
Show-Port "ComfyUI" 8188
Show-Port "FATHER API" 8010
Show-Port "DZ18 API" 5190
Show-Port "DZ18 WEB" 5188


Write-Host ""
Write-Host "CAPABILITIES" -ForegroundColor Cyan

try {

    $health = Invoke-RestMethod `
        -Uri "http://127.0.0.1:8010/api/father/health" `
        -TimeoutSec 5

    Write-Host (
        "TEXT       {0}" -f
        $health.services.llm.status.ToUpper()
    )

    Write-Host (
        "VOICE IN   {0}" -f
        $health.services.stt.status.ToUpper()
    )

    Write-Host (
        "VOICE OUT  {0}" -f
        $health.services.tts.status.ToUpper()
    )

    Write-Host (
        "IMAGE      {0}" -f
        $health.services.image.status.ToUpper()
    )
}
catch {
    Write-Host "FATHER health unavailable: $_" -ForegroundColor Red
}


Write-Host ""
Write-Host "============================================================"
Write-Host "                     FATHER READY"
Write-Host "============================================================"
Write-Host ""
Write-Host "Control Center:"
Write-Host "http://localhost:5188/" -ForegroundColor Cyan
Write-Host ""

Start-Process "http://localhost:5188/"
