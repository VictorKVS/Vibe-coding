param(
  [string]$Root = 'G:\1'
)

$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot

$script = Join-Path $PSScriptRoot 'scripts\compare_152_sources.py'
if (-not (Test-Path $script)) {
  throw "compare_152_sources.py not found: $script"
}

Write-Host '[FATHER] Comparing local 152-FZ ODT sources...'
python $script --root $Root
if ($LASTEXITCODE -ne 0) {
  throw "compare_152_sources.py failed with exit code $LASTEXITCODE"
}

$out = Join-Path $PSScriptRoot '..\database_snapshots\staging\152-fz\source-comparison.json'
if (Test-Path $out) {
  Write-Host "[FATHER] Report: $((Resolve-Path $out).Path)"
} else {
  Write-Warning "Comparison completed, but report was not found at: $out"
}
