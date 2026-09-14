param(
  [string]$Reason = 'inventory existing PostgreSQL before ALINA cutover',
  [switch]$Commit
)

$ErrorActionPreference = 'Stop'

function Require-Command([string]$Name) {
  if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) { throw "Required command not found: $Name" }
}
function Write-Utf8NoBom([string]$Path, [string[]]$Lines) {
  $enc = New-Object System.Text.UTF8Encoding($false)
  [System.IO.File]::WriteAllLines($Path, $Lines, $enc)
}

Require-Command 'psql'
Require-Command 'pg_dump'
Require-Command 'git'

$connection = if ($env:DATABASE_URL) { $env:DATABASE_URL } else { $env:POSTGRES_URL }
if (-not $connection) { throw 'DATABASE_URL or POSTGRES_URL is required. Keep it in .env.local / process environment, never Git.' }

$oldPgDatabase = $env:PGDATABASE
$env:PGDATABASE = $connection
$repoRoot = (Resolve-Path (Join-Path $PSScriptRoot '..\..\..')).Path
$outRoot = Join-Path $repoRoot 'DZ_17\database_snapshots\inventory'
New-Item -ItemType Directory -Force -Path $outRoot | Out-Null

try {
  $schemaPath = Join-Path $outRoot 'existing-schema.sql'
  & pg_dump --schema-only --no-owner --no-acl --file=$schemaPath
  if ($LASTEXITCODE -ne 0) { throw 'schema-only pg_dump failed' }

  $query = @"
WITH ext AS (
  SELECT jsonb_agg(jsonb_build_object('name',extname,'version',extversion) ORDER BY extname) AS value FROM pg_extension
), schemas AS (
  SELECT jsonb_agg(nspname ORDER BY nspname) AS value
  FROM pg_namespace
  WHERE nspname NOT LIKE 'pg_%' AND nspname <> 'information_schema'
), tables AS (
  SELECT jsonb_agg(jsonb_build_object(
    'schema',schemaname,
    'table',relname,
    'estimated_rows',n_live_tup,
    'total_bytes',pg_total_relation_size(relid)
  ) ORDER BY schemaname,relname) AS value
  FROM pg_stat_user_tables
), columns AS (
  SELECT jsonb_agg(jsonb_build_object(
    'schema',table_schema,
    'table',table_name,
    'column',column_name,
    'type',data_type,
    'nullable',is_nullable
  ) ORDER BY table_schema,table_name,ordinal_position) AS value
  FROM information_schema.columns
  WHERE table_schema NOT IN ('pg_catalog','information_schema')
), indexes AS (
  SELECT jsonb_agg(jsonb_build_object(
    'schema',schemaname,
    'table',tablename,
    'index',indexname,
    'definition',indexdef
  ) ORDER BY schemaname,tablename,indexname) AS value
  FROM pg_indexes
  WHERE schemaname NOT IN ('pg_catalog','information_schema')
)
SELECT jsonb_pretty(jsonb_build_object(
  'schema_version','alina-postgres-inventory-v1',
  'created_at',now(),
  'postgres_version',current_setting('server_version'),
  'database_name',current_database(),
  'extensions',COALESCE((SELECT value FROM ext),'[]'::jsonb),
  'schemas',COALESCE((SELECT value FROM schemas),'[]'::jsonb),
  'tables',COALESCE((SELECT value FROM tables),'[]'::jsonb),
  'columns',COALESCE((SELECT value FROM columns),'[]'::jsonb),
  'indexes',COALESCE((SELECT value FROM indexes),'[]'::jsonb),
  'security_note','No row data, passwords, connection strings, host or login are included.'
));
"@
  $inventory = @(& psql -X -qAt -v ON_ERROR_STOP=1 -c $query)
  if ($LASTEXITCODE -ne 0) { throw 'inventory query failed' }
  $inventoryPath = Join-Path $outRoot 'inventory.json'
  Write-Utf8NoBom $inventoryPath $inventory

  $schemaHash = (Get-FileHash -Algorithm SHA256 $schemaPath).Hash.ToLowerInvariant()
  $inventoryHash = (Get-FileHash -Algorithm SHA256 $inventoryPath).Hash.ToLowerInvariant()
  $manifest = [ordered]@{
    schema_version='alina-postgres-inventory-manifest-v1'
    created_at=(Get-Date).ToUniversalTime().ToString('o')
    reason=$Reason
    schema_sha256=$schemaHash
    inventory_sha256=$inventoryHash
    contains_row_data=$false
    contains_credentials=$false
  } | ConvertTo-Json -Depth 5
  Write-Utf8NoBom (Join-Path $outRoot 'manifest.json') @($manifest)

  Write-Host "[DB INVENTORY] written: $outRoot"
  Write-Host '[DB INVENTORY] no table row data or credentials exported.'

  if ($Commit) {
    Push-Location $repoRoot
    try {
      & git add -- 'DZ_17/database_snapshots/inventory'
      & git commit -m 'db-inventory: existing PostgreSQL schema before ALINA cutover'
      if ($LASTEXITCODE -ne 0) { throw 'git commit failed or nothing changed' }
      Write-Host "[DB INVENTORY] commit: $((& git rev-parse HEAD).Trim())"
    } finally { Pop-Location }
  }
}
finally {
  $env:PGDATABASE = $oldPgDatabase
}
