$ErrorActionPreference = 'Stop'

Write-Host '=== SONYA Local Diagnostics ===' -ForegroundColor Cyan

Write-Host "`n[Node]" -ForegroundColor Yellow
node --version
npm --version

Write-Host "`n[Ollama]" -ForegroundColor Yellow
ollama --version
$tags = Invoke-RestMethod http://127.0.0.1:11434/api/tags
$tags.models | Select-Object name, size | Format-Table -AutoSize

Write-Host "`n[Expected model]" -ForegroundColor Yellow
$model = if ($env:SONYA_VISION_MODEL) { $env:SONYA_VISION_MODEL } else { 'llava:7b' }
Write-Host $model

Write-Host "`n[Local API]" -ForegroundColor Yellow
try {
    Invoke-RestMethod http://127.0.0.1:8787/api/_healthcheck | ConvertTo-Json -Depth 5
} catch {
    Write-Host 'Local API is not running yet. Start npm run dev first.' -ForegroundColor DarkYellow
}

Write-Host "`nDiagnostics complete." -ForegroundColor Green
