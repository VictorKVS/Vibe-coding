param(
    [string]$ProjectId = "STORY-001",

    [string]$ProjectFile = "",

    [string]$StateFile = ""
)

$ErrorActionPreference = "Stop"

Set-Location $PSScriptRoot

$env:PYTHONPATH = "$PSScriptRoot\src"


if (-not $ProjectFile) {

    $StateDir = Join-Path `
        $PSScriptRoot `
        "runtime-data\story\projects\$ProjectId\state"

    $Project = Get-ChildItem `
        $StateDir `
        -File `
        -Filter "*-stateful-story-project.json" |
        Sort-Object LastWriteTime -Descending |
        Select-Object -First 1

    if (-not $Project) {
        throw "Stateful StoryProject not found"
    }

    $ProjectFile = $Project.FullName
}


if (-not $StateFile) {

    $StateDir = Join-Path `
        $PSScriptRoot `
        "runtime-data\story\projects\$ProjectId\state"

    $State = Get-ChildItem `
        $StateDir `
        -File `
        -Filter "*-story-state.json" |
        Sort-Object LastWriteTime -Descending |
        Select-Object -First 1

    if (-not $State) {
        throw "StoryState not found"
    }

    $StateFile = $State.FullName
}


python -m father.runtime.story.run_continuity_rules `
    --project $ProjectFile `
    --state $StateFile

if ($LASTEXITCODE -ne 0) {
    throw "Story continuity rules FAILED"
}
