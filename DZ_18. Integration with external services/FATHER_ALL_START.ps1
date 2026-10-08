$ErrorActionPreference = "Stop"

$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location -LiteralPath $Root

$env:PYTHONPATH = Join-Path $Root "src"

$ConfigDir = Join-Path $Root "runtime-data\config"

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
        [int]$Timeout = 30
    )

    for ($i = 0; $i -lt $Timeout; $i++) {
        if (Test-Port $Port) {
            return $true
        }

        Start-Sleep -Seconds 1
    }

    return $false
}

function Start-PersistentPowerShell {
    param(
        [string]$Name,
        [string]$Command
    )

    $bytes = [System.Text.Encoding]::Unicode.GetBytes(
        $Command
    )

    $encoded = [Convert]::ToBase64String(
        $bytes
    )

    Write-Host "      Starting $Name..."

    Start-Process `
        -FilePath "powershell.exe" `
        -ArgumentList @(
            "-NoProfile",
            "-ExecutionPolicy",
            "Bypass",
            "-EncodedCommand",
            $encoded
        ) `
        -WindowStyle Minimized
}

Write-Host ""
Write-Host "============================================================"
Write-Host "            FATHER / ALINA PLATFORM START"
Write-Host "============================================================"
Write-Host ""

# ------------------------------------------------------------
# 1. OLLAMA
# ------------------------------------------------------------

Write-Host "[1/5] OLLAMA" -ForegroundColor Cyan

if (-not (Test-Port 11434)) {

    Start-PersistentPowerShell `
        "Ollama" `
        "ollama serve"
}

if (-not (Wait-Port 11434 20)) {
    throw "Ollama failed to start."
}

Write-Host "      READY :11434" -ForegroundColor Green


# ------------------------------------------------------------
# 2. COMFYUI
# ------------------------------------------------------------

Write-Host "[2/5] COMFYUI" -ForegroundColor Cyan

if (-not (Test-Port 8188)) {

    $configPath = Join-Path `
        $ConfigDir `
        "comfyui.local.json"

    if (-not (Test-Path $configPath)) {
        throw "ComfyUI local config not found."
    }

    $comfy = Get-Content `
        $configPath `
        -Raw |
        ConvertFrom-Json

    $wd = $comfy.working_directory.Replace(
        "'",
        "''"
    )

    $exe = $comfy.executable.Replace(
        "'",
        "''"
    )

    $args = $comfy.arguments

    $command = @"
Set-Location -LiteralPath '$wd'
& '$exe' $args
"@

    Start-PersistentPowerShell `
        "ComfyUI" `
        $command
}

if (-not (Wait-Port 8188 120)) {
    throw "ComfyUI failed to start."
}

Write-Host "      READY :8188" -ForegroundColor Green


# ------------------------------------------------------------
# 3. FATHER API
# ------------------------------------------------------------

Write-Host "[3/5] FATHER API" -ForegroundColor Cyan

if (-not (Test-Port 8010)) {

    $escapedRoot = $Root.Replace(
        "'",
        "''"
    )

    $command = @"
Set-Location -LiteralPath '$escapedRoot'
`$env:PYTHONPATH = '$escapedRoot\src'
python -m uvicorn father.runtime.api.app:app --host 127.0.0.1 --port 8010
"@

    Start-PersistentPowerShell `
        "FATHER API" `
        $command
}

if (-not (Wait-Port 8010 30)) {
    throw "FATHER API failed to start."
}

Write-Host "      READY :8010" -ForegroundColor Green


# ------------------------------------------------------------
# 4. DZ18 NODE API
# ------------------------------------------------------------

Write-Host "[4/5] DZ18 API" -ForegroundColor Cyan

if (-not (Test-Port 5190)) {

    $escapedRoot = $Root.Replace(
        "'",
        "''"
    )

    $command = @"
Set-Location -LiteralPath '$escapedRoot'
npm.cmd run dev:api
"@

    Start-PersistentPowerShell `
        "DZ18 API" `
        $command
}

if (-not (Wait-Port 5190 30)) {
    throw "DZ18 API failed to start."
}

Write-Host "      READY :5190" -ForegroundColor Green


# ------------------------------------------------------------
# 5. ALINA STUDIO / VITE
# ------------------------------------------------------------

Write-Host "[5/5] ALINA STUDIO" -ForegroundColor Cyan

if (-not (Test-Port 5188)) {

    $escapedRoot = $Root.Replace(
        "'",
        "''"
    )

    $command = @"
Set-Location -LiteralPath '$escapedRoot'
npm.cmd run dev:web -- --host 127.0.0.1 --port 5188
"@

    Start-PersistentPowerShell `
        "ALINA Studio" `
        $command
}

if (-not (Wait-Port 5188 30)) {
    throw "ALINA Studio failed to start."
}

Write-Host "      READY :5188" -ForegroundColor Green


# ------------------------------------------------------------
# HEALTH
# ------------------------------------------------------------

Write-Host ""
Write-Host "============================================================"
Write-Host "                  ALINA / FATHER STATUS"
Write-Host "============================================================"

$services = @(
    @{ Name = "Ollama";       Port = 11434 },
    @{ Name = "ComfyUI";      Port = 8188  },
    @{ Name = "FATHER API";   Port = 8010  },
    @{ Name = "DZ18 API";     Port = 5190  },
    @{ Name = "ALINA Studio"; Port = 5188  }
)

foreach ($service in $services) {

    $state = if (Test-Port $service.Port) {
        "READY"
    }
    else {
        "STOPPED"
    }

    Write-Host (
        "{0,-20} :{1,-6} {2}" -f `
        $service.Name,
        $service.Port,
        $state
    )
}

Write-Host ""

try {
    $health = Invoke-RestMethod `
        "http://127.0.0.1:8010/api/father/health" `
        -TimeoutSec 5

    Write-Host "TEXT        $($health.services.llm.status.ToUpper())"
    Write-Host "VOICE IN    $($health.services.stt.status.ToUpper())"
    Write-Host "VOICE OUT   $($health.services.tts.status.ToUpper())"
    Write-Host "IMAGE       $($health.services.image.status.ToUpper())"
}
catch {
    Write-Host "FATHER health unavailable." -ForegroundColor Red
}

Write-Host ""
Write-Host "============================================================"
Write-Host "                    ALINA READY"
Write-Host "============================================================"
Write-Host ""
Write-Host "ALINA STUDIO:"
Write-Host "http://localhost:5188/" -ForegroundColor Cyan
Write-Host ""

Start-Process "http://localhost:5188/"
