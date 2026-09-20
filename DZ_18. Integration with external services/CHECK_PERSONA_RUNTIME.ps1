$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "FATHER Persona Runtime Capability Check" -ForegroundColor Cyan
Write-Host "======================================="
Write-Host ""

$baseUrl = "http://127.0.0.1:8188"

try {
  $stats = Invoke-RestMethod -Uri "$baseUrl/system_stats" -Method Get -TimeoutSec 5
  Write-Host "[OK] ComfyUI runtime reachable at $baseUrl" -ForegroundColor Green
} catch {
  Write-Host "[FAIL] ComfyUI runtime is not reachable at $baseUrl" -ForegroundColor Red
  Write-Host "Start the primary ComfyUI runtime first, then rerun this check." -ForegroundColor Yellow
  exit 2
}

try {
  $objectInfo = Invoke-RestMethod -Uri "$baseUrl/object_info" -Method Get -TimeoutSec 20
} catch {
  Write-Host "[FAIL] Could not read /object_info from ComfyUI." -ForegroundColor Red
  exit 3
}

$allNodeNames = @($objectInfo.PSObject.Properties.Name)

$targets = @(
  "IPAdapterAdvanced",
  "InstantIDFaceAnalysis",
  "ControlNetApplyAdvanced",
  "CheckpointLoaderSimple",
  "CLIPVisionLoader",
  "ControlNetLoader"
)

Write-Host ""
Write-Host "[Required node availability]" -ForegroundColor Green

foreach ($target in $targets) {
  if ($allNodeNames -contains $target) {
    Write-Host ("[FOUND] " + $target) -ForegroundColor Green
  } else {
    Write-Host ("[MISSING] " + $target) -ForegroundColor DarkYellow
  }
}

Write-Host ""
Write-Host "[All runtime nodes matching identity/pose keywords]" -ForegroundColor Green

$keywordNodes = $allNodeNames |
  Where-Object { $_ -match "IPAdapter|InstantID|Face|ControlNet|OpenPose|DW.?Pose|Pose" } |
  Sort-Object -Unique

if ($keywordNodes.Count -eq 0) {
  Write-Host "none"
} else {
  $keywordNodes | ForEach-Object { Write-Host ("  " + $_) }
}

function Show-InputOptions {
  param(
    [string]$NodeName,
    [string[]]$InputNames
  )

  if (-not ($allNodeNames -contains $NodeName)) {
    return
  }

  $node = $objectInfo.$NodeName

  Write-Host ""
  Write-Host ("[" + $NodeName + " input options]") -ForegroundColor Green

  foreach ($inputName in $InputNames) {
    $required = $node.input.required
    if ($null -ne $required -and $required.PSObject.Properties.Name -contains $inputName) {
      $spec = $required.$inputName

      try {
        $values = @($spec[0])
        if ($values.Count -gt 0 -and $values[0] -is [System.Array]) {
          $values = @($values[0])
        }

        Write-Host ("  " + $inputName + ":")
        foreach ($v in $values) {
          Write-Host ("    - " + $v)
        }
      } catch {
        Write-Host ("  " + $inputName + ": [schema present, options not enumerable]")
      }
    }
  }
}

Show-InputOptions -NodeName "CheckpointLoaderSimple" -InputNames @("ckpt_name")
Show-InputOptions -NodeName "CLIPVisionLoader" -InputNames @("clip_name")
Show-InputOptions -NodeName "ControlNetLoader" -InputNames @("control_net_name")
Show-InputOptions -NodeName "IPAdapterModelLoader" -InputNames @("ipadapter_file")

Write-Host ""
Write-Host "[System summary]" -ForegroundColor Green

if ($stats.system) {
  $stats.system | ConvertTo-Json -Depth 5
}

if ($stats.devices) {
  $stats.devices | ConvertTo-Json -Depth 5
}

Write-Host ""
Write-Host "[done] Runtime capability check complete. No files or workflows were modified." -ForegroundColor Cyan
