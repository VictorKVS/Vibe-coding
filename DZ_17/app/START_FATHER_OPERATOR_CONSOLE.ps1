$ErrorActionPreference = 'Stop'

Write-Host '============================================================'
Write-Host 'FATHER Knowledge Watch - Operator Console launcher'
Write-Host '============================================================'

$nodeVersion = (& node --version).Trim()
Write-Host "Node: $nodeVersion"

$major = 0
if ($nodeVersion -match '^v(\d+)\.') { $major = [int]$Matches[1] }
if ($major -ne 22) {
  Write-Warning "Project CI baseline is Node 22.13.1; current runtime is $nodeVersion. Continuing for prototype smoke only."
}

$missing = @()
if (-not (Test-Path '.\node_modules\@openai\sites-vite-plugin')) {
  $missing += '@openai/sites-vite-plugin@0.2.0'
}
if (-not (Test-Path '.\node_modules\@tailwindcss\postcss')) {
  $missing += '@tailwindcss/postcss@4.2.1'
}

if ($missing.Count -gt 0) {
  Write-Host '[SETUP] Installing build-only local dependencies (no-save)...'
  & npm install --no-save @openai/sites-vite-plugin@0.2.0 @tailwindcss/postcss@4.2.1
  if ($LASTEXITCODE -ne 0) { throw 'npm install for build-only dependencies failed' }
} else {
  Write-Host '[SETUP] Build-only dependencies already present.'
}

Write-Host '[START] Opening Vinext development server...'
Write-Host '[OPEN] Use /operator-console on the URL printed below.'
& npm run dev
exit $LASTEXITCODE
