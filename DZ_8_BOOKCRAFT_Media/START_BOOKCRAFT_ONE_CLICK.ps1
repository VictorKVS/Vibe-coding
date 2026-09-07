[CmdletBinding()]
param()

$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$RuntimeRoot = Join-Path $ProjectRoot ".runtime"
$SttCacheFile = Join-Path $RuntimeRoot "stt-local-runtime.json"
$LmStudioExe = Join-Path $env:LOCALAPPDATA "Programs\LM Studio\LM Studio.exe"
$LmsCandidates = @(
    (Join-Path $env:LOCALAPPDATA "Programs\LM Studio\resources\app\.webpack\lms.exe"),
    (Join-Path $env:USERPROFILE ".lmstudio\bin\lms.exe")
)
$LmsExe = $LmsCandidates | Where-Object { Test-Path -LiteralPath $_ } | Select-Object -First 1

New-Item -ItemType Directory -Force -Path $RuntimeRoot | Out-Null

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

function Get-DotEnvValue([string]$EnvFile, [string]$Name) {
    if (-not $EnvFile -or -not (Test-Path -LiteralPath $EnvFile)) { return $null }
    $escapedName = [regex]::Escape($Name)
    foreach ($line in Get-Content -LiteralPath $EnvFile -ErrorAction SilentlyContinue) {
        if ($line -match "^\s*$escapedName\s*=\s*(.*?)\s*$") {
            $value = [string]$Matches[1]
            if ($value.Length -ge 2) {
                $first = $value.Substring(0, 1)
                $last = $value.Substring($value.Length - 1, 1)
                if (($first -eq '"' -and $last -eq '"') -or ($first -eq "'" -and $last -eq "'")) {
                    $value = $value.Substring(1, $value.Length - 2)
                }
            }
            return [Environment]::ExpandEnvironmentVariables($value)
        }
    }
    return $null
}

function Test-SttFiles([string]$WhisperExe, [string]$WhisperModel) {
    return [bool](
        $WhisperExe -and $WhisperModel -and
        (Test-Path -LiteralPath $WhisperExe -PathType Leaf) -and
        (Test-Path -LiteralPath $WhisperModel -PathType Leaf)
    )
}

function Set-SttRuntime([string]$WhisperExe, [string]$WhisperModel, [string]$Label, [switch]$Persist) {
    if (-not (Test-SttFiles $WhisperExe $WhisperModel)) { return $false }
    $env:WHISPER_CPP_EXE = $WhisperExe
    $env:WHISPER_MODEL_PATH = $WhisperModel
    Write-Host "READY  Local Whisper STT  [$Label]" -ForegroundColor Green
    Write-Host "       EXE   $WhisperExe" -ForegroundColor DarkGray
    Write-Host "       MODEL $WhisperModel" -ForegroundColor DarkGray
    if ($Persist) {
        [ordered]@{
            whisper_cpp_exe = $WhisperExe
            whisper_model_path = $WhisperModel
            discovered_at = (Get-Date).ToUniversalTime().ToString("o")
        } | ConvertTo-Json | Set-Content -LiteralPath $SttCacheFile -Encoding UTF8
    }
    return $true
}

function Import-SttConfig([string]$EnvFile, [string]$Label) {
    $whisperExe = Get-DotEnvValue $EnvFile "WHISPER_CPP_EXE"
    $whisperModel = Get-DotEnvValue $EnvFile "WHISPER_MODEL_PATH"
    return Set-SttRuntime $whisperExe $whisperModel $Label -Persist
}

function Import-CachedSttRuntime {
    if (-not (Test-Path -LiteralPath $SttCacheFile)) { return $false }
    try {
        $cached = Get-Content -LiteralPath $SttCacheFile -Raw | ConvertFrom-Json
        return Set-SttRuntime ([string]$cached.whisper_cpp_exe) ([string]$cached.whisper_model_path) "cached auto-discovery"
    } catch {
        Remove-Item -LiteralPath $SttCacheFile -Force -ErrorAction SilentlyContinue
        return $false
    }
}

function Find-WhisperExecutable([string[]]$SearchRoots) {
    $command = Get-Command whisper-cli.exe -ErrorAction SilentlyContinue
    if ($command -and (Test-Path -LiteralPath $command.Source -PathType Leaf)) { return [string]$command.Source }

    $direct = @(
        "G:\1\whisper.cpp\build\bin\Release\whisper-cli.exe",
        "G:\1\whisper.cpp\build\bin\whisper-cli.exe",
        (Join-Path $env:USERPROFILE "whisper.cpp\build\bin\Release\whisper-cli.exe"),
        (Join-Path $env:USERPROFILE "whisper.cpp\build\bin\whisper-cli.exe"),
        (Join-Path $env:LOCALAPPDATA "whisper.cpp\build\bin\Release\whisper-cli.exe")
    )
    foreach ($candidate in $direct) {
        if ($candidate -and (Test-Path -LiteralPath $candidate -PathType Leaf)) { return $candidate }
    }

    foreach ($root in $SearchRoots | Select-Object -Unique) {
        if (-not $root -or -not (Test-Path -LiteralPath $root -PathType Container)) { continue }
        foreach ($name in @("whisper-cli.exe", "main.exe")) {
            try {
                $found = Get-ChildItem -LiteralPath $root -Filter $name -File -Recurse -ErrorAction SilentlyContinue | Select-Object -First 1
                if ($found) { return [string]$found.FullName }
            } catch {}
        }
    }
    return $null
}

