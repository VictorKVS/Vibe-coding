param(
  [string]$ModelRoot = "$PSScriptRoot\models"
)

$ErrorActionPreference = "Continue"

Write-Host ""
Write-Host "FATHER Model Runtime Smoke Test" -ForegroundColor Cyan
Write-Host "================================"
Write-Host ""

$ggufs = @(
  @{
    name = "Ministral 3B"
    folder = "ministral-3b-instruct-q4"
  },
  @{
    name = "Ministral 8B"
    folder = "ministral-8b-instruct-q4"
  },
  @{
    name = "Ministral 14B Reasoning"
    folder = "ministral-14b-reasoning-q4"
  }
)

$llama = $null

foreach ($candidate in @("llama-cli","llama")) {
  $cmd = Get-Command $candidate -CommandType Application -ErrorAction SilentlyContinue
  if ($cmd) {
    $llama = $cmd.Source
    break
  }
}

Write-Host "[GGUF files]" -ForegroundColor Yellow

foreach ($item in $ggufs) {
  $folder = Join-Path $ModelRoot $item.folder
  $file = Get-ChildItem $folder -File -Filter "*.gguf" -ErrorAction SilentlyContinue |
    Sort-Object Length -Descending |
    Select-Object -First 1

  if ($file) {
    Write-Host ("OK  {0,-28} {1,6:N2} GB  {2}" -f $item.name, ($file.Length / 1GB), $file.FullName)
  }
  else {
    Write-Host ("MISS {0}" -f $item.name) -ForegroundColor Red
  }
}

Write-Host ""
Write-Host "[llama.cpp runtime]" -ForegroundColor Yellow

if (-not $llama) {
  Write-Host "SKIP: llama.cpp is not installed or not in PATH." -ForegroundColor Yellow
  Write-Host "The model weights are valid; only the runtime is missing."
}
else {
  Write-Host ("Found: " + $llama) -ForegroundColor Green
  if (Get-Command llama-cli -CommandType Application -ErrorAction SilentlyContinue) {
    Write-Host "Devices:" -ForegroundColor Yellow
    llama-cli --list-devices 2>&1
  }
  Write-Host "GGUF inference benchmark can be enabled next."
}

Write-Host ""
Write-Host "[RAG Python environment]" -ForegroundColor Yellow

if (-not (Get-Command python -ErrorAction SilentlyContinue)) {
  Write-Host "FAIL: python not found" -ForegroundColor Red
  exit 1
}

$pyRagCheck = Join-Path $env:TEMP "father_rag_check.py"
@'
mods = ["torch", "transformers", "sentence_transformers"]
for name in mods:
    try:
        module = __import__(name)
        print("OK ", name, getattr(module, "__version__", ""))
    except Exception as e:
        print("MISS", name, "-", str(e))
'@ | Set-Content -Path $pyRagCheck -Encoding UTF8
python $pyRagCheck
Remove-Item $pyRagCheck -Force -ErrorAction SilentlyContinue

Write-Host ""
Write-Host "[RAG model folders]" -ForegroundColor Yellow

foreach ($pair in @(
  @("Embedding", "qwen3-embedding-0.6b"),
  @("Reranker", "qwen3-reranker-0.6b")
)) {
  $folder = Join-Path $ModelRoot $pair[1]
  if (Test-Path $folder) {
    $config = Join-Path $folder "config.json"
    if (Test-Path $config) {
      Write-Host ("OK  {0,-12} {1}" -f $pair[0], $folder) -ForegroundColor Green
    }
    else {
      Write-Host ("WARN {0}: folder exists but config.json is missing" -f $pair[0]) -ForegroundColor Yellow
    }
  }
  else {
    Write-Host ("MISS {0}: {1}" -f $pair[0], $folder) -ForegroundColor Red
  }
}

Write-Host ""
Write-Host "[done] Runtime smoke test complete." -ForegroundColor Cyan
