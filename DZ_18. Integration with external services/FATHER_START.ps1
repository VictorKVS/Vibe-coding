$ErrorActionPreference = "Stop"

$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $Root

$env:PYTHONPATH = Join-Path $Root "src"

function Test-Port($Port) {
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

Write-Host ""
Write-Host "============================================"
Write-Host "           FATHER RUNTIME START"
Write-Host "============================================"
Write-Host ""

if (-not (Test-Port 11434)) {
    Write-Host "Starting Ollama..."
    Start-Process `
        "ollama" `
        -ArgumentList "serve" `
        -WindowStyle Hidden

    Start-Sleep 3
}

if (Test-Port 8188) {
    Write-Host "ComfyUI        READY" -ForegroundColor Green
}
else {
    Write-Host "ComfyUI        STOPPED" -ForegroundColor Red
}

if (Test-Port 11434) {
    Write-Host "Ollama         READY" -ForegroundColor Green
}
else {
    Write-Host "Ollama         STOPPED" -ForegroundColor Red
}

if (-not (Test-Port 8010)) {

    Write-Host "Starting FATHER API..."

    New-Item `
        -ItemType Directory `
        -Force `
        ".\runtime-data\logs" |
        Out-Null

    $stdout = Join-Path `
        $Root `
        "runtime-data\logs\father-api.out.log"

    $stderr = Join-Path `
        $Root `
        "runtime-data\logs\father-api.err.log"

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
        -RedirectStandardOutput $stdout `
        -RedirectStandardError $stderr `
        -WindowStyle Hidden

    Start-Sleep 3
}

if (Test-Port 8010) {
    Write-Host "FATHER API     READY :8010" -ForegroundColor Green
}
else {
    Write-Host "FATHER API     FAILED" -ForegroundColor Red
    Write-Host ""
    Get-Content `
        ".\runtime-data\logs\father-api.err.log" `
        -ErrorAction SilentlyContinue
}

Write-Host ""
Write-Host "============================================"
Write-Host "             FATHER READY"
Write-Host "============================================"
