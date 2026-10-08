$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "FATHER Persona Identity Smoke" -ForegroundColor Cyan
Write-Host "============================="
Write-Host ""

$baseUrl = "http://127.0.0.1:8188"
$repoRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$workflowPath = Join-Path $repoRoot "workflows\persona\studio_character_v2_identity_smoke_bin.json"
$evidenceDir = Join-Path $repoRoot "benchmarks\persona_smoke"
New-Item -ItemType Directory -Force -Path $evidenceDir | Out-Null

if (-not (Test-Path -LiteralPath $workflowPath)) {
  Write-Host ("[FAIL] Workflow not found: " + $workflowPath) -ForegroundColor Red
  exit 2
}

try {
  Invoke-RestMethod -Uri "$baseUrl/system_stats" -Method Get -TimeoutSec 5 | Out-Null
  Write-Host "[OK] ComfyUI runtime reachable." -ForegroundColor Green
} catch {
  Write-Host "[FAIL] ComfyUI is not reachable on 127.0.0.1:8188." -ForegroundColor Red
  exit 3
}

$workflowText = Get-Content -LiteralPath $workflowPath -Raw
$workflow = $workflowText | ConvertFrom-Json

$clientId = [guid]::NewGuid().ToString()
$request = [ordered]@{
  prompt = $workflow
  client_id = $clientId
}

$body = $request | ConvertTo-Json -Depth 100

Write-Host "[RUN] Queueing identity smoke..." -ForegroundColor Yellow
$started = Get-Date

try {
  $queued = Invoke-RestMethod -Uri "$baseUrl/prompt" -Method Post -ContentType "application/json" -Body $body -TimeoutSec 30
} catch {
  Write-Host "[FAIL] ComfyUI rejected the prompt." -ForegroundColor Red
  Write-Host $_.Exception.Message
  if ($_.ErrorDetails.Message) {
    Write-Host $_.ErrorDetails.Message
  }
  exit 4
}

$promptId = $queued.prompt_id

if (-not $promptId) {
  Write-Host "[FAIL] ComfyUI returned no prompt_id." -ForegroundColor Red
  $queued | ConvertTo-Json -Depth 20
  exit 5
}

Write-Host ("[QUEUED] prompt_id: " + $promptId)

$deadline = (Get-Date).AddMinutes(10)
$historyEntry = $null

while ((Get-Date) -lt $deadline) {
  Start-Sleep -Seconds 2

  try {
    $history = Invoke-RestMethod -Uri "$baseUrl/history/$promptId" -Method Get -TimeoutSec 15
  } catch {
    continue
  }

  if ($history.PSObject.Properties.Name -contains $promptId) {
    $historyEntry = $history.$promptId

    if ($historyEntry.outputs) {
      break
    }

    if ($historyEntry.status -and $historyEntry.status.status_str -eq "error") {
      break
    }
  }
}

$finished = Get-Date
$durationSeconds = [math]::Round(($finished - $started).TotalSeconds, 2)

if ($null -eq $historyEntry) {
  Write-Host "[FAIL] No history result after 10 minutes." -ForegroundColor Red
  exit 6
}

$evidence = [ordered]@{
  captured_at = $finished.ToString("o")
  prompt_id = $promptId
  client_id = $clientId
  workflow = "workflows/persona/studio_character_v2_identity_smoke_bin.json"
  duration_seconds = $durationSeconds
  status = $historyEntry.status
  outputs = $historyEntry.outputs
}

$evidenceFile = Join-Path $evidenceDir ("identity_smoke_bin_" + $promptId + ".json")
$evidence | ConvertTo-Json -Depth 50 | Set-Content -LiteralPath $evidenceFile -Encoding UTF8

if ($historyEntry.status -and $historyEntry.status.status_str -eq "error") {
  Write-Host "[FAIL] ComfyUI execution ended with error." -ForegroundColor Red
  Write-Host ("[EVIDENCE] " + $evidenceFile)
} else {
  Write-Host ("[OK] Execution completed in " + $durationSeconds + " s") -ForegroundColor Green

  $imageCount = 0
  foreach ($prop in $historyEntry.outputs.PSObject.Properties) {
    $nodeOutput = $prop.Value
    if ($nodeOutput.images) {
      foreach ($img in $nodeOutput.images) {
        $imageCount++
        Write-Host ("[OUTPUT] type=" + $img.type + " subfolder=" + $img.subfolder + " filename=" + $img.filename)
      }
    }
  }

  Write-Host ("[OK] Images reported: " + $imageCount)
  Write-Host ("[EVIDENCE] " + $evidenceFile)
}

$publisher = Join-Path $repoRoot "PUBLISH_EVIDENCE.ps1"
if (Test-Path -LiteralPath $publisher) {
  Write-Host ""
  Write-Host "[PUBLISH] Sending smoke evidence to GitHub..." -ForegroundColor Yellow
  & $publisher -Paths @($evidenceFile) -Message "evidence: publish persona identity smoke"
}

if ($historyEntry.status -and $historyEntry.status.status_str -eq "error") {
  exit 7
}

Write-Host ""
Write-Host "[done] Persona identity smoke complete." -ForegroundColor Cyan
