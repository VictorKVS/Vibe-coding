param(
  [string]$Pattern = '*Getting_to_Yes*.pdf',
  [string]$Language = 'en',
  [string]$SourceType = 'book',
  [string]$Base = 'http://localhost:3000'
)

$ErrorActionPreference = 'Stop'
$AppDir = Split-Path -Parent $PSScriptRoot
$Downloads = Join-Path $env:USERPROFILE 'Downloads'

if (-not (Test-Path $Downloads)) { throw "Downloads folder not found: $Downloads" }
$matches = @(Get-ChildItem -LiteralPath $Downloads -File -Filter $Pattern -ErrorAction SilentlyContinue | Sort-Object LastWriteTime -Descending)
if (-not $matches.Count) {
  Write-Host "[ALINA KF] PDF not found by pattern: $Pattern" -ForegroundColor Red
  Get-ChildItem -LiteralPath $Downloads -File -Filter '*.pdf' -ErrorAction SilentlyContinue |
    Where-Object { $_.Name -match 'Getting|Yes|Negotiat|Fisher' } |
    Select-Object Name,FullName,LastWriteTime |
    Format-Table -AutoSize
  exit 2
}
$pdf = $matches[0]
Write-Host "[ALINA KF] Selected PDF: $($pdf.FullName)" -ForegroundColor Cyan

$py = Get-Command python.exe -ErrorAction SilentlyContinue
if (-not $py) { $py = Get-Command python -ErrorAction SilentlyContinue }
if (-not $py) { throw 'Python was not found in PATH.' }

& $py.Source -c "import pypdf" 2>$null
if ($LASTEXITCODE -ne 0) {
  Write-Host '[ALINA KF] Installing pypdf...' -ForegroundColor Yellow
  & $py.Source -m pip install --user pypdf
  if ($LASTEXITCODE -ne 0) { throw 'Could not install pypdf.' }
}

Set-Location $AppDir
& node (Join-Path $PSScriptRoot 'ingest-pdf-kf.mjs') `
  --input $pdf.FullName `
  --language $Language `
  --source-type $SourceType `
  --base $Base `
  --python $py.Source

exit $LASTEXITCODE
