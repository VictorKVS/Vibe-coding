$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "FATHER Capture Persona Runtime Schema" -ForegroundColor Cyan
Write-Host "====================================="
Write-Host ""

$baseUrl = "http://127.0.0.1:8188"
$repoRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$outDir = Join-Path $repoRoot "benchmarks\persona_runtime"
New-Item -ItemType Directory -Force -Path $outDir | Out-Null
$outJson = Join-Path $outDir "persona_runtime_schema.json"
$outTxt = Join-Path $outDir "persona_runtime_schema.txt"

try {
  $objectInfo = Invoke-RestMethod -Uri "$baseUrl/object_info" -Method Get -TimeoutSec 20
} catch {
  Write-Host "[FAIL] ComfyUI /object_info is not reachable." -ForegroundColor Red
  Write-Host "Keep the primary ComfyUI running on 127.0.0.1:8188 and rerun." -ForegroundColor Yellow
  exit 2
}

$targets = @(
  "CheckpointLoaderSimple",
  "CLIPVisionLoader",
  "IPAdapterModelLoader",
  "IPAdapterAdvanced",
  "IPAdapterUnifiedLoader",
  "IPAdapterUnifiedLoaderFaceID",
  "IPAdapterFaceID",
  "IPAdapterInsightFaceLoader",
  "LoadImage",
  "CLIPTextEncode",
  "EmptyLatentImage",
  "KSampler",
  "VAEDecode",
  "SaveImage",
  "ControlNetLoader",
  "ControlNetApplyAdvanced",
  "OpenposePreprocessor"
)

$result = [ordered]@{
  captured_at = (Get-Date).ToString("o")
  comfyui_url = $baseUrl
  nodes = [ordered]@{}
}

$lines = New-Object System.Collections.Generic.List[string]

foreach ($name in $targets) {
  if ($objectInfo.PSObject.Properties.Name -contains $name) {
    $node = $objectInfo.$name
    $result.nodes[$name] = $node
    $lines.Add("[FOUND] $name")
    
    if ($node.input -and $node.input.required) {
      foreach ($p in $node.input.required.PSObject.Properties) {
        $lines.Add("  required $($p.Name): $($p.Value | ConvertTo-Json -Compress -Depth 8)")
      }
    }

    if ($node.input -and $node.input.optional) {
      foreach ($p in $node.input.optional.PSObject.Properties) {
        $lines.Add("  optional $($p.Name): $($p.Value | ConvertTo-Json -Compress -Depth 8)")
      }
    }
  } else {
    $result.nodes[$name] = [ordered]@{ status = "MISSING" }
    $lines.Add("[MISSING] $name")
  }

  $lines.Add("")
}

$result | ConvertTo-Json -Depth 50 | Set-Content -LiteralPath $outJson -Encoding UTF8
$lines | Set-Content -LiteralPath $outTxt -Encoding UTF8

Write-Host ("[SAVED] " + $outJson)
Write-Host ("[SAVED] " + $outTxt)

$publisher = Join-Path $repoRoot "PUBLISH_EVIDENCE.ps1"
if (Test-Path -LiteralPath $publisher) {
  Write-Host ""
  Write-Host "[PUBLISH] Sending runtime schema evidence to GitHub..." -ForegroundColor Yellow
  & $publisher -Paths @($outJson, $outTxt) -Message "evidence: publish persona runtime schema"
} else {
  Write-Host "[WARN] Evidence publisher not found. Files remain local only." -ForegroundColor DarkYellow
}

Write-Host ""
Write-Host "[done] Runtime schema capture complete. No ComfyUI files were modified." -ForegroundColor Cyan
