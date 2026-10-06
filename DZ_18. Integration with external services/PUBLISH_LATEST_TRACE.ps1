$ErrorActionPreference = "Stop"

$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location -LiteralPath $Root

$TraceDir = Join-Path $Root "runtime-data\traces"
$EvidenceDir = Join-Path $Root "evidence\traces"

New-Item `
    -ItemType Directory `
    -Force `
    $EvidenceDir |
    Out-Null

Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "          FATHER TRACE -> GITHUB" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

# ------------------------------------------------------------
# Find newest trace file
# ------------------------------------------------------------

$traceFile =
    Get-ChildItem `
        $TraceDir `
        -Filter "father-trace-*.jsonl" `
        -File `
        -ErrorAction SilentlyContinue |
    Sort-Object LastWriteTime -Descending |
    Select-Object -First 1

if (-not $traceFile) {
    throw "No FATHER trace files found."
}

# ------------------------------------------------------------
# Read JSONL
# ------------------------------------------------------------

$records = @()

Get-Content `
    -LiteralPath $traceFile.FullName |
    ForEach-Object {

        if (
            -not [string]::IsNullOrWhiteSpace($_)
        ) {
            try {
                $records += (
                    $_ |
                    ConvertFrom-Json
                )
            }
            catch {
                Write-Host `
                    "Skipping invalid JSONL line." `
                    -ForegroundColor Yellow
            }
        }
    }

if ($records.Count -eq 0) {
    throw "Trace file contains no valid records."
}

# ------------------------------------------------------------
# Prefer latest IMAGE trace
# ------------------------------------------------------------

$imageStart =
    $records |
    Where-Object {
        $_.stage -eq "image.request"
    } |
    Select-Object -Last 1

if ($imageStart) {
    $TraceId =
        [string]$imageStart.trace_id
}
else {
    $TraceId =
        [string]$records[-1].trace_id
}

if (
    [string]::IsNullOrWhiteSpace(
        $TraceId
    )
) {
    throw "Could not determine trace_id."
}

$selected = @(
    $records |
    Where-Object {
        $_.trace_id -eq $TraceId
    }
)

Write-Host "Trace ID : $TraceId" -ForegroundColor Yellow
Write-Host "Events   : $($selected.Count)"
Write-Host "Source   : $($traceFile.Name)"

# ------------------------------------------------------------
# Git metadata
# ------------------------------------------------------------

$Branch = (
    git branch --show-current
).Trim()

if (-not $Branch) {
    throw "Detached HEAD. Publish cancelled."
}

$Head = (
    git rev-parse --short HEAD
).Trim()

$Remote = (
    git remote get-url origin
).Trim()

# ------------------------------------------------------------
# Output filenames
# ------------------------------------------------------------

$Stamp =
    Get-Date `
        -Format "yyyyMMdd-HHmmss"

$SafeTraceId =
    $TraceId `
    -replace "[^a-zA-Z0-9_-]", "_"

$JsonName =
    "${Stamp}_${SafeTraceId}.jsonl"

$MdName =
    "${Stamp}_${SafeTraceId}.md"

$JsonPath =
    Join-Path `
        $EvidenceDir `
        $JsonName

$MdPath =
    Join-Path `
        $EvidenceDir `
        $MdName

# ------------------------------------------------------------
# Export JSONL
# ------------------------------------------------------------

$selected |
    ForEach-Object {
        $_ |
        ConvertTo-Json `
            -Compress `
            -Depth 20
    } |
    Set-Content `
        -LiteralPath $JsonPath `
        -Encoding UTF8

# ------------------------------------------------------------
# Human-readable report
# ------------------------------------------------------------

$FirstTime =
    $selected[0].timestamp

$LastTime =
    $selected[
        $selected.Count - 1
    ].timestamp

$StageLines = @()

foreach ($item in $selected) {

    $line =
        "- " +
        [string]$item.timestamp +
        " | " +
        [string]$item.stage +
        " | " +
        [string]$item.status

    if ($item.prompt_id) {
        $line +=
            " | prompt_id=" +
            [string]$item.prompt_id
    }

    if ($item.http_status) {
        $line +=
            " | HTTP=" +
            [string]$item.http_status
    }

    if ($item.duration_ms) {
        $line +=
            " | " +
            [string]$item.duration_ms +
            " ms"
    }

    $StageLines += $line
}

$Report = @()

$Report += "# FATHER Runtime Trace"
$Report += ""
$Report += "Trace ID: $TraceId"
$Report += ""
$Report += "Captured: $FirstTime -> $LastTime"
$Report += ""
$Report += "Events: $($selected.Count)"
$Report += ""
$Report += "Git branch: $Branch"
$Report += ""
$Report += "Source commit: $Head"
$Report += ""
$Report += "## Trace"
$Report += ""

foreach ($line in $StageLines) {
    $Report += $line
}

$Report += ""
$Report += "## Security"
$Report += ""
$Report += "This evidence bundle contains runtime telemetry only."
$Report += ""
$Report += "It does not intentionally include:"
$Report += ""
$Report += "- API keys"
$Report += "- Authorization headers"
$Report += "- GigaChat credentials"
$Report += "- environment secrets"
$Report += "- full user prompts"
$Report += ""
$Report += "Prompts are represented by length and SHA-256 fingerprint when applicable."
$Report += ""
$Report += "## Pipeline"
$Report += ""
$Report += "BOOKCRAFT -> FATHER API -> Image Zoo -> ComfyUI -> artifact -> BOOKCRAFT"

$Report |
    Set-Content `
        -LiteralPath $MdPath `
        -Encoding UTF8

# ------------------------------------------------------------
# Git paths
# ------------------------------------------------------------

$JsonRelative =
    Resolve-Path `
        -LiteralPath $JsonPath `
        -Relative

$MdRelative =
    Resolve-Path `
        -LiteralPath $MdPath `
        -Relative

Write-Host ""
Write-Host "Evidence created:" -ForegroundColor Cyan
Write-Host "  $JsonRelative"
Write-Host "  $MdRelative"

# ------------------------------------------------------------
# Add ONLY trace evidence
# ------------------------------------------------------------

git add -- `
    $JsonRelative `
    $MdRelative

if ($LASTEXITCODE -ne 0) {
    throw "git add failed."
}

# ------------------------------------------------------------
# Commit ONLY trace evidence
# ------------------------------------------------------------

$Message =
    "chore(trace): publish FATHER trace $TraceId"

git commit `
    --only `
    -m $Message `
    -- `
    $JsonRelative `
    $MdRelative

if ($LASTEXITCODE -ne 0) {
    throw "git commit failed."
}

# ------------------------------------------------------------
# Push
# ------------------------------------------------------------

Write-Host ""
Write-Host "Remote : $Remote" -ForegroundColor Cyan
Write-Host "Branch : $Branch" -ForegroundColor Cyan

git push origin $Branch

if ($LASTEXITCODE -ne 0) {
    throw "Git push failed. Trace remains committed locally."
}

Write-Host ""
Write-Host "============================================================" -ForegroundColor Green
Write-Host " TRACE PUBLISHED TO GITHUB" -ForegroundColor Green
Write-Host " Trace : $TraceId" -ForegroundColor Green
Write-Host " Branch: $Branch" -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Green
Write-Host ""