function Get-WhisperModelRank([string]$Name) {
    $lower = $Name.ToLowerInvariant()
    if ($lower -like "*large-v3-turbo*") { return 0 }
    if ($lower -like "*large-v3*") { return 1 }
    if ($lower -like "*large-v2*") { return 2 }
    if ($lower -like "*medium*") { return 3 }
    if ($lower -like "*small*") { return 4 }
    if ($lower -like "*base*") { return 5 }
    if ($lower -like "*tiny*") { return 6 }
    return 20
}

function Find-WhisperModel([string]$WhisperExe, [string[]]$SearchRoots) {
    $modelCandidates = @()

    if ($WhisperExe) {
        $cursor = Split-Path $WhisperExe -Parent
        for ($depth = 0; $depth -lt 6 -and $cursor; $depth += 1) {
            $modelsDir = Join-Path $cursor "models"
            if (Test-Path -LiteralPath $modelsDir -PathType Container) {
                try { $modelCandidates += @(Get-ChildItem -LiteralPath $modelsDir -Filter "ggml-*.bin" -File -ErrorAction SilentlyContinue) } catch {}
            }
            $parent = Split-Path $cursor -Parent
            if (-not $parent -or $parent -eq $cursor) { break }
            $cursor = $parent
        }
    }

    if (-not $modelCandidates.Count) {
        foreach ($root in $SearchRoots | Select-Object -Unique) {
            if (-not $root -or -not (Test-Path -LiteralPath $root -PathType Container)) { continue }
            try {
                $modelCandidates += @(Get-ChildItem -LiteralPath $root -Filter "ggml-*.bin" -File -Recurse -ErrorAction SilentlyContinue)
            } catch {}
        }
    }

    if (-not $modelCandidates.Count) { return $null }
    $ranked = $modelCandidates | Sort-Object @{ Expression = { Get-WhisperModelRank $_.Name } }, @{ Expression = { -$_.Length } }
    return [string]($ranked | Select-Object -First 1).FullName
}

function Resolve-SttConfig {
    if (Test-SttFiles $env:WHISPER_CPP_EXE $env:WHISPER_MODEL_PATH) {
        [void](Set-SttRuntime $env:WHISPER_CPP_EXE $env:WHISPER_MODEL_PATH "process environment")
        return
    }

    $currentEnv = Join-Path $ProjectRoot ".env"
    if (Import-SttConfig $currentEnv "current .env") { return }
    if (Import-CachedSttRuntime) { return }

    # Git worktrees do not copy ignored .env files. Look for a previous BOOK.CRAFT
    # worktree and inherit only WHISPER_CPP_EXE + WHISPER_MODEL_PATH from it.
    $repoRoot = Split-Path $ProjectRoot -Parent
    $workspaceRoot = Split-Path $repoRoot -Parent
    $candidateEnvFiles = @()
    if ($workspaceRoot -and (Test-Path -LiteralPath $workspaceRoot)) {
        foreach ($directory in Get-ChildItem -LiteralPath $workspaceRoot -Directory -ErrorAction SilentlyContinue) {
            if ($directory.FullName -eq $repoRoot) { continue }
            $candidate = Join-Path $directory.FullName "DZ_8_BOOKCRAFT_Media\.env"
            if (Test-Path -LiteralPath $candidate) { $candidateEnvFiles += $candidate }
        }
    }
    foreach ($candidate in $candidateEnvFiles) {
        $label = "previous worktree: $([IO.Path]::GetFileName((Split-Path (Split-Path $candidate -Parent) -Parent)))"
        if (Import-SttConfig $candidate $label) { return }
    }

    Write-Host "SEARCH Local Whisper STT runtime..." -ForegroundColor Cyan
    $searchRoots = @($ProjectRoot, $repoRoot, $workspaceRoot)
    if (Test-Path -LiteralPath "G:\1\whisper.cpp") { $searchRoots += "G:\1\whisper.cpp" }
    if (Test-Path -LiteralPath (Join-Path $env:USERPROFILE "whisper.cpp")) { $searchRoots += (Join-Path $env:USERPROFILE "whisper.cpp") }

    $whisperExe = Find-WhisperExecutable $searchRoots
    if (-not $whisperExe) {
        Write-Host "WAIT   Local Whisper STT: whisper-cli.exe not found." -ForegroundColor Yellow
        Write-Host "       Recorder works, but transcription needs the local whisper.cpp executable." -ForegroundColor DarkGray
        return
    }

    $whisperModel = Find-WhisperModel $whisperExe $searchRoots
    if (-not $whisperModel) {
        Write-Host "WAIT   Local Whisper STT: model ggml-*.bin not found." -ForegroundColor Yellow
        Write-Host "       EXE found: $whisperExe" -ForegroundColor DarkGray
        return
    }

    if (Set-SttRuntime $whisperExe $whisperModel "auto-discovered" -Persist) { return }

    Write-Host "WAIT   Local Whisper STT config not found. Microphone/MP3 transcription is unavailable." -ForegroundColor Yellow
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

# Always replace our own Gateway/UI processes so code updates are picked up.
$Stopper = Join-Path $ProjectRoot "STOP_BOOKCRAFT_MEDIA.ps1"
if (Test-Path -LiteralPath $Stopper) {
    & $Stopper | Out-Host
    Start-Sleep -Seconds 1
}

# Restore or auto-discover the exact local Whisper runtime before launching the backend.
Resolve-SttConfig

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
