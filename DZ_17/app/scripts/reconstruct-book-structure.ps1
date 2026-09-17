param(
  [Parameter(Mandatory=$true)]
  [string]$SourceId,
  [string]$Base = 'http://localhost:3000',
  [int]$MaxPages = 0
)

$ErrorActionPreference = 'Stop'
$AppDir = Split-Path -Parent $PSScriptRoot
$Script = Join-Path $PSScriptRoot 'reconstruct-book-structure.mjs'

if (-not (Test-Path -LiteralPath $Script)) { throw "A2 script not found: $Script" }
Set-Location $AppDir

$argsList = @(
  $Script,
  '--source-id', $SourceId,
  '--base', $Base
)
if ($MaxPages -gt 0) { $argsList += @('--max-pages', [string]$MaxPages) }

& node @argsList
exit $LASTEXITCODE
