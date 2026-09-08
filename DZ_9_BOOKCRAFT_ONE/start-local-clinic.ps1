$ErrorActionPreference='Stop'
$crmRoot=$PSScriptRoot
$runtime=Join-Path $crmRoot '.runtime'
New-Item -ItemType Directory -Path $runtime -Force | Out-Null
& powershell -NoProfile -ExecutionPolicy Bypass -File (Join-Path $crmRoot 'start-voice.ps1')
if($LASTEXITCODE -ne 0){throw 'Speech recognition could not start.'}
$ollamaReady=$false
try{$null=Invoke-RestMethod 'http://127.0.0.1:11434/api/tags' -TimeoutSec 2;$ollamaReady=$true}catch{}
if(!$ollamaReady){
 $ollamaCommand=Get-Command ollama -ErrorAction SilentlyContinue
 $ollamaPath=if($ollamaCommand){$ollamaCommand.Source}else{Join-Path $env:LOCALAPPDATA 'Programs\Ollama\ollama.exe'}
 if(Test-Path -LiteralPath $ollamaPath){Start-Process -FilePath $ollamaPath -ArgumentList 'serve' -WindowStyle Hidden -RedirectStandardOutput (Join-Path $runtime 'ollama.log') -RedirectStandardError (Join-Path $runtime 'ollama-error.log')}
}
$crmReady=$false
try{$null=Invoke-RestMethod 'http://127.0.0.1:5179/api/stt/health' -TimeoutSec 2;$crmReady=$true}catch{}
if(!$crmReady){
 Start-Process -FilePath (Get-Command node).Source -ArgumentList 'server.cjs' -WorkingDirectory $crmRoot -WindowStyle Hidden -RedirectStandardOutput (Join-Path $runtime 'crm.log') -RedirectStandardError (Join-Path $runtime 'crm-error.log')
 for($attempt=0;$attempt -lt 20;$attempt++){Start-Sleep -Milliseconds 300;try{$null=Invoke-RestMethod 'http://127.0.0.1:5179/api/stt/health' -TimeoutSec 1;$crmReady=$true;break}catch{}}
}
if(!$crmReady){throw 'CRM did not start. See local runtime logs.'}
Write-Host 'Local clinic is ready. Speech recognition and Windows voice run on this computer.'
