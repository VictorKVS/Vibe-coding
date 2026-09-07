[CmdletBinding()]
param()

$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$LmStudioExe = Join-Path $env:LOCALAPPDATA "Programs\LM Studio\LM Studio.exe"
$LmsCandidates = @(
    (Join-Path $env:USERPROFILE ".lmstudio\bin\lms.exe"),
    (Join-Path $env:LOCALAPPDATA "Programs\LM Studio\resources\app\.webpack\lms.exe")
)
$LmsExe = $LmsCandidates | Where-Object { Test-Path -LiteralPath $_ } | Select-Object -First 1

function Test-Http([string]$Url, [int]$TimeoutSec = 2) {
    try {
        $response = Invoke-WebRequest -UseBasicParsing -Uri $Url -TimeoutSec $TimeoutSec
        return $response.StatusCode -ge 200 -and $response.StatusCode -lt 300
    } catch { return $false }
}

function Wait-Http([string]$Url, [int]$Seconds) {
    $deadline = (Get-Date).AddSeconds($Seconds)
    do {
        if (Test-Http $Url) { return $true }
        Start-Sleep -Milliseconds 500
    } while ((Get-Date) -lt $deadline)
    return $false
}

function Find-ComfyRoot {
    $candidates = @()
    if ($env:BOOKCRAFT_COMFYUI_ROOT) { $candidates += $env:BOOKCRAFT_COMFYUI_ROOT }
    $candidates += @(
        "G:\1\ComfyUI",
        "G:\1\ComfyUI_windows_portable\ComfyUI",
        (Join-Path $env:USERPROFILE "ComfyUI"),
        (Join-Path $env:USERPROFILE "ComfyUI_windows_portable\ComfyUI"),
        (Join-Path $env:LOCALAPPDATA "Programs\ComfyUI\resources\ComfyUI")
    )
    foreach ($candidate in $candidates) {
        if ($candidate -and (Test-Path -LiteralPath (Join-Path $candidate "main.py"))) { return $candidate }
    }
    return $null
}

Write-Host "BOOK.CRAFT ONE CLICK" -ForegroundColor Cyan
Write-Host "===================="

# LM Studio UI is only a host process here; the user does not need to interact with it.
if (-not (Test-Http "http://127.0.0.1:1234/v1/models")) {
    if (-not (Get-Process -Name "LM Studio" -ErrorAction SilentlyContinue)) {
        if (-not (Test-Path -LiteralPath $LmStudioExe)) {
            throw "LM Studio не найден: $LmStudioExe"
        }
        Write-Host "START  LM Studio host" -ForegroundColor Cyan
        Start-Process -FilePath $LmStudioExe -WindowStyle Minimized | Out-Null
        Start-Sleep -Seconds 4
    }

    if (-not $LmsExe) {
        $LmsExe = $LmsCandidates | Where-Object { Test-Path -LiteralPath $_ } | Select-Object -First 1
    }
    if (-not $LmsExe) {
        throw "LM Studio CLI (lms.exe) не найден. Один раз полностью запустите LM Studio после установки."
    }

    Write-Host "START  LM Studio API :1234" -ForegroundColor Cyan
    & ([string]$LmsExe) server start --port 1234 | Out-Host
    if (-not (Wait-Http "http://127.0.0.1:1234/v1/models" 30)) {
        throw "LM Studio API не поднялся на порту 1234."
    }
}
Write-Host "READY  LM Studio API :1234" -ForegroundColor Green

# Image backend: auto-start it too when ComfyUI is installed in a known location.
if (-not (Test-Http "http://127.0.0.1:8188/system_stats")) {
    $ComfyRoot = Find-ComfyRoot
    if ($ComfyRoot) {
        $ComfyMain = Join-Path $ComfyRoot "main.py"
        $PortableRoot = Split-Path $ComfyRoot -Parent
        $EmbeddedCandidates = @(
            (Join-Path $PortableRoot "python_embeded\python.exe"),
            (Join-Path $PortableRoot "python_embedded\python.exe")
        )
        $ComfyPython = $EmbeddedCandidates | Where-Object { Test-Path -LiteralPath $_ } | Select-Object -First 1
        if (-not $ComfyPython) {
            $Candidate = Get-Command python.exe -ErrorAction SilentlyContinue
            if ($Candidate) { $ComfyPython = $Candidate.Source }
        }
        if ($ComfyPython) {
            Write-Host "START  ComfyUI :8188  [$ComfyRoot]" -ForegroundColor Cyan
            Start-Process -FilePath ([string]$ComfyPython) -ArgumentList @($ComfyMain, "--listen", "127.0.0.1", "--port", "8188") -WorkingDirectory $ComfyRoot -WindowStyle Minimized | Out-Null
            [void](Wait-Http "http://127.0.0.1:8188/system_stats" 45)
        }
    }
}
if (Test-Http "http://127.0.0.1:8188/system_stats") {
    Write-Host "READY  ComfyUI :8188" -ForegroundColor Green
} else {
    Write-Host "OPTIONAL  ComfyUI не найден; текст и голос работают, картинки пока нет." -ForegroundColor Yellow
}

Set-Location -LiteralPath $ProjectRoot
& (Join-Path $ProjectRoot "START_BOOKCRAFT_MEDIA.ps1")
