param(
  [string]$ZooRoot = $env:FATHER_MODELS_ROOT,
  [switch]$IncludeExperimental,
  [switch]$WriteEnv
)

$ErrorActionPreference = 'Stop'
$AppDir = Split-Path -Parent $PSScriptRoot
$RuntimeConfigDir = Join-Path $AppDir 'runtime\config'
$PresetPath = Join-Path $RuntimeConfigDir 'llama-models.local.ini'
$EnvPath = Join-Path $AppDir '.env.local'

function Resolve-ZooRoot {
  param([string]$Requested)
  $candidates = @()
  if ($Requested) { $candidates += $Requested }
  $candidates += @(
    'F:\FATHER_MODELS',
    'D:\FATHER_MODELS',
    'E:\FATHER_MODELS',
    'G:\FATHER_MODELS'
  )
  foreach ($candidate in $candidates | Select-Object -Unique) {
    if ($candidate -and (Test-Path $candidate)) {
      return (Resolve-Path $candidate).Path
    }
  }
  throw "FATHER_MODELS root not found. Pass -ZooRoot or set FATHER_MODELS_ROOT."
}

function Find-ExactFile {
  param([string]$Root,[string]$Name)
  Get-ChildItem $Root -Recurse -File -Filter $Name -ErrorAction SilentlyContinue |
    Sort-Object FullName |
    Select-Object -First 1
}

function Ini-Path {
  param([string]$Path)
  return ($Path -replace '\\','/')
}

function Upsert-EnvLine {
  param([string[]]$Lines,[string]$Key,[string]$Value)
  $prefix = "$Key="
  $found = $false
  $out = foreach ($line in $Lines) {
    if ($line.StartsWith($prefix,[System.StringComparison]::Ordinal)) {
      $found = $true
      "$prefix$Value"
    } else {
      $line
    }
  }
  if (-not $found) { $out += "$prefix$Value" }
  return $out
}

$ZooRoot = Resolve-ZooRoot $ZooRoot
New-Item -ItemType Directory -Force -Path $RuntimeConfigDir | Out-Null

Write-Host "[ALINA] Existing FATHER model zoo" -ForegroundColor Cyan
Write-Host "[ALINA] root: $ZooRoot"
Write-Host "[ALINA] preset: $PresetPath"

$definitions = @(
  [pscustomobject]@{
    Id='local-fast-ru'
    File='ai-sage_GigaChat3-10B-A1.8B-Q4_K_S.gguf'
    Role='fast dialogue / RU'
    Experimental=$false
    Mmproj=$null
  },
  [pscustomobject]@{
    Id='local-general-qwen14b'
    File='Qwen2.5-14B-Instruct-1M-Q4_K_M.gguf'
    Role='general synthesis / long context'
    Experimental=$false
    Mmproj=$null
  },
  [pscustomobject]@{
    Id='local-deep-ru'
    File='GigaChat-20B-A3B-instruct-v1.5-q4_K_M.gguf'
    Role='architecture / KB validation / RU'
    Experimental=$false
    Mmproj=$null
  },
  [pscustomobject]@{
    Id='local-code-qwen14b'
    File='qwen2.5-coder-14b-instruct-q4_k_m.gguf'
    Role='code'
    Experimental=$false
    Mmproj=$null
  },
  [pscustomobject]@{
    Id='local-code-deepseek'
    File='deepseek-coder-v2-lite-instruct-q5_k_m.gguf'
    Role='code review'
    Experimental=$false
    Mmproj=$null
  },
  [pscustomobject]@{
    Id='local-vision-llava3'
    File='llava-llama-3-8b-v1_1-int4.gguf'
    Role='vision'
    Experimental=$false
    Mmproj='llava-llama-3-8b-v1_1-mmproj-f16.gguf'
  },
  [pscustomobject]@{
    Id='local-creative-mistral'
    File='Mistral-Heretica-12B-GGUF-Q4_K_M.gguf'
    Role='creative experimental'
    Experimental=$true
    Mmproj=$null
  },
  [pscustomobject]@{
    Id='local-creative-qwen14b'
    File='qwen2.5-14b-instruct-uncensored-q4_k_m.gguf'
    Role='creative experimental'
    Experimental=$true
    Mmproj=$null
  }
)

