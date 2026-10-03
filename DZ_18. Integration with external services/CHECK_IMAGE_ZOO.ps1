param(
  [string[]]$Roots = @("G:\1"),
  [string]$OutDir = "$PSScriptRoot\benchmarks\image_inventory"
)

$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "FATHER Image Zoo Inventory" -ForegroundColor Cyan
Write-Host "=========================="
Write-Host ""

$targets = @(
  @{ Role="primary_generator"; Pattern="juggernautXL_v8Rundiffusion.safetensors" },
  @{ Role="fast_realism"; Pattern="realvisxlV50_v50LightningBakedvae.safetensors" },
  @{ Role="creative_generator"; Pattern="dreamshaperXL_lightningDPMSDE.safetensors" },
  @{ Role="sdxl_baseline"; Pattern="sd_xl_base_1.0.safetensors" },
  @{ Role="portrait_specialist"; Pattern="SDXL_MSPaint_Portrait.safetensors" },
  @{ Role="identity_adapter"; Pattern="ip-adapter-plus-face_sdxl_vit-h.bin" },
  @{ Role="clip_encoder"; Pattern="CLIP-ViT-H-14-laion2B-s32B-b79K.safetensors" },
  @{ Role="inpainting"; Pattern="stable-diffusion-v1-5-inpainting-Q8_0.gguf" },
  @{ Role="lighting"; Pattern="iclight_sd15_fc.safetensors" },
  @{ Role="pose_control"; Pattern="body_pose_model.pth" },
  @{ Role="segmentation"; Pattern="sam_vit_h_4b8939.pth" },
  @{ Role="segmentation_alt"; Pattern="sam_vit_l_0b3195.pth" },
  @{ Role="lora_headshot"; Pattern="Headshot.safetensors" },
  @{ Role="lora_cinematic_light"; Pattern="cinematic%20lighting.safetensors" },
  @{ Role="lora_skin_detail"; Pattern="flux-detailed_skin_portraits-000005.safetensors" },
  @{ Role="lora_epicrealism"; Pattern="epiCRealismXL-KiSSEnhancer_Lora.safetensors" }
)

New-Item -ItemType Directory -Force -Path $OutDir | Out-Null

$rows = @()

foreach ($target in $targets) {
  $matches = @()

  foreach ($root in $Roots) {
    if (-not (Test-Path $root)) { continue }

    $matches += Get-ChildItem $root -Recurse -File -Filter $target.Pattern -ErrorAction SilentlyContinue
  }

  if ($matches.Count -eq 0) {
    $rows += [PSCustomObject]@{
      Status = "MISSING"
      Role = $target.Role
      Name = $target.Pattern
      GB = 0
      Path = ""
      DuplicateCount = 0
    }
    continue
  }

  $duplicateCount = $matches.Count

  foreach ($file in $matches) {
    $rows += [PSCustomObject]@{
      Status = "OK"
      Role = $target.Role
      Name = $file.Name
      GB = [math]::Round($file.Length / 1GB, 3)
      Path = $file.FullName
      DuplicateCount = $duplicateCount
    }
  }
}

$csv = Join-Path $OutDir "image-zoo-inventory.csv"
$rows | Export-Csv $csv -NoTypeInformation -Encoding UTF8

Write-Host "[Inventory]" -ForegroundColor Yellow
$rows |
  Sort-Object Role, Path |
  Format-Table Status, Role, GB, DuplicateCount, Name, Path -AutoSize

Write-Host ""
Write-Host "[Readiness]" -ForegroundColor Yellow

$required = @(
  "primary_generator",
  "fast_realism",
  "sdxl_baseline",
  "identity_adapter",
  "pose_control",
  "segmentation"
)

$roleStatus = @{}

foreach ($role in $required) {
  $ok = @($rows | Where-Object { $_.Role -eq $role -and $_.Status -eq "OK" }).Count -gt 0
  $roleStatus[$role] = $ok
  $label = if ($ok) { "READY" } else { "MISSING" }
  $color = if ($ok) { "Green" } else { "Red" }
  Write-Host ("{0,-24} {1}" -f $role, $label) -ForegroundColor $color
}

$readyCount = @($roleStatus.GetEnumerator() | Where-Object Value).Count
$totalRequired = $required.Count

Write-Host ""
Write-Host ("Required capabilities ready: {0}/{1}" -f $readyCount, $totalRequired) -ForegroundColor Cyan
Write-Host ("CSV: " + $csv)

Write-Host ""
Write-Host "[Duplicates]" -ForegroundColor Yellow

$duplicates = $rows |
  Where-Object { $_.Status -eq "OK" -and $_.DuplicateCount -gt 1 } |
  Group-Object Name |
  Sort-Object Count -Descending

if ($duplicates.Count -eq 0) {
  Write-Host "No duplicate target assets detected."
}
else {
  foreach ($group in $duplicates) {
    Write-Host ("{0} x{1}" -f $group.Name, $group.Count) -ForegroundColor Yellow
    $group.Group | ForEach-Object { Write-Host ("  " + $_.Path) }
  }
}

Write-Host ""
Write-Host "[done] Image Zoo inventory complete." -ForegroundColor Cyan
