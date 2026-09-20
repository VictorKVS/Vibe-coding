$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "FATHER MindForge Telegram Recovery Audit" -ForegroundColor Cyan
Write-Host "======================================="
Write-Host ""

$repoRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$outDir = Join-Path $repoRoot "benchmarks\mindforge_telegram"
New-Item -ItemType Directory -Force -Path $outDir | Out-Null

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

if (-not (Test-Path -LiteralPath $mindForgeRoot)) {
  Write-Host ("[FAIL] MindForge Studio not found: " + $mindForgeRoot) -ForegroundColor Red
  exit 3
}

$extensions = @(".py",".ps1",".json",".yaml",".yml",".md",".txt",".js",".ts",".tsx",".html",".bat",".cmd")
$pathPattern = "telegram|tg|bot|dialog|conversation|chat|message|aiogram|telethon|tdlib|webhook|polling|fsm|state|keyboard|callback"
$contentPattern = "(?i)telegram|aiogram|telethon|tdlib|bot[_-]?token|send_message|callback_query|InlineKeyboard|ReplyKeyboard|start_polling|webhook|Dispatcher|FSMContext|StatesGroup|conversation|dialog|chat_id"

$files = Get-ChildItem -LiteralPath $mindForgeRoot -Recurse -File -ErrorAction SilentlyContinue |
  Where-Object {
    $extensions -contains $_.Extension.ToLowerInvariant() -and
    $_.FullName -notmatch "\\.git\\|\\node_modules\\|\\venv\\|\\\.venv\\|\\__pycache__\\|\\models\\|\\output\\|\\outputs\\"
  }

$results = New-Object System.Collections.Generic.List[object]

foreach ($file in $files) {
  $relative = $file.FullName.Substring($mindForgeRoot.Length).TrimStart("\")
  $pathHit = $relative -match $pathPattern

  $content = Get-Content -LiteralPath $file.FullName -Raw -ErrorAction SilentlyContinue
  if ($null -eq $content) { continue }

  $matches = [regex]::Matches($content, $contentPattern) |
    ForEach-Object { $_.Value.ToLowerInvariant() } |
    Sort-Object -Unique

  if (-not $pathHit -and $matches.Count -eq 0) { continue }

  $hash = (Get-FileHash -LiteralPath $file.FullName -Algorithm SHA256).Hash

  $safeLines = New-Object System.Collections.Generic.List[string]
  $lineNo = 0
  foreach ($line in ($content -split "`r?`n")) {
    $lineNo++
    if ($line -match $contentPattern) {
      $redacted = $line
      $redacted = [regex]::Replace($redacted, '(?i)(bot[_-]?token|api[_-]?key|access[_-]?token|secret|password)\s*[:=]\s*["'']?[^"'']+["'']?', '$1=<REDACTED>')
      $redacted = [regex]::Replace($redacted, '(?i)Bearer\s+[A-Za-z0-9_\-\.]+', 'Bearer <REDACTED>')
      if ($redacted.Length -gt 500) { $redacted = $redacted.Substring(0,500) + "..." }
      $safeLines.Add(("L{0}: {1}" -f $lineNo, $redacted.Trim()))
    }
    if ($safeLines.Count -ge 20) { break }
  }

  $results.Add([ordered]@{
    relative_path = $relative.Replace("\","/")
    full_path = $file.FullName
    size_bytes = $file.Length
    last_write_time = $file.LastWriteTime.ToString("o")
    sha256 = $hash
    path_match = $pathHit
    keyword_hits = @($matches)
    excerpts = @($safeLines)
  })
}

$jsonPath = Join-Path $outDir "mindforge_telegram_inventory.json"
$txtPath = Join-Path $outDir "mindforge_telegram_inventory.txt"

$document = [ordered]@{
  generated_at = (Get-Date).ToString("o")
  source_root = $mindForgeRoot
  matched_files = $results.Count
  files = $results
}

$document | ConvertTo-Json -Depth 20 | Set-Content -LiteralPath $jsonPath -Encoding UTF8

$txt = New-Object System.Collections.Generic.List[string]
$txt.Add("FATHER MindForge Telegram Recovery Inventory")
$txt.Add("==========================================")
$txt.Add("")
$txt.Add("Source: " + $mindForgeRoot)
$txt.Add("Matched files: " + $results.Count)
$txt.Add("")

foreach ($item in $results) {
  $txt.Add("[FILE] " + $item.relative_path)
  $txt.Add("  size: " + $item.size_bytes)
  $txt.Add("  sha256: " + $item.sha256)
  $txt.Add("  keywords: " + (($item.keyword_hits) -join ", "))
  foreach ($excerpt in $item.excerpts) {
    $txt.Add("  " + $excerpt)
  }
  $txt.Add("")
}

$txt | Set-Content -LiteralPath $txtPath -Encoding UTF8

Write-Host ("[OK] Matched files: " + $results.Count) -ForegroundColor Green
Write-Host ("[SAVED] " + $jsonPath)
Write-Host ("[SAVED] " + $txtPath)

$publisher = Join-Path $repoRoot "PUBLISH_EVIDENCE.ps1"
if (Test-Path -LiteralPath $publisher) {
  Write-Host ""
  Write-Host "[PUBLISH] Sending MindForge Telegram inventory to GitHub..." -ForegroundColor Yellow
  & $publisher -Paths @($jsonPath, $txtPath) -Message "evidence: publish MindForge Telegram recovery inventory"
} else {
  Write-Host "[WARN] Evidence publisher not found. Inventory remains local only." -ForegroundColor DarkYellow
}

Write-Host ""
Write-Host "[done] Telegram recovery audit complete. Legacy MindForge files were not modified." -ForegroundColor Cyan
