$ErrorActionPreference = 'Stop'

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot '..\..')
$importSql = Resolve-Path (Join-Path $PSScriptRoot '..\database_snapshots\staging\152-fz\152-fz.import.sql')
$acceptanceSql = Resolve-Path (Join-Path $PSScriptRoot '..\postgres\father_normative_152_v1_acceptance.sql')
$backupDir = Join-Path $PSScriptRoot '..\database_snapshots\backups'
New-Item -ItemType Directory -Force $backupDir | Out-Null

$hostName = if ($env:PGHOST) { $env:PGHOST } else { 'localhost' }
$port = if ($env:PGPORT) { $env:PGPORT } else { '5432' }
$user = if ($env:PGUSER) { $env:PGUSER } else { 'postgres' }
$db = 'osint_kb'
$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$backup = Join-Path $backupDir "osint_kb-before-152-v1-$stamp.dump"

Write-Host '[FATHER] 152-FZ DB APPLY'
Write-Host '[FATHER] This will write one UNVERIFIED document version + root fragment + 30 article fragments.'
Write-Host '[FATHER] The verified-current legal view will remain unchanged.'
Write-Host "[FATHER] Import SQL: $importSql"
Write-Host "[FATHER] Backup: $backup"
Write-Host ''

Write-Host '[FATHER] 1/4 Full database backup...'
pg_dump -h $hostName -p $port -U $user -d $db -Fc -f $backup
if ($LASTEXITCODE -ne 0) { throw "pg_dump failed with exit code $LASTEXITCODE" }
if (-not (Test-Path $backup)) { throw 'Backup file was not created' }
if ((Get-Item $backup).Length -le 0) { throw 'Backup file is empty' }
Write-Host "[FATHER] Backup OK: $((Get-Item $backup).Length) bytes"

Write-Host '[FATHER] 2/4 Applying transactional import...'
psql -X -v ON_ERROR_STOP=1 -h $hostName -p $port -U $user -d $db -f $importSql
if ($LASTEXITCODE -ne 0) { throw "Import failed with exit code $LASTEXITCODE" }

Write-Host '[FATHER] 3/4 Running read-only acceptance...'
psql -X -v ON_ERROR_STOP=1 -h $hostName -p $port -U $user -d $db -f $acceptanceSql
if ($LASTEXITCODE -ne 0) { throw "Acceptance failed with exit code $LASTEXITCODE" }

Write-Host '[FATHER] 4/4 Rebuilding schema inventory...'
npm run db:inventory
if ($LASTEXITCODE -ne 0) { throw "db:inventory failed with exit code $LASTEXITCODE" }

$afterDir = Join-Path $PSScriptRoot '..\database_snapshots\inventory-after-152-v1'
$inventoryDir = Join-Path $PSScriptRoot '..\database_snapshots\inventory'
if (Test-Path $afterDir) { Remove-Item $afterDir -Recurse -Force }
Copy-Item $inventoryDir $afterDir -Recurse -Force

Write-Host ''
Write-Host '[FATHER] 152-FZ candidate import completed.'
Write-Host '[FATHER] Expected state: version_no=1, verification_status=UNVERIFIED, articles=30.'
Write-Host '[FATHER] It MUST NOT be visible in normative.v_current_document_versions yet.'
Write-Host '[FATHER] Next gate: exact comparison with official pravo.gov.ru text before VERIFIED promotion.'
