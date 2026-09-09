$ErrorActionPreference = 'Stop'
$root = $PSScriptRoot
$runtime = Join-Path $root '.runtime'
New-Item -ItemType Directory -Path $runtime -Force | Out-Null
Write-Host 'Create a NEW bot in Telegram @BotFather using /newbot.'
Write-Host 'The token is saved locally only. Do not send it to chats or GitHub.'
$secureToken = Read-Host 'Paste bot token (hidden)' -AsSecureString
$token = [System.Net.NetworkCredential]::new('', $secureToken).Password
if ($token -notmatch '^\d+:[A-Za-z0-9_-]+$') { throw 'Invalid token format.' }
$api = 'https://api.telegram.org/bot' + $token
try { $identity = Invoke-RestMethod -Uri ($api + '/getMe') } catch { throw 'Cannot validate Telegram token. Check the token and network.' }
Write-Host ('Bot: @' + $identity.result.username)
Write-Host 'Open this bot in Telegram and send /start. Then press Enter.'
Read-Host | Out-Null
try { $updates = Invoke-RestMethod -Uri ($api + '/getUpdates') } catch { throw 'Cannot get updates. Use a separate bot without a webhook.' }
$chats = @($updates.result | Where-Object { $_.message.chat.type -eq 'private' } | ForEach-Object { $_.message.chat.id } | Select-Object -Unique)
if ($chats.Count -eq 0) { throw 'No private chat found. Send /start to the bot and run setup again.' }
Write-Host ('Private chat IDs seen by this bot: ' + ($chats -join ', '))
$chatId = Read-Host 'Enter YOUR chat ID from the list above'
if ($chatId -notin ($chats | ForEach-Object { [string]$_ })) { throw 'Select one of the listed private chat IDs.' }
$decoderPython = 'G:\1\Прежде\1_izobraznie\AI\ComfyUI\python_embeded\python.exe'
if (!(Test-Path -LiteralPath $decoderPython)) { $decoderPython = Read-Host 'Python path (numpy and soundfile required)' }
& $decoderPython -c 'import numpy, soundfile' 2>$null
if ($LASTEXITCODE -ne 0) { throw 'Python must have numpy and soundfile installed.' }
@{token=$token;chatId=$chatId;python=$decoderPython} | ConvertTo-Json | Set-Content -LiteralPath (Join-Path $runtime 'telegram.json') -Encoding UTF8
$token = $null
Write-Host 'Saved. Restart START_VOICE_CRM.cmd. Only the selected chat will be processed.'
