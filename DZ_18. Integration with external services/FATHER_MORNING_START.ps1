$ErrorActionPreference = "Continue"

$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $Root

$env:PYTHONPATH = Join-Path $Root "src"

function Header($Text) {
    Write-Host ""
    Write-Host "============================================================" -ForegroundColor DarkGray
    Write-Host $Text -ForegroundColor Cyan
    Write-Host "============================================================" -ForegroundColor DarkGray
}

function Test-Port($Port) {
    try {
        $client = New-Object System.Net.Sockets.TcpClient
        $result = $client.BeginConnect("127.0.0.1", $Port, $null, $null)
        $ok = $result.AsyncWaitHandle.WaitOne(500)

        if ($ok) {
            $client.EndConnect($result)
            $client.Close()
            return $true
        }

        $client.Close()
        return $false
    }
    catch {
        return $false
    }
}

Header "FATHER MORNING BOOT"

Write-Host "Root:   $Root"
Write-Host "Python: $(python --version 2>&1)"

Header "1. GIT"

git branch --show-current
git status --short

Header "2. GPU"

if (Get-Command nvidia-smi -ErrorAction SilentlyContinue) {
    nvidia-smi `
        --query-gpu=name,memory.total,memory.used,driver_version `
        --format=csv,noheader
}
else {
    Write-Host "NVIDIA-SMI NOT FOUND" -ForegroundColor Red
}

Header "3. OLLAMA"

if (Test-Port 11434) {
    Write-Host "Ollama already running :11434" -ForegroundColor Green
}
else {
    if (Get-Command ollama -ErrorAction SilentlyContinue) {

        Write-Host "Starting Ollama..." -ForegroundColor Yellow

        Start-Process `
            -FilePath "ollama" `
            -ArgumentList "serve" `
            -WindowStyle Hidden

        Start-Sleep -Seconds 3

        if (Test-Port 11434) {
            Write-Host "Ollama READY" -ForegroundColor Green
        }
        else {
            Write-Host "Ollama FAILED TO START" -ForegroundColor Red
        }
    }
    else {
        Write-Host "Ollama executable not found." -ForegroundColor Red
    }
}

Header "4. OLLAMA MODELS"

if (Test-Port 11434) {
    try {
        $tags = Invoke-RestMethod `
            -Uri "http://127.0.0.1:11434/api/tags" `
            -TimeoutSec 5

        if ($tags.models) {
            $tags.models |
                Select-Object name, size, modified_at |
                Format-Table -AutoSize
        }
        else {
            Write-Host "No Ollama models registered."
        }
    }
    catch {
        Write-Host "Ollama API error: $_" -ForegroundColor Red
    }
}

Header "5. COMFYUI"

if (Test-Port 8188) {
    Write-Host "ComfyUI READY :8188" -ForegroundColor Green
}
else {
    Write-Host "ComfyUI STOPPED :8188" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "We will start it after locating its real installation."
}

Header "6. VOICE MODULES"

python -m father.runtime.core.voice_check

Header "7. FATHER RUNTIME"

if (Test-Path ".\FATHER_STATUS.ps1") {
    .\FATHER_STATUS.ps1
}
else {
    Write-Host "FATHER_STATUS.ps1 not found." -ForegroundColor Red
}

Header "8. MODEL ZOO DISCOVERY"

if (Test-Path ".\src\father\runtime\core\discovery.py") {

    python -m father.runtime.core.discovery

}
else {

    Write-Host "discovery.py not created yet." -ForegroundColor Yellow
}

Header "9. PORT SUMMARY"

$ports = @{
    "FATHER API" = 8010
    "Ollama"     = 11434
    "ComfyUI"    = 8188
}

foreach ($item in $ports.GetEnumerator()) {

    $state = if (Test-Port $item.Value) {
        "READY"
    }
    else {
        "STOPPED"
    }

    Write-Host ("{0,-18} :{1,-6} {2}" -f $item.Key, $item.Value, $state)
}

Header "FATHER MORNING CHECK COMPLETE"

