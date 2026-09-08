$ErrorActionPreference = 'Stop'
try {
    $health = Invoke-RestMethod -Uri 'http://127.0.0.1:8019/health' -TimeoutSec 2
    if ($health.ready) { Write-Host 'Whisper is ready.'; exit 0 }
} catch {}
$candidates = @(
    (Join-Path $PSScriptRoot '..\DZ_8_BOOKCRAFT_Media\scripts\start-recorder-stt.ps1'),
    'G:\1\Vibe coding\BOOKCRAFT-STT-OLD\DZ_8_BOOKCRAFT_Media\scripts\start-recorder-stt.ps1'
)
$starter = $candidates | Where-Object { Test-Path -LiteralPath $_ } | Select-Object -First 1
if (!$starter) { Write-Error 'Whisper launcher not found. Start recorder STT on port 8019 first.'; exit 1 }
& powershell -NoProfile -ExecutionPolicy Bypass -File $starter
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
