param(
    [string]$ProjectId = "STORY-001",

    [string]$ProjectFile = ""
)

$ErrorActionPreference = "Stop"

Set-Location $PSScriptRoot

$env:PYTHONPATH = "$PSScriptRoot\src"


if (-not $ProjectFile) {

    $CanonDir = Join-Path `
        $PSScriptRoot `
        "runtime-data\story\projects\$ProjectId\canon"

    $Project = Get-ChildItem `
        $CanonDir `
        -File `
        -Filter "*-story-project.json" |
        Sort-Object LastWriteTime -Descending |
        Select-Object -First 1

    if (-not $Project) {
        throw "Canonical StoryProject not found"
    }

    $ProjectFile = $Project.FullName
}


python -m father.runtime.story.run_state_engine `
    --project $ProjectFile

if ($LASTEXITCODE -ne 0) {
    throw "Story State Engine FAILED"
}