$selected = @()
foreach ($definition in $definitions) {
  if ($definition.Experimental -and -not $IncludeExperimental) { continue }
  $model = Find-ExactFile -Root $ZooRoot -Name $definition.File
  if (-not $model) {
    Write-Host "[ALINA] missing: $($definition.File)" -ForegroundColor Yellow
    continue
  }
  $mmprojPath = $null
  if ($definition.Mmproj) {
    $mmproj = Find-ExactFile -Root $ZooRoot -Name $definition.Mmproj
    if (-not $mmproj) {
      Write-Host "[ALINA] vision projector missing: $($definition.Mmproj); skipping $($definition.Id)" -ForegroundColor Yellow
      continue
    }
    $mmprojPath = $mmproj.FullName
  }
  $selected += [pscustomobject]@{
    Id=$definition.Id
    File=$model.FullName
    Role=$definition.Role
    Mmproj=$mmprojPath
  }
}

if (-not $selected.Count) {
  throw "No supported GGUF models were found under $ZooRoot."
}

$lines = New-Object System.Collections.Generic.List[string]
$lines.Add('version = 1')
$lines.Add('')
foreach ($item in $selected) {
  $lines.Add("[$($item.Id)]")
  $lines.Add("model = $(Ini-Path $item.File)")
  if ($item.Mmproj) { $lines.Add("mmproj = $(Ini-Path $item.Mmproj)") }
  $lines.Add('')
}
Set-Content -Path $PresetPath -Value $lines -Encoding UTF8

Write-Host ""
Write-Host "[ALINA] Registered local models:" -ForegroundColor Cyan
$selected |
  Select-Object Id,Role,@{n='SizeGB';e={[math]::Round((Get-Item $_.File).Length/1GB,2)}},File |
  Format-Table -AutoSize

$fast = ($selected | Where-Object Id -eq 'local-fast-ru' | Select-Object -First 1).Id
$general = ($selected | Where-Object Id -eq 'local-general-qwen14b' | Select-Object -First 1).Id
$deep = ($selected | Where-Object Id -eq 'local-deep-ru' | Select-Object -First 1).Id
$vision = ($selected | Where-Object Id -eq 'local-vision-llava3' | Select-Object -First 1).Id

$first = $selected[0].Id
if (-not $fast) { $fast = $first }
if (-not $general) { $general = $fast }
if (-not $deep) { $deep = $general }

$envValues = [ordered]@{
  FATHER_MODELS_ROOT=$ZooRoot
  LLAMA_AUTOSTART='1'
  LLAMA_SERVER_BIN='llama-server.exe'
  LLAMA_MODELS_PRESET='runtime/config/llama-models.local.ini'
  LLAMA_MODELS_MAX='1'
  LLAMA_MODELS_AUTOLOAD='1'
  LLAMA_MODELS=($selected.Id -join ',')
  LLAMA_DIALOGUE_MODEL=$fast
  LLAMA_SYNTHESIS_MODEL=$general
  LLAMA_ARCHITECTURE_MODEL=$deep
  LLAMA_KB_MODEL=$general
  LLAMA_KB_VALIDATE_MODEL=$deep
}

if ($vision) {
  $envValues['LLAMA_VISION_MODEL']=$vision
  $envValues['LLAMA_VISION_MODELS']=$vision
}

Write-Host ""
Write-Host "[ALINA] Recommended .env.local values:" -ForegroundColor Cyan
foreach ($entry in $envValues.GetEnumerator()) {
  Write-Host "$($entry.Key)=$($entry.Value)"
}

if ($WriteEnv) {
  $existing = if (Test-Path $EnvPath) { Get-Content $EnvPath } else { @() }
  foreach ($entry in $envValues.GetEnumerator()) {
    $existing = Upsert-EnvLine -Lines $existing -Key $entry.Key -Value $entry.Value
  }
  Set-Content -Path $EnvPath -Value $existing -Encoding UTF8
  Write-Host "[ALINA] .env.local updated without touching unrelated secret values." -ForegroundColor Green
}

Write-Host ""
Write-Host "[ALINA] No model weights were copied or downloaded." -ForegroundColor Green
Write-Host "[ALINA] llama.cpp will load models on demand and keep at most one heavy model loaded." -ForegroundColor Green
Write-Host "[ALINA] Start/restart with: npm run dev:models" -ForegroundColor Green
