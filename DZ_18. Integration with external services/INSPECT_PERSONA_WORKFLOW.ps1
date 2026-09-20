$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "FATHER Inspect Recovered Persona Workflow" -ForegroundColor Cyan
Write-Host "========================================"
Write-Host ""

# Discover image root without hard-coded Cyrillic source text.
$imageRoot = Get-ChildItem -LiteralPath "G:\1" -Directory -ErrorAction SilentlyContinue |
  ForEach-Object {
    $candidate = Join-Path $_.FullName "1_izobraznie"
    if (Test-Path -LiteralPath $candidate) { Get-Item -LiteralPath $candidate }
  } |
  Select-Object -First 1

if ($null -eq $imageRoot) {
  Write-Host "[FAIL] 1_izobraznie root not found under G:\1" -ForegroundColor Red
  exit 2
}

$mindForgeRoot = Join-Path $imageRoot.FullName "MindForge_Studio"
$workflow = Join-Path $mindForgeRoot "workflows\studio_character_v1.json"

if (-not (Test-Path -LiteralPath $workflow)) {
  Write-Host ("[FAIL] Workflow not found: " + $workflow) -ForegroundColor Red
  exit 3
}

$repoRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$outDir = Join-Path $repoRoot "benchmarks\persona_provenance"
New-Item -ItemType Directory -Force -Path $outDir | Out-Null
$outJson = Join-Path $outDir "studio_character_v1.normalized.json"
$outTxt = Join-Path $outDir "studio_character_v1.nodes.txt"

$py = @'
import json
import sys
from pathlib import Path

src = Path(sys.argv[1])
out_json = Path(sys.argv[2])
out_txt = Path(sys.argv[3])

with src.open("r", encoding="utf-8-sig") as f:
    data = json.load(f)

with out_json.open("w", encoding="utf-8") as f:
    json.dump(data, f, ensure_ascii=False, indent=2, sort_keys=True)

lines = []

def emit(s=""):
    print(s)
    lines.append(s)

emit(f"[SOURCE] {src}")
emit(f"[TYPE] {type(data).__name__}")

if isinstance(data, dict):
    if all(isinstance(v, dict) and "class_type" in v for v in data.values()):
        nodes = data
    elif "nodes" in data and isinstance(data["nodes"], list):
        nodes = {str(n.get("id", i)): n for i, n in enumerate(data["nodes"])}
    else:
        nodes = data
else:
    nodes = {}

emit("")
emit("[NODE INVENTORY]")

for node_id, node in nodes.items():
    if not isinstance(node, dict):
        continue

    class_type = node.get("class_type") or node.get("type") or node.get("title") or "<unknown>"
    emit(f"NODE {node_id}: {class_type}")

    inputs = node.get("inputs")
    if isinstance(inputs, dict):
        for key, value in inputs.items():
            emit(f"  {key}: {json.dumps(value, ensure_ascii=False)}")
    elif isinstance(inputs, list):
        emit("  inputs(list): " + json.dumps(inputs, ensure_ascii=False))
    else:
        for key in ("widgets_values", "properties"):
            if key in node:
                emit(f"  {key}: {json.dumps(node[key], ensure_ascii=False)}")

    emit("")

with out_txt.open("w", encoding="utf-8") as f:
    f.write("\n".join(lines))

print("[SAVED]", out_json)
print("[SAVED]", out_txt)
'@

$tempPy = Join-Path $env:TEMP "father_inspect_persona_workflow.py"
Set-Content -LiteralPath $tempPy -Value $py -Encoding UTF8

$python = (Get-Command python.exe -ErrorAction SilentlyContinue).Source
if (-not $python) {
  Write-Host "[FAIL] python.exe not found in PATH." -ForegroundColor Red
  exit 4
}

& $python $tempPy $workflow $outJson $outTxt

if ($LASTEXITCODE -ne 0) {
  Write-Host ("[FAIL] Workflow inspection exit code: " + $LASTEXITCODE) -ForegroundColor Red
  exit $LASTEXITCODE
}

Write-Host ""

$publisher = Join-Path $repoRoot "PUBLISH_EVIDENCE.ps1"
if (Test-Path -LiteralPath $publisher) {
  Write-Host "[PUBLISH] Sending selected evidence files to GitHub..." -ForegroundColor Yellow
  & $publisher -Paths @($outJson, $outTxt) -Message "evidence: publish persona workflow inspection"
} else {
  Write-Host "[WARN] Evidence publisher not found. Files remain local only." -ForegroundColor DarkYellow
}

Write-Host ""
Write-Host "[done] Workflow inspection complete. No legacy/runtime files were modified." -ForegroundColor Cyan
