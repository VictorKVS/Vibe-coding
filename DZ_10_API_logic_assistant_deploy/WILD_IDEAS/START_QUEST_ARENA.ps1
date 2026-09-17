param(
    [switch]$Push,
    [switch]$SkipInstall,
    [string]$Quest = 'Q-KB-001',
    [string]$Composition = 'single',
    [string]$Model1 = 'demo'
)

$ErrorActionPreference = 'Stop'
Set-Location $PSScriptRoot

Write-Host '=== ALINA QUEST ARENA ===' -ForegroundColor Cyan
Write-Host "Folder: $PSScriptRoot"

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    throw 'Node.js not found. Install Node.js >= 22.13.0 first.'
}
if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
    throw 'npm not found.'
}

$nodeVersion = node --version
Write-Host "Node: $nodeVersion"

if (-not $SkipInstall) {
    Write-Host 'Installing exact dependencies with npm ci...' -ForegroundColor Yellow
    npm ci
    if ($LASTEXITCODE -ne 0) { throw 'npm ci failed.' }
}

$devCommand = "Set-Location -LiteralPath '$PSScriptRoot'; npm run dev"
Write-Host 'Starting WILD_IDEAS dev server in a separate PowerShell window...' -ForegroundColor Yellow
Start-Process powershell -ArgumentList '-NoExit','-ExecutionPolicy','Bypass','-Command',$devCommand | Out-Null

$healthUrl = 'http://127.0.0.1:3000/api/llm'
$ready = $false
for ($i = 0; $i -lt 60; $i++) {
    try {
        $response = Invoke-WebRequest -Uri $healthUrl -UseBasicParsing -TimeoutSec 2
        if ($response.StatusCode -eq 200) {
            $ready = $true
            break
        }
    } catch {
        Start-Sleep -Seconds 1
    }
}

if (-not $ready) {
    throw "Dev server did not become ready at $healthUrl within 60 seconds. Check the server window."
}

Write-Host 'Server ready.' -ForegroundColor Green
Write-Host "Running first smoke quest: $Quest / $Composition / M1=$Model1" -ForegroundColor Cyan

$argsList = @('run','quest:run','--',"--quest=$Quest", "--composition=$Composition", "--model.M1=$Model1")
if ($Push) { $argsList += '--push' }

& npm @argsList
if ($LASTEXITCODE -ne 0) { throw 'Quest run failed.' }

Write-Host ''
Write-Host 'Smoke quest completed.' -ForegroundColor Green
Write-Host 'Result: quest-runs/pending/'
Write-Host 'Model Lab: http://127.0.0.1:3000/model-lab'

Start-Process 'http://127.0.0.1:3000/model-lab'

if (-not $Push) {
    Write-Host ''
    Write-Host 'When the result looks good, rerun with -Push to commit and push the run file to GitHub:' -ForegroundColor Yellow
    Write-Host '.\START_QUEST_ARENA.ps1 -Push'
}
