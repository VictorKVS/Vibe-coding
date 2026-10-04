param(
    [Parameter(Mandatory=$true)]
    [string]$InputFile,

    [string]$ProjectId = "STORY-001",

    [string]$FactsFile = "",

    [ValidateSet(
        "auto",
        "3b",
        "8b",
        "14b"
    )]
    [string]$Model = "auto"
)

$ErrorActionPreference = "Stop"

Set-Location $PSScriptRoot

$env:PYTHONPATH = "$PSScriptRoot\src"

if (-not $FactsFile) {

    $FactDir = Join-Path `
        $PSScriptRoot `
        "runtime-data\story\projects\$ProjectId\facts"

    if (-not (Test-Path $FactDir)) {
        throw "Story facts directory not found"
    }

    $Latest = Get-ChildItem `
        $FactDir `
        -File `
        -Filter "*-facts.json" |
        Sort-Object LastWriteTime -Descending |
        Select-Object -First 1

    if (-not $Latest) {
        throw "Story facts file not found"
    }

    $FactsFile = $Latest.FullName
}

python -m father.runtime.story.run_provenance_extract `
    --input $InputFile `
    --facts $FactsFile `
    --project-id $ProjectId `
    --model $Model

if ($LASTEXITCODE -ne 0) {
    throw "Story provenance extraction FAILED"
}
