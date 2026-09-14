param(
  [Parameter(Mandatory=$true)][string]$Reason,
  [string]$Actor = $env:USERNAME,
  [switch]$Commit,
  [switch]$SkipFullDump
)

$ErrorActionPreference = 'Stop'

function Require-Command([string]$Name) {
  $cmd = Get-Command $Name -ErrorAction SilentlyContinue
  if (-not $cmd) { throw "Required command not found: $Name" }
  return $cmd
}

function Write-Utf8NoBom([string]$Path, [string[]]$Lines) {
  $enc = New-Object System.Text.UTF8Encoding($false)
  [System.IO.File]::WriteAllLines($Path, $Lines, $enc)
}

if (-not $env:DATABASE_URL -and -not $env:POSTGRES_URL) {
  throw 'DATABASE_URL or POSTGRES_URL must be set in the process environment/.env launcher. Do not pass credentials on the command line.'
}
if ([string]::IsNullOrWhiteSpace($Reason) -or $Reason.Trim().Length -lt 3) {
  throw 'Reason must describe the completed DB change/batch.'
}

Require-Command 'psql' | Out-Null
Require-Command 'pg_dump' | Out-Null
Require-Command 'git' | Out-Null

$connection = if ($env:DATABASE_URL) { $env:DATABASE_URL } else { $env:POSTGRES_URL }
# libpq accepts a connection string via PGDATABASE/dbname. This keeps credentials
# out of the pg_dump/psql command line and therefore out of process listings/logs.
$oldPgDatabase = $env:PGDATABASE
$env:PGDATABASE = $connection

$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..\..')).Path
$appRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$snapshotRoot = Join-Path $repoRoot 'DZ_17\database_snapshots'
$currentRoot = Join-Path $snapshotRoot 'current'
$historyPath = Join-Path $snapshotRoot 'SNAPSHOT_HISTORY.jsonl'
$backupRoot = Join-Path $appRoot 'runtime\database-backups'
$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$iso = (Get-Date).ToUniversalTime().ToString('o')
$localDump = Join-Path $backupRoot "$stamp-alina-kf.dump"

New-Item -ItemType Directory -Force -Path $currentRoot | Out-Null
New-Item -ItemType Directory -Force -Path $backupRoot | Out-Null

