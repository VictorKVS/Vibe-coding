[CmdletBinding()]
param(
    [string]$Branch = "codex/bookcraft-media-automation",
    [switch]$SkipPush
)

$ErrorActionPreference = "Stop"
$RepoRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = Join-Path $RepoRoot "DZ_8_BOOKCRAFT_Media"
$AllowedPaths = @(
    ".github/workflows/bookcraft-media.yml",
    "PUBLISH_BOOKCRAFT.ps1",
    "DZ_8_BOOKCRAFT_Media/.gitignore",
    "DZ_8_BOOKCRAFT_Media/README.md",
    "DZ_8_BOOKCRAFT_Media/START_BOOKCRAFT_MEDIA.ps1",
    "DZ_8_BOOKCRAFT_Media/src/App.jsx",
    "DZ_8_BOOKCRAFT_Media/src/styles.css",
    "DZ_8_BOOKCRAFT_Media/tests/test_media_contract.py"
)

Set-Location -LiteralPath $RepoRoot

Write-Host "1/5 Проверка контрактов и интерфейса" -ForegroundColor Cyan
& npm.cmd --prefix $ProjectRoot test
if ($LASTEXITCODE -ne 0) { throw "Frontend tests failed." }

Write-Host "2/5 Production build" -ForegroundColor Cyan
& npm.cmd --prefix $ProjectRoot run build
if ($LASTEXITCODE -ne 0) { throw "Frontend build failed." }

Write-Host "3/5 Проверка diff" -ForegroundColor Cyan
& git diff --check -- @AllowedPaths
if ($LASTEXITCODE -ne 0) { throw "git diff --check failed." }

$forbidden = Get-ChildItem -LiteralPath $ProjectRoot -Recurse -File -ErrorAction SilentlyContinue |
    Where-Object {
        $_.FullName -notmatch "\\node_modules\\|\\dist\\|\\.venv|\\.runtime\\" -and
        $_.Name -notlike "*.example" -and
        $_.Extension -match "^\.(py|js|jsx|json|ya?ml|ps1|md)$"
    } |
    Select-String -Pattern '(?i)(api[_-]?key|access[_-]?token|password)\s*[:=]\s*["''][^"'']{8,}'
if ($forbidden) {
    $forbidden | Select-Object Path, LineNumber, Line | Format-Table -AutoSize
    throw "Possible hard-coded secret found. Nothing was committed."
}

Write-Host "4/5 Создание отдельной ветки и коммита" -ForegroundColor Cyan
& git switch -C $Branch
if ($LASTEXITCODE -ne 0) { throw "Cannot create branch $Branch." }
& git add -- @AllowedPaths
if ($LASTEXITCODE -ne 0) { throw "Cannot stage BOOK.CRAFT files." }

$staged = & git diff --cached --name-only
$unexpected = @($staged | Where-Object { $_ -notin $AllowedPaths })
if ($unexpected.Count) {
    & git restore --staged -- @unexpected
    throw "Unexpected staged paths were removed: $($unexpected -join ', ')"
}

& git diff --cached --quiet
if ($LASTEXITCODE -eq 0) {
    Write-Host "Нет новых изменений для коммита." -ForegroundColor Yellow
} else {
    & git commit -m "feat: automate BOOK CRAFT media studio"
    if ($LASTEXITCODE -ne 0) { throw "Commit failed." }
}

if ($SkipPush) {
    Write-Host "5/5 Push пропущен по параметру -SkipPush." -ForegroundColor Yellow
    exit 0
}

Write-Host "5/5 Отправка в GitHub" -ForegroundColor Cyan
& git push --set-upstream origin $Branch
if ($LASTEXITCODE -ne 0) { throw "Push failed. Run 'gh auth login' or configure Git Credential Manager, then repeat." }

Write-Host "Готово: $Branch опубликована. GitHub Actions запустится автоматически." -ForegroundColor Green
