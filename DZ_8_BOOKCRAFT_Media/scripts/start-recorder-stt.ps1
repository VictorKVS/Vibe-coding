$ErrorActionPreference = 'Stop'
$recorderRoot = Split-Path -Parent $PSScriptRoot
$recorderRuntime = Join-Path $recorderRoot '.runtime'
$configFile = Join-Path $recorderRuntime 'recorder-stt.json'
if (!(Test-Path -LiteralPath $configFile)) { throw 'Missing .runtime/recorder-stt.json: configure python, executable and model paths.' }
$config = Get-Content -LiteralPath $configFile -Raw | ConvertFrom-Json
foreach ($file in @($config.python, $config.executable, $config.model)) {
    if (!$file -or !(Test-Path -LiteralPath $file)) { throw "STT runtime file missing: $file" }
}
try {
    $health = Invoke-RestMethod 'http://127.0.0.1:8019/health' -TimeoutSec 2
    if ($health.engine -eq 'whisper.cpp' -and $health.ready) { Write-Host 'Recorder STT is ready on 8019'; exit 0 }
} catch {}
$process = Start-Process -FilePath $config.python -ArgumentList @('-m', 'uvicorn', 'backend.recorder_stt:app', '--host', '127.0.0.1', '--port', '8019') -WorkingDirectory $recorderRoot -WindowStyle Hidden -RedirectStandardOutput (Join-Path $recorderRuntime 'recorder-stt.log') -RedirectStandardError (Join-Path $recorderRuntime 'recorder-stt.err.log') -PassThru
for ($attempt = 0; $attempt -lt 20; $attempt++) {
    Start-Sleep -Milliseconds 500
    if ($process.HasExited) { throw 'STT service exited; see .runtime/recorder-stt.err.log' }
    try {
        $health = Invoke-RestMethod 'http://127.0.0.1:8019/health' -TimeoutSec 1
        if ($health.ready) { Write-Host 'Recorder STT is ready on 8019'; exit 0 }
    } catch {}
}
throw 'STT service did not become ready; see .runtime/recorder-stt.err.log'
