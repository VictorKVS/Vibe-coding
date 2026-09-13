param(
  [string]$Base = 'http://localhost:3000'
)

$ErrorActionPreference = 'Stop'
$TestId = 'TEST-KF-' + [guid]::NewGuid().ToString('N')
$TraceId = 'TRACE-KF-' + [guid]::NewGuid().ToString('N')

function Mark([string]$Stage,[string]$Action,[string]$Status='info',[hashtable]$Details=@{}) {
  Write-Host ("[TRACE] {0} {1}/{2} {3}" -f $TraceId,$Stage,$Action,$Status) -ForegroundColor DarkCyan
  $body = @{
    stage = $Stage
    action = $Action
    status = $Status
    test_id = $TestId
    details = $Details
  } | ConvertTo-Json -Depth 8
  try {
    Invoke-RestMethod -Uri "$Base/api/v1/trace" -Method Post -Headers @{ 'x-trace-id' = $TraceId } -ContentType 'application/json; charset=utf-8' -Body $body | Out-Null
  } catch {
    Write-Host "[TRACE] marker endpoint unavailable: $($_.Exception.Message)" -ForegroundColor Yellow
  }
}

Write-Host "[TEST] id:    $TestId" -ForegroundColor Cyan
Write-Host "[TRACE] id:   $TraceId" -ForegroundColor Cyan
Write-Host "[TARGET]      $Base" -ForegroundColor Cyan

Mark 'TEST' 'smoke.start' 'start'

Write-Host "`n[1/4] GET /api/health" -ForegroundColor White
$health = Invoke-RestMethod -Uri "$Base/api/health" -Headers @{ 'x-trace-id' = $TraceId }
$health | ConvertTo-Json -Depth 8
Mark 'TEST' 'health.ok' 'ok' @{ service = $health.service }

Write-Host "`n[2/4] GET /api/v1/kf/sources" -ForegroundColor White
$sources = Invoke-RestMethod -Uri "$Base/api/v1/kf/sources" -Headers @{ 'x-trace-id' = $TraceId }
$sources | ConvertTo-Json -Depth 8
Mark 'TEST' 'kf.sources.ok' 'ok' @{ count = $sources.data.count }

Write-Host "`n[3/4] GET /api/v1/trace?test_id=$TestId" -ForegroundColor White
$trace = Invoke-RestMethod -Uri "$Base/api/v1/trace?test_id=$([uri]::EscapeDataString($TestId))&limit=100"
$trace.data.events | Select-Object at,trace_id,test_id,source,stage,action,status,duration_ms | Format-Table -AutoSize

Write-Host "`n[4/4] Assertions" -ForegroundColor White
if (-not $health.ok) { throw 'Health endpoint returned ok=false' }
if (-not $sources.ok) { throw 'KF sources endpoint returned ok=false' }
if ($trace.data.count -lt 2) { throw "Expected trace events for $TestId, got $($trace.data.count)" }

Mark 'TEST' 'smoke.complete' 'ok' @{ trace_events = $trace.data.count }
Write-Host "`n[PASS] Knowledge Factory smoke + trace passed" -ForegroundColor Green
Write-Host "[TRACE URL] $Base/api/v1/trace?test_id=$([uri]::EscapeDataString($TestId))" -ForegroundColor Green
