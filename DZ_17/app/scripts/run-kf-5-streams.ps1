param(
  [Parameter(Mandatory=$true)]
  [string]$SourceId,
  [string]$Base = 'http://localhost:3000'
)

$ErrorActionPreference = 'Stop'
$AppDir = Split-Path -Parent $PSScriptRoot
$Script = Join-Path $PSScriptRoot 'run-kf-5-streams.mjs'

if (-not (Test-Path -LiteralPath $Script)) { throw "Five-stream script not found: $Script" }
Set-Location $AppDir

& node $Script --source-id $SourceId --base $Base
exit $LASTEXITCODE
