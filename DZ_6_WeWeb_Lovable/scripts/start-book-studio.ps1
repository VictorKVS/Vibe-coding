$ErrorActionPreference = "Stop"

$ProjectRoot = Split-Path -Parent $PSScriptRoot
$LlamaServer = "C:\Users\1\.docker\bin\inference\llama-server.exe"
$ModelPath = "C:\Users\1\.lmstudio\models\bartowski\ai-sage_GigaChat3-10B-A1.8B-GGUF\ai-sage_GigaChat3-10B-A1.8B-Q4_K_S.gguf"
$LlmHealth = "http://127.0.0.1:1234/health"
$LlmCompletion = "http://127.0.0.1:1234/v1/chat/completions"
$AppUrl = "http://127.0.0.1:5173"
$script:ChecksPassed = 0

function Write-Check([string]$Label, [string]$Detail = "") {
    $script:ChecksPassed++
    $suffix = if ($Detail) { " — $Detail" } else { "" }
    Write-Host "  [OK] $Label$suffix" -ForegroundColor Green
}

function Stop-Preflight([string]$Problem, [string]$Fix) {
    Write-Host ""
    Write-Host "  [ОШИБКА] $Problem" -ForegroundColor Red
    Write-Host "  Что сделать: $Fix" -ForegroundColor Yellow
    throw "Предстартовая диагностика не пройдена."
}

function Test-Url([string]$Url, [int]$TimeoutSec = 2) {
    try {
        Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec $TimeoutSec | Out-Null
        return $true
    } catch {
        return $false
    }
}

function Test-TcpPort([int]$Port) {
    try {
        $client = New-Object System.Net.Sockets.TcpClient
        $result = $client.BeginConnect("127.0.0.1", $Port, $null, $null)
        $connected = $result.AsyncWaitHandle.WaitOne(700, $false) -and $client.Connected
        $client.Close()
        return $connected
    } catch {
        return $false
    }
}

function Test-LlmAnswer {
    try {
        $body = @{
            model = "gigachat-local"
            messages = @(@{ role = "user"; content = "Ответь только словом: ГОТОВО" })
            temperature = 0
            max_tokens = 12
            stream = $false
        } | ConvertTo-Json -Depth 5
        $response = Invoke-RestMethod -Uri $LlmCompletion -Method Post -ContentType "application/json" -Body $body -TimeoutSec 45
        $content = $response.choices[0].message.content
        return -not [string]::IsNullOrWhiteSpace($content)
    } catch {
        return $false
    }
}

Clear-Host
Write-Host "===============================================" -ForegroundColor DarkMagenta
Write-Host " BOOK.CRAFT — ПРОВЕРКА ГОТОВНОСТИ К ДЕМОНСТРАЦИИ" -ForegroundColor Magenta
Write-Host "===============================================" -ForegroundColor DarkMagenta

Write-Host "`n[1/6] Проверяю окружение..." -ForegroundColor Cyan
if (-not (Test-Path $LlamaServer)) {
    Stop-Preflight "Не найден llama-server.exe" "Проверьте путь: $LlamaServer"
}
Write-Check "llama-server.exe найден"

if (-not (Test-Path $ModelPath)) {
    Stop-Preflight "Не найдена локальная модель GigaChat" "Проверьте путь: $ModelPath"
}
$modelSizeGb = [math]::Round((Get-Item $ModelPath).Length / 1GB, 1)
Write-Check "Модель GigaChat найдена" "$modelSizeGb ГБ"

if (-not (Get-Command node.exe -ErrorAction SilentlyContinue)) {
    Stop-Preflight "Node.js не найден в PATH" "Установите Node.js LTS и заново откройте PowerShell."
}
if (-not (Get-Command npm.cmd -ErrorAction SilentlyContinue)) {
    Stop-Preflight "npm не найден в PATH" "Переустановите Node.js LTS с npm."
}
$nodeVersion = (& node.exe --version).Trim()
Write-Check "Node.js и npm доступны" $nodeVersion

