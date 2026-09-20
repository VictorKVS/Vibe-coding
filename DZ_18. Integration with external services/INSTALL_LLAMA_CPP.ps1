$ErrorActionPreference = "Stop"

Write-Host ""
Write-Host "FATHER llama.cpp installer" -ForegroundColor Cyan
Write-Host "=========================="
Write-Host ""

$existing = Get-Command llama-cli -CommandType Application -ErrorAction SilentlyContinue
if ($existing) {
  Write-Host ("llama.cpp already installed: " + $existing.Source) -ForegroundColor Green
  llama-cli --version
  Write-Host ""
  llama-cli --list-devices 2>&1
  exit 0
}

if (-not (Get-Command winget -ErrorAction SilentlyContinue)) {
  throw "winget is not available."
}

Write-Host "[install] Official llama.cpp package via winget..." -ForegroundColor Yellow
winget install --id ggml.llamacpp -e --accept-package-agreements --accept-source-agreements

Write-Host ""
Write-Host "Refreshing PATH for current PowerShell..." -ForegroundColor Yellow

$machinePath = [Environment]::GetEnvironmentVariable("Path", "Machine")
$userPath = [Environment]::GetEnvironmentVariable("Path", "User")
$env:Path = "$machinePath;$userPath"

$cli = Get-Command llama-cli -CommandType Application -ErrorAction SilentlyContinue

if (-not $cli) {
  Write-Host "llama-cli is not visible through PATH. Searching WinGet folders..." -ForegroundColor Yellow

  $searchRoots = @(
    "$env:LOCALAPPDATA\Microsoft\WinGet\Links",
    "$env:LOCALAPPDATA\Microsoft\WinGet\Packages"
  )

  $cliFile = $null

  foreach ($root in $searchRoots) {
    if (-not (Test-Path $root)) { continue }

    $cliFile = Get-ChildItem $root -Recurse -File -Filter "llama-cli.exe" -ErrorAction SilentlyContinue |
      Select-Object -First 1

    if ($cliFile) { break }
  }

  if ($cliFile) {
    Write-Host ("Found llama-cli.exe: " + $cliFile.FullName) -ForegroundColor Green

    $cliDir = $cliFile.DirectoryName

    if (($env:Path -split ";") -notcontains $cliDir) {
      $env:Path = "$cliDir;$env:Path"
      Write-Host ("Added to current-session PATH: " + $cliDir) -ForegroundColor Green
    }

    $cli = Get-Command llama-cli -CommandType Application -ErrorAction SilentlyContinue

    if (-not $cli) {
      Write-Host "PATH alias still unavailable; using full executable path." -ForegroundColor Yellow
      & $cliFile.FullName --version
      Write-Host ""
      Write-Host "[devices]" -ForegroundColor Yellow
      & $cliFile.FullName --list-devices 2>&1
      exit 0
    }
  }
}

if (-not $cli) {
  Write-Host "llama.cpp is installed according to winget, but llama-cli.exe was not found in WinGet Links/Packages." -ForegroundColor Red
  Write-Host "Run:"
  Write-Host '  winget list llama.cpp'
  Write-Host '  Get-ChildItem "$env:LOCALAPPDATA\Microsoft\WinGet" -Recurse -Filter "llama-cli.exe" -ErrorAction SilentlyContinue | Select-Object FullName'
  exit 1
}

Write-Host ("Installed: " + $cli.Source) -ForegroundColor Green
& $cli.Source --version

Write-Host ""
Write-Host "[devices]" -ForegroundColor Yellow
& $cli.Source --list-devices 2>&1

Write-Host ""
Write-Host "[done]" -ForegroundColor Cyan