try {
  Write-Host '[DB SNAPSHOT] checking ALINA schemas...'
  $schemaCheck = & psql -X -qAt -v ON_ERROR_STOP=1 -c "SELECT count(*) FROM pg_namespace WHERE nspname IN ('kf','audit','git_export');"
  if (($schemaCheck | Select-Object -First 1).Trim() -lt 3) {
    throw 'Expected schemas kf/audit/git_export not found. Apply DZ_17/postgres/knowledge_factory_v0.sql first.'
  }

  Write-Host '[DB SNAPSHOT] exporting schema-only ALINA DDL...'
  $schemaPath = Join-Path $currentRoot 'schema.sql'
  & pg_dump --schema-only --no-owner --no-acl --schema=kf --schema=audit --schema=git_export --file=$schemaPath
  if ($LASTEXITCODE -ne 0) { throw "pg_dump schema export failed: $LASTEXITCODE" }

  if (-not $SkipFullDump) {
    Write-Host '[DB SNAPSHOT] creating LOCAL-ONLY full ALINA dump...'
    & pg_dump --format=custom --no-owner --no-acl --schema=kf --schema=audit --file=$localDump
    if ($LASTEXITCODE -ne 0) { throw "pg_dump full backup failed: $LASTEXITCODE" }
  }

  $exports = [ordered]@{
    'sources'             = 'source_id'
    'knowledge_objects'   = 'object_id'
    'knowledge_relations' = 'relation_id'
    'graph_nodes'         = 'node_id'
    'graph_edges'         = 'edge_id'
    'node_weights'        = 'node_id, weight_version'
    'edge_weights'        = 'edge_id, weight_version'
    'reviews'             = 'created_at, review_id'
  }

  $counts = [ordered]@{}
  $hashes = [ordered]@{}

  foreach ($entry in $exports.GetEnumerator()) {
    $name = $entry.Key
    $order = $entry.Value
    $target = Join-Path $currentRoot "$name.jsonl"
    Write-Host "[DB SNAPSHOT] git_export.$name -> $target"
    $query = "SELECT row_to_json(t)::text FROM (SELECT * FROM git_export.$name ORDER BY $order) t;"
    $lines = @(& psql -X -qAt -v ON_ERROR_STOP=1 -c $query)
    if ($LASTEXITCODE -ne 0) { throw "Export failed for git_export.$name" }
    Write-Utf8NoBom $target $lines
    $counts[$name] = $lines.Count
    $hashes[$name] = (Get-FileHash -Algorithm SHA256 $target).Hash.ToLowerInvariant()
  }

  $schemaHash = (Get-FileHash -Algorithm SHA256 $schemaPath).Hash.ToLowerInvariant()
  $dumpHash = $null
  if (-not $SkipFullDump) {
    $dumpHash = (Get-FileHash -Algorithm SHA256 $localDump).Hash.ToLowerInvariant()
  }

  $snapshotId = [guid]::NewGuid().ToString()
  $manifest = [ordered]@{
    schema_version = 'alina-db-git-snapshot-v1'
    snapshot_id = $snapshotId
    created_at = $iso
    actor = $Actor
    reason = $Reason.Trim()
    source = 'PostgreSQL kf/audit/git_export'
    export_policy = 'public AND git_export_allowed only'
    schema_sha256 = $schemaHash
    object_counts = $counts
    export_sha256 = $hashes
    local_full_dump = if ($SkipFullDump) { $null } else { [ordered]@{ git_committed=$false; sha256=$dumpHash; path='runtime/database-backups/<LOCAL_ONLY>' } }
    git_commit_sha = $null
  }

  $manifestPath = Join-Path $currentRoot 'manifest.json'
  $manifestJson = $manifest | ConvertTo-Json -Depth 8
  Write-Utf8NoBom $manifestPath @($manifestJson)
  $historyLine = ($manifest | ConvertTo-Json -Depth 8 -Compress)
  [System.IO.File]::AppendAllText($historyPath, $historyLine + [Environment]::NewLine, (New-Object System.Text.UTF8Encoding($false)))

  # Register snapshot metadata in DB. Escape strings; never insert connection data.
  $reasonSql = $Reason.Trim().Replace("'", "''")
  $actorSql = ([string]$Actor).Replace("'", "''")
  $countsSql = (($counts | ConvertTo-Json -Compress).Replace("'", "''"))
  $hashesSql = (($hashes | ConvertTo-Json -Compress).Replace("'", "''"))
  $dumpHashSql = if ($dumpHash) { "'$dumpHash'" } else { 'NULL' }
  $insert = "INSERT INTO audit.snapshot_manifest(snapshot_id,actor,reason,schema_hash,object_counts,export_hashes,local_backup_hash,status) VALUES ('$snapshotId','$actorSql','$reasonSql','$schemaHash','$countsSql'::jsonb,'$hashesSql'::jsonb,$dumpHashSql,'created');"
  & psql -X -q -v ON_ERROR_STOP=1 -c $insert
  if ($LASTEXITCODE -ne 0) { throw 'Failed to register audit.snapshot_manifest' }

  Write-Host "[DB SNAPSHOT] snapshot_id: $snapshotId"
  Write-Host "[DB SNAPSHOT] Git-safe files: $currentRoot"
  if (-not $SkipFullDump) { Write-Host "[DB SNAPSHOT] LOCAL-ONLY dump: $localDump" }

  if ($Commit) {
    Push-Location $repoRoot
    try {
      & git add -- 'DZ_17/database_snapshots/current' 'DZ_17/database_snapshots/SNAPSHOT_HISTORY.jsonl'
      if ($LASTEXITCODE -ne 0) { throw 'git add failed' }
      $shortReason = $Reason.Trim()
      if ($shortReason.Length -gt 90) { $shortReason = $shortReason.Substring(0,90) }
      & git commit -m "db-snapshot: $shortReason"
      if ($LASTEXITCODE -ne 0) { throw 'git commit failed or nothing changed' }
      $commitSha = (& git rev-parse HEAD).Trim()
      Write-Host "[DB SNAPSHOT] Git commit: $commitSha"
      $commitSql = "UPDATE audit.snapshot_manifest SET git_commit_sha='$commitSha', status='git_committed' WHERE snapshot_id='$snapshotId';"
      & psql -X -q -v ON_ERROR_STOP=1 -c $commitSql
    }
    finally { Pop-Location }
  } else {
    Write-Host '[DB SNAPSHOT] Git commit NOT performed. Review diff, then rerun with -Commit or commit manually.'
  }
}
finally {
  $env:PGDATABASE = $oldPgDatabase
}
