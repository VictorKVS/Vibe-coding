$ErrorActionPreference = "Continue"

Write-Host ""
Write-Host "FATHER Local AI Hardware Check" -ForegroundColor Cyan
Write-Host "================================"
Write-Host ""

Write-Host "[CPU]" -ForegroundColor Yellow
Get-CimInstance Win32_Processor |
  Select-Object Name, NumberOfCores, NumberOfLogicalProcessors, MaxClockSpeed |
  Format-Table -AutoSize

Write-Host "[RAM]" -ForegroundColor Yellow
$cs = Get-CimInstance Win32_ComputerSystem
$os = Get-CimInstance Win32_OperatingSystem

[PSCustomObject]@{
  TotalGB = [math]::Round($cs.TotalPhysicalMemory / 1GB, 2)
  FreeGB = [math]::Round($os.FreePhysicalMemory * 1KB / 1GB, 2)
} | Format-Table -AutoSize

Write-Host "[GPU - Windows]" -ForegroundColor Yellow
Get-CimInstance Win32_VideoController |
  Select-Object Name,
    @{N="AdapterRAM_GB";E={
      if ($_.AdapterRAM) { [math]::Round($_.AdapterRAM / 1GB, 2) } else { $null }
    }},
    DriverVersion |
  Format-Table -AutoSize

Write-Host "[NVIDIA SMI]" -ForegroundColor Yellow
if (Get-Command nvidia-smi -ErrorAction SilentlyContinue) {
  nvidia-smi --query-gpu=name,memory.total,memory.free,driver_version --format=csv,noheader
}
else {
  Write-Host "nvidia-smi: not found"
}

Write-Host ""
Write-Host "[Python]" -ForegroundColor Yellow
if (Get-Command python -ErrorAction SilentlyContinue) {
  python --version
}
else {
  Write-Host "python: not found"
}

Write-Host ""
Write-Host "[PyTorch / CUDA]" -ForegroundColor Yellow
if (Get-Command python -ErrorAction SilentlyContinue) {
  python -c @'
try:
    import torch
    print("torch:", torch.__version__)
    print("cuda_available:", torch.cuda.is_available())
    print("cuda_version:", torch.version.cuda)
    if torch.cuda.is_available():
        print("gpu:", torch.cuda.get_device_name(0))
        props = torch.cuda.get_device_properties(0)
        print("vram_gb:", round(props.total_memory / 1024**3, 2))
except Exception as e:
    print("torch_check_error:", repr(e))
'@
}

Write-Host ""
Write-Host "[llama.cpp]" -ForegroundColor Yellow

$commands = @("llama-cli", "llama-server", "main")
foreach ($cmd in $commands) {
  $found = Get-Command $cmd -ErrorAction SilentlyContinue
  if ($found) {
    Write-Host ("{0}: {1}" -f $cmd, $found.Source)
  }
}

if (-not (Get-Command llama-cli -ErrorAction SilentlyContinue) -and
    -not (Get-Command llama-server -ErrorAction SilentlyContinue) -and
    -not (Get-Command main -ErrorAction SilentlyContinue)) {
  Write-Host "llama.cpp executable: not found in PATH"
}

Write-Host ""
Write-Host "[Disk - Model root]" -ForegroundColor Yellow
$modelRoot = Join-Path $PSScriptRoot "models"
if (Test-Path $modelRoot) {
  $drive = Get-PSDrive -Name ([IO.Path]::GetPathRoot($modelRoot).Substring(0,1))
  [PSCustomObject]@{
    ModelRoot = $modelRoot
    Drive = $drive.Name
    FreeGB = [math]::Round($drive.Free / 1GB, 2)
    UsedGB = [math]::Round($drive.Used / 1GB, 2)
  } | Format-Table -AutoSize
}

Write-Host ""
Write-Host "[done] Copy this report back to the FATHER Model Zoo benchmark." -ForegroundColor Cyan
