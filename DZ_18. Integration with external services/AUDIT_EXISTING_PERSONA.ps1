$ErrorActionPreference = "Continue"

$roots = @(
  "G:\1\Прежде\1_izobraznie\MindForge_Studio",
  "G:\1\Прежде\1_izobraznie\AI\stable-diffusion-webui-OLD",
  "G:\1\Прежде\1_izobraznie\ComfyUI",
  "G:\1\Прежде\1_izobraznie\AI\ComfyUI\ComfyUI"
)

Write-Host ""
Write-Host "FATHER Existing Persona Pipeline Audit" -ForegroundColor Cyan
Write-Host "======================================"
Write-Host ""

$patterns = @(
  "*.json",
  "*.yaml",
  "*.yml",
  "*.png",
  "*.jpg",
  "*.jpeg",
  "*.webp",
  "*.safetensors",
  "*.pt",
  "*.pth",
  "*.bin"
)

foreach ($root in $roots) {
  if (-not (Test-Path $root)) { continue }

  Write-Host ""
  Write-Host ("=== " + $root + " ===") -ForegroundColor Yellow

  $interestingDirs = Get-ChildItem $root -Directory -ErrorAction SilentlyContinue |
    Where-Object {
      $_.Name -match "workflow|persona|character|reference|input|output|lora|embedding|control|ipadapter|instantid|face|model"
    }

  if ($interestingDirs) {
    Write-Host "[Interesting directories]" -ForegroundColor Green
    $interestingDirs | Select-Object Name, FullName | Format-Table -AutoSize
  }

  Write-Host "[Likely workflow/config files]" -ForegroundColor Green
  Get-ChildItem $root -Recurse -File -Include "*.json","*.yaml","*.yml" -ErrorAction SilentlyContinue |
    Where-Object {
      $_.FullName -match "workflow|persona|character|prompt|config|preset|registry|scene|face|instant|adapter"
    } |
    Sort-Object LastWriteTime -Descending |
    Select-Object -First 40 LastWriteTime, Length, FullName |
    Format-Table -AutoSize

  Write-Host "[Likely persona/reference images]" -ForegroundColor Green
  Get-ChildItem $root -Recurse -File -Include "*.png","*.jpg","*.jpeg","*.webp" -ErrorAction SilentlyContinue |
    Where-Object {
      $_.FullName -match "persona|character|reference|face|identity|input|portrait|headshot"
    } |
    Sort-Object LastWriteTime -Descending |
    Select-Object -First 30 LastWriteTime, Length, FullName |
    Format-Table -AutoSize
}

Write-Host ""
Write-Host "[done] Do not modify or delete anything yet." -ForegroundColor Cyan
