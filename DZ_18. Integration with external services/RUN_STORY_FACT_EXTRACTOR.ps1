param(
    [Parameter(Mandatory=$true)]
    [string]$InputFile,

    [string]$ProjectId = "STORY-001",

    [string]$Title = "Untitled Story",

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

python -m father.runtime.story.run_fact_extract `
    --input $InputFile `
    --project-id $ProjectId `
    --title $Title `
    --model $Model

if ($LASTEXITCODE -ne 0) {
    throw "Story fact extraction FAILED"
}
