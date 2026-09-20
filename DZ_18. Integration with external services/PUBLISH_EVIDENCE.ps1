param(
  [Parameter(Mandatory = $true)]
  [string[]]$Paths,

  [string]$Message = "evidence: publish generated diagnostics"
)

$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "FATHER Evidence Publisher" -ForegroundColor Cyan
Write-Host "========================="

$git = Get-Command git.exe -ErrorAction SilentlyContinue
if (-not $git) {
  Write-Host "[PUBLISH BLOCKED] git.exe not found in PATH." -ForegroundColor Red
  return
}

$repoRoot = (& git rev-parse --show-toplevel 2>$null).Trim()
if (-not $repoRoot) {
  Write-Host "[PUBLISH BLOCKED] Current path is not inside a Git repository." -ForegroundColor Red
  return
}

$branch = (& git branch --show-current 2>$null).Trim()
if (-not $branch) {
  Write-Host "[PUBLISH BLOCKED] Detached HEAD. Evidence was kept locally only." -ForegroundColor Red
  return
}

$allowedRoot = Join-Path $repoRoot "DZ_18. Integration with external services\benchmarks"
$allowedRootFull = [System.IO.Path]::GetFullPath($allowedRoot).TrimEnd('\')

$allowedExtensions = @(
  ".json",
  ".txt",
  ".md",
  ".csv",
  ".yaml",
  ".yml"
)

$maxBytes = 10MB

$filesToPublish = New-Object System.Collections.Generic.List[string]

foreach ($inputPath in $Paths) {
  if (-not (Test-Path -LiteralPath $inputPath)) {
    Write-Host ("[SKIP] Missing evidence path: " + $inputPath) -ForegroundColor DarkYellow
    continue
  }

  $item = Get-Item -LiteralPath $inputPath

  $candidates = if ($item.PSIsContainer) {
    Get-ChildItem -LiteralPath $item.FullName -Recurse -File -ErrorAction SilentlyContinue
  } else {
    @($item)
  }

  foreach ($file in $candidates) {
    $full = [System.IO.Path]::GetFullPath($file.FullName)

    if (-not $full.StartsWith($allowedRootFull + "\", [System.StringComparison]::OrdinalIgnoreCase)) {
      Write-Host ("[SKIP] Outside evidence allowlist: " + $full) -ForegroundColor DarkYellow
      continue
    }

    if ($allowedExtensions -notcontains $file.Extension.ToLowerInvariant()) {
      Write-Host ("[SKIP] Extension not allowed for auto-publish: " + $file.Name) -ForegroundColor DarkYellow
      continue
    }

    if ($file.Length -gt $maxBytes) {
      Write-Host ("[SKIP] Evidence file exceeds 10 MB: " + $file.FullName) -ForegroundColor DarkYellow
      continue
    }

    $content = Get-Content -LiteralPath $file.FullName -Raw -ErrorAction SilentlyContinue

    if ($null -ne $content) {
      $secretPatterns = @(
        '(?i)(api[_-]?key|access[_-]?token|secret|password)\s*[:=]\s*["'']?[A-Za-z0-9_\-\.]{12,}',
        'sk-[A-Za-z0-9_\-]{20,}',
        '(?i)Bearer\s+[A-Za-z0-9_\-\.]{16,}'
      )

      $secretHit = $false
      foreach ($pattern in $secretPatterns) {
        if ($content -match $pattern) {
          $secretHit = $true
          break
        }
      }

      if ($secretHit) {
        Write-Host ("[SKIP SECURITY] Possible secret detected: " + $file.FullName) -ForegroundColor Red
        continue
      }
    }

    $relative = $full.Substring($repoRoot.Length).TrimStart('\').Replace('\', '/')
    $filesToPublish.Add($relative)
  }
}

$filesToPublish = @($filesToPublish | Sort-Object -Unique)

if ($filesToPublish.Count -eq 0) {
  Write-Host "[PUBLISH] No eligible changed evidence files." -ForegroundColor Yellow
  return
}

Push-Location $repoRoot

try {
  Write-Host ("[PUBLISH] Branch: " + $branch)
  Write-Host "[PUBLISH] Eligible files:"
  $filesToPublish | ForEach-Object { Write-Host ("  " + $_) }

  & git add -- $filesToPublish
  if ($LASTEXITCODE -ne 0) {
    Write-Host "[PUBLISH BLOCKED] git add failed." -ForegroundColor Red
    return
  }

  & git diff --cached --quiet -- $filesToPublish
  if ($LASTEXITCODE -eq 0) {
    Write-Host "[PUBLISH] Nothing changed; GitHub already has the same evidence." -ForegroundColor Green
    return
  }

  & git commit -m $Message -- $filesToPublish
  if ($LASTEXITCODE -ne 0) {
    Write-Host "[PUBLISH BLOCKED] git commit failed. Evidence remains local/staged." -ForegroundColor Red
    return
  }

  & git push origin $branch
  if ($LASTEXITCODE -ne 0) {
    Write-Host "[PUBLISH BLOCKED] git push failed. The commit is local; do not delete it." -ForegroundColor Red
    Write-Host "[PUBLISH BLOCKED] Usually this means the remote branch advanced. Pull/rebase deliberately, then push." -ForegroundColor Yellow
    return
  }

  $commit = (& git rev-parse --short HEAD).Trim()
  Write-Host ("[PUBLISHED] " + $commit + " -> origin/" + $branch) -ForegroundColor Green
} finally {
  Pop-Location
}
