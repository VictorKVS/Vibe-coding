param(
    [string]$ProjectId = "STORY-001",

    [string]$ProjectFile = "",

    [string]$DirectivesFile = ""
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


$Arguments = @(
    "-m",
    "father.runtime.story.run_continuity_ledger",
    "--project",
    $ProjectFile
)


if ($DirectivesFile) {

    $Arguments += @(
        "--directives",
        $DirectivesFile
    )
}


python @Arguments

if ($LASTEXITCODE -ne 0) {
    throw "Story Continuity Ledger FAILED"
}
