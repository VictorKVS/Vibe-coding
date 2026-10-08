param(
    [string]$ProjectId = "STORY-001",

    [string]$FactsFile = "",

    [string]$ProvenanceFile = ""
)

$ErrorActionPreference = "Stop"

Set-Location $PSScriptRoot

$env:PYTHONPATH = "$PSScriptRoot\src"


if (-not $FactsFile) {

    $FactDir = Join-Path `
        $PSScriptRoot `
        "runtime-data\story\projects\$ProjectId\facts"

    $Fact = Get-ChildItem `
        $FactDir `
        -File `
        -Filter "*-facts.json" |
        Sort-Object LastWriteTime -Descending |
        Select-Object -First 1

    if (-not $Fact) {
        throw "Stage A facts not found"
    }

    $FactsFile = $Fact.FullName
}


if (-not $ProvenanceFile) {

    $ProvDir = Join-Path `
        $PSScriptRoot `
        "runtime-data\story\projects\$ProjectId\provenance"

    $Prov = Get-ChildItem `
        $ProvDir `
        -File `
        -Filter "*-provenance.json" |
        Sort-Object LastWriteTime -Descending |
        Select-Object -First 1

    if (-not $Prov) {
        throw "Stage B provenance not found"
    }

    $ProvenanceFile = $Prov.FullName
}


python -m father.runtime.story.run_normalize `
    --facts $FactsFile `
    --provenance $ProvenanceFile

if ($LASTEXITCODE -ne 0) {
    throw "Story normalization FAILED"
}
