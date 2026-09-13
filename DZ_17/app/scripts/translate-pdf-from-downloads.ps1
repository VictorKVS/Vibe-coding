param(
  [string]$Pattern = '*Getting_to_Yes*Roger_Fisher*.pdf',
  [string]$Mode = 'reader',
  [string]$Domain = 'negotiation',
  [string]$Selection = 'auto',
  [int]$MaxChunks = 0
)

$ErrorActionPreference = 'Stop'
$AppDir = Split-Path -Parent $PSScriptRoot
$Downloads = Join-Path $env:USERPROFILE 'Downloads'

if (-not (Test-Path $Downloads)) { throw "Downloads folder not found: $Downloads" }

$matches = @(Get-ChildItem -LiteralPath $Downloads -File -Filter $Pattern -ErrorAction SilentlyContinue | Sort-Object LastWriteTime -Descending)
if (-not $matches.Count) {
  Write-Host "[ALINA] PDF not found by pattern: $Pattern" -ForegroundColor Red
  Write-Host "[ALINA] PDFs in Downloads containing 'Getting' or 'Yes':" -ForegroundColor Yellow
  Get-ChildItem -LiteralPath $Downloads -File -Filter '*.pdf' -ErrorAction SilentlyContinue |
    Where-Object { $_.Name -match 'Getting|Yes|Negotiat|Fisher' } |
    Select-Object Name,FullName,Length,LastWriteTime |
    Format-Table -AutoSize
  exit 2
}

if ($matches.Count -gt 1) {
  Write-Host "[ALINA] Multiple PDFs matched; using the newest:" -ForegroundColor Yellow
  $matches | Select-Object Name,FullName,LastWriteTime | Format-Table -AutoSize
}
$pdf = $matches[0]
Write-Host "[ALINA] Selected PDF:" -ForegroundColor Cyan
Write-Host $pdf.FullName

$py = Get-Command python.exe -ErrorAction SilentlyContinue
if (-not $py) { $py = Get-Command python -ErrorAction SilentlyContinue }
if (-not $py) { throw 'Python was not found in PATH.' }

& $py.Source -c "import pypdf" 2>$null
if ($LASTEXITCODE -ne 0) {
  Write-Host "[ALINA] Installing pypdf for local text extraction..." -ForegroundColor Yellow
  & $py.Source -m pip install --user pypdf
  if ($LASTEXITCODE -ne 0) { throw 'Could not install pypdf.' }
}

$nodeArgs = @(
  (Join-Path $PSScriptRoot 'translate-pdf-book.mjs'),
  '--input', $pdf.FullName,
  '--mode', $Mode,
  '--domain', $Domain,
  '--selection', $Selection,
  '--source-language', 'en',
  '--target-language', 'ru',
  '--python', $py.Source
)
if ($MaxChunks -gt 0) { $nodeArgs += @('--max-chunks', [string]$MaxChunks) }

Set-Location $AppDir
& node @nodeArgs
exit $LASTEXITCODE