Set-Location $ProjectRoot

Write-Host "`n[2/6] Проверяю зависимости..." -ForegroundColor Cyan
if (-not (Test-Path (Join-Path $ProjectRoot "node_modules"))) {
    Write-Host "  Первый запуск: устанавливаю зависимости..." -ForegroundColor Yellow
    & npm.cmd install --no-audit --no-fund
    if ($LASTEXITCODE -ne 0) {
        Stop-Preflight "npm install завершился ошибкой" "Проверьте интернет и повторите запуск."
    }
}
Write-Check "Зависимости интерфейса установлены"

Write-Host "`n[3/6] Запускаю приёмочные тесты M0→M1..." -ForegroundColor Cyan
& npm.cmd test
if ($LASTEXITCODE -ne 0) {
    Stop-Preflight "MIN/MED/MAX тесты не прошли" "Не записывайте видео; сохраните вывод этого окна."
}
Write-Check "MIN / MED / MAX — зелёные"

Write-Host "`n[4/6] Проверяю локальный GigaChat..." -ForegroundColor Cyan
if (-not (Test-Url $LlmHealth)) {
    if (Test-TcpPort 1234) {
        Stop-Preflight "Порт 1234 занят другой программой" "Закройте программу на порту 1234 и повторите запуск."
    }
    Write-Host "  Запускаю llama-server; первый старт может занять до 90 секунд..." -ForegroundColor Yellow
    $arguments = @(
        "-m", ('"' + $ModelPath + '"'),
        "--host", "127.0.0.1",
        "--port", "1234",
        "-ngl", "99",
        "-c", "8192",
        "--no-jinja",
        "--chat-template", "chatml"
    )
    Start-Process -FilePath $LlamaServer -ArgumentList $arguments -WorkingDirectory (Split-Path $LlamaServer)

    $ready = $false
    for ($attempt = 1; $attempt -le 90; $attempt++) {
        Start-Sleep -Seconds 1
        if (Test-Url $LlmHealth) {
            $ready = $true
            break
        }
    }
    if (-not $ready) {
        Stop-Preflight "GigaChat не запустился за 90 секунд" "Проверьте окно llama-server и наличие свободной видеопамяти."
    }
}
Write-Check "Сервер модели отвечает" "127.0.0.1:1234"

if (-not (Test-LlmAnswer)) {
    Stop-Preflight "Сервер запущен, но модель не генерирует ответ" "Проверьте окно llama-server; затем перезапустите BOOK.CRAFT."
}
Write-Check "Контрольная генерация GigaChat успешна"

Write-Host "`n[5/6] Запускаю интерфейс..." -ForegroundColor Cyan
if (-not (Test-Url $AppUrl)) {
    if (Test-TcpPort 5173) {
        Stop-Preflight "Порт 5173 занят другой программой" "Закройте старый Vite/Node-процесс и повторите запуск."
    }
    Start-Process -FilePath "npm.cmd" -ArgumentList @("run", "dev") -WorkingDirectory $ProjectRoot
    for ($attempt = 1; $attempt -le 45; $attempt++) {
        Start-Sleep -Seconds 1
        if (Test-Url $AppUrl) { break }
    }
}
if (-not (Test-Url $AppUrl)) {
    Stop-Preflight "Интерфейс не запустился" "Проверьте окно npm/Vite и повторите запуск."
}
Write-Check "Интерфейс отвечает" $AppUrl

Write-Host "`n[6/6] BOOK.CRAFT ГОТОВ К ДЕМОНСТРАЦИИ" -ForegroundColor Green
Write-Host "  Успешных проверок: $script:ChecksPassed" -ForegroundColor Green
Write-Host "  В приложении: Сценарий книги → Загрузить демо → Отправить" -ForegroundColor White
Write-Host "  Не закрывайте окна llama-server и Vite во время записи." -ForegroundColor DarkGray
Start-Process $AppUrl
