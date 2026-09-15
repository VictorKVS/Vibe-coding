$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot

Write-Host '============================================================'
Write-Host 'FATHER Operator Console launcher'
Write-Host '============================================================'

$nodeVersion = (& node --version).Trim()
Write-Host "Node: $nodeVersion"

$major = 0
if ($nodeVersion -match '^v(\d+)\.') {
    $major = [int]$Matches[1]
}

if ($major -ne 22) {
    Write-Warning "Project CI baseline is Node 22.13.1; current runtime is $nodeVersion. Prototype startup will continue."
}

$missing = @()
if (-not (Test-Path '.\node_modules\@openai\sites-vite-plugin')) {
    $missing += '@openai/sites-vite-plugin@0.2.0'
}
if (-not (Test-Path '.\node_modules\@tailwindcss\postcss')) {
    $missing += '@tailwindcss/postcss@4.2.1'
}

if ($missing.Count -gt 0) {
    Write-Host '[SETUP] Installing local build-only dependencies (no-save)...'
    & npm install --no-save @openai/sites-vite-plugin@0.2.0 @tailwindcss/postcss@4.2.1
    if ($LASTEXITCODE -ne 0) {
        throw 'Build-only dependency installation failed.'
    }
} else {
    Write-Host '[SETUP] Build-only dependencies are already installed.'
}

Write-Host '[START] Starting Vinext development server...'
Write-Host '[OPEN] Open /operator-console on the URL printed below.'
& npm run dev
exit $LASTEXITCODE
