$ErrorActionPreference = 'Stop'

Write-Host '============================================================'
Write-Host 'FATHER - Пульт решений оператора'
Write-Host '============================================================'

$nodeVersion = (& node --version).Trim()
Write-Host "Версия Node: $nodeVersion"

$major = 0
if ($nodeVersion -match '^v(\d+)\.') { $major = [int]$Matches[1] }
if ($major -ne 22) {
  Write-Warning "Базовая версия проекта в CI - Node 22.13.1; сейчас используется $nodeVersion. Для прототипа продолжаем запуск, но при ошибке переключимся на Node 22.13.1."
}

$missing = @()
if (-not (Test-Path '.\node_modules\@openai\sites-vite-plugin')) {
  $missing += '@openai/sites-vite-plugin@0.2.0'
}
if (-not (Test-Path '.\node_modules\@tailwindcss\postcss')) {
  $missing += '@tailwindcss/postcss@4.2.1'
}

if ($missing.Count -gt 0) {
  Write-Host '[ПОДГОТОВКА] Устанавливаю локальные зависимости для сборки без изменения package.json...'
  & npm install --no-save @openai/sites-vite-plugin@0.2.0 @tailwindcss/postcss@4.2.1
  if ($LASTEXITCODE -ne 0) { throw 'Не удалось установить зависимости, необходимые для локального запуска.' }
} else {
  Write-Host '[ПОДГОТОВКА] Зависимости для сборки уже установлены.'
}

Write-Host '[ЗАПУСК] Запускаю сервер разработки Vinext...'
Write-Host '[ОТКРЫТЬ] Добавьте /operator-console к адресу, который будет показан ниже.'
& npm run dev
exit $LASTEXITCODE
