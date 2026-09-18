$ErrorActionPreference = 'Stop'

$probe = Resolve-Path (Join-Path $PSScriptRoot '..\postgres\father_normative_152_line_endings_probe.sql')
$hostName = if ($env:PGHOST) { $env:PGHOST } else { 'localhost' }
$port = if ($env:PGPORT) { $env:PGPORT } else { '5432' }
$user = if ($env:PGUSER) { $env:PGUSER } else { 'postgres' }
$db = 'osint_kb'

Write-Host '[FATHER] 152-FZ line-ending probe (READ ONLY)'
Write-Host '[FATHER] Expected if diagnosis is correct:'
Write-Host '[FATHER] canonical normalized_matches_expected = true'
Write-Host '[FATHER] article raw_mismatches = 30'
Write-Host '[FATHER] article normalized_mismatches = 0'
Write-Host ''

psql -X -v ON_ERROR_STOP=1 -h $hostName -p $port -U $user -d $db -f $probe
if ($LASTEXITCODE -ne 0) {
  throw "152 line-ending probe failed with exit code $LASTEXITCODE"
}

Write-Host ''
Write-Host '[FATHER] Probe completed. No database write was performed.'
