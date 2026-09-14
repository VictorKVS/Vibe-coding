$ErrorActionPreference = 'Stop'

Write-Host '[FATHER] Preparing deterministic 152-FZ DB import SQL...'

$script = Join-Path $PSScriptRoot 'scripts\prepare_152_db_import.py'
$staging = Join-Path $PSScriptRoot '..\database_snapshots\staging\152-fz\152-fz.staging.json'
$canonical = Join-Path $PSScriptRoot '..\database_snapshots\staging\152-fz\152-fz.canonical.txt'
$output = Join-Path $PSScriptRoot '..\database_snapshots\staging\152-fz\152-fz.import.sql'

if (-not (Test-Path $staging)) { throw "Missing staging report: $staging" }
if (-not (Test-Path $canonical)) { throw "Missing canonical text: $canonical" }

python $script --staging $staging --canonical $canonical --output $output
if ($LASTEXITCODE -ne 0) {
  throw "prepare_152_db_import.py failed with exit code $LASTEXITCODE"
}

if (-not (Test-Path $output)) { throw "Import SQL was not created: $output" }

$hash = (Get-FileHash -Algorithm SHA256 $output).Hash.ToLowerInvariant()
$size = (Get-Item $output).Length

Write-Host ''
Write-Host '[FATHER] DB import package prepared.'
Write-Host "[FATHER] SQL: $output"
Write-Host "[FATHER] SQL bytes: $size"
Write-Host "[FATHER] SQL SHA-256: $hash"
Write-Host '[FATHER] Database write: False'
Write-Host '[FATHER] Next gate: RUN_152_DB_APPLY.ps1 performs backup + transaction + acceptance.'
