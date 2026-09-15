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

# Windows text mode can expand LF inside dollar-quoted legal text to CRLF.
# Normalize the generated SQL bytes to UTF-8 without BOM + LF-only so the
# byte-level SHA of canonical_text and every article survives PostgreSQL import.
$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
$sqlText = [System.IO.File]::ReadAllText($output, [System.Text.Encoding]::UTF8)
$sqlText = $sqlText.Replace("`r`n", "`n").Replace("`r", "`n")
[System.IO.File]::WriteAllText($output, $sqlText, $utf8NoBom)

$remainingCr = ([System.IO.File]::ReadAllText($output, [System.Text.Encoding]::UTF8).ToCharArray() | Where-Object { [int]$_ -eq 13 }).Count
if ($remainingCr -ne 0) { throw "Generated SQL still contains CR characters: $remainingCr" }

$hash = (Get-FileHash -Algorithm SHA256 $output).Hash.ToLowerInvariant()
$size = (Get-Item $output).Length

Write-Host ''
Write-Host '[FATHER] DB import package prepared.'
Write-Host "[FATHER] SQL: $output"
Write-Host "[FATHER] SQL bytes: $size"
Write-Host "[FATHER] SQL SHA-256: $hash"
Write-Host '[FATHER] SQL line endings: LF-only'
Write-Host '[FATHER] Database write: False'
Write-Host '[FATHER] Next gate: RUN_152_DB_APPLY.ps1 performs backup + transaction + acceptance.'
