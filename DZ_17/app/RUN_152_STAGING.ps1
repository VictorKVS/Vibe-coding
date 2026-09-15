$ErrorActionPreference = 'Stop'

Write-Host '[FATHER] Building 152-FZ staging package from recommended source...'

$comparison = Join-Path $PSScriptRoot '..\database_snapshots\staging\152-fz\source-comparison.json'
if (-not (Test-Path $comparison)) {
  throw "source-comparison.json not found: $comparison. Run RUN_152_SOURCE_COMPARE.ps1 first."
}

$report = Get-Content -Raw -Encoding UTF8 $comparison | ConvertFrom-Json
if (-not $report.recommended_candidate) {
  throw 'No recommended_candidate found in source-comparison.json.'
}

$source = [string]$report.recommended_candidate.path
if (-not (Test-Path -LiteralPath $source)) {
  throw "Recommended source file not found: $source"
}

Write-Host "[FATHER] Source: $source"
Write-Host "[FATHER] Source SHA-256: $($report.recommended_candidate.source_sha256)"

$script = Join-Path $PSScriptRoot 'scripts\build_152_staging.py'
$out = Join-Path $PSScriptRoot '..\database_snapshots\staging\152-fz'

python $script `
  --input $source `
  --output-dir $out `
  --as-of '2026-09-14'

if ($LASTEXITCODE -ne 0) {
  throw "build_152_staging.py failed with exit code $LASTEXITCODE"
}

$staging = Join-Path $out '152-fz.staging.json'
if (-not (Test-Path $staging)) {
  throw "Staging report was not created: $staging"
}

$stagingReport = Get-Content -Raw -Encoding UTF8 $staging | ConvertFrom-Json

Write-Host '[FATHER] Staging acceptance:'
$stagingReport.acceptance | Format-List
Write-Host "[FATHER] Future change notes: $($stagingReport.future_change_notes_count)"
Write-Host "[FATHER] Canonical chars: $($stagingReport.canonical_chars)"
Write-Host "[FATHER] Articles: $($stagingReport.articles_count)"
Write-Host "[FATHER] Canonical SHA-256: $($stagingReport.canonical_sha256)"
Write-Host "[FATHER] Database write: $($stagingReport.database_write)"
Write-Host "[FATHER] Report: $staging"

if (-not $stagingReport.acceptance.ready_for_db_review) {
  throw 'Staging acceptance failed. No DB write was performed.'
}

Write-Host '[FATHER] STAGING READY FOR DB REVIEW. No DB write was performed.'
