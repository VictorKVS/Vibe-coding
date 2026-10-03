$ErrorActionPreference = "Continue"

$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $Root

$Ports = @(
    @{ Name = "Ollama";     Port = 11434 },
    @{ Name = "ComfyUI";    Port = 8188  },
    @{ Name = "FATHER API"; Port = 8010  },
    @{ Name = "DZ18 API";   Port = 5190  },
    @{ Name = "DZ18 WEB";   Port = 5188  }
)

Write-Host ""
Write-Host "============================================================"
Write-Host "                   FATHER PLATFORM STATUS"
Write-Host "============================================================"

foreach ($item in $Ports) {

    $listener = Get-NetTCPConnection `
        -LocalPort $item.Port `
        -State Listen `
        -ErrorAction SilentlyContinue |
        Select-Object -First 1

    if ($listener) {

        $proc = Get-CimInstance Win32_Process `
            -Filter "ProcessId=$($listener.OwningProcess)" `
            -ErrorAction SilentlyContinue

        Write-Host (
            "{0,-18} :{1,-6} READY   PID={2,-7} {3}" -f `
            $item.Name,
            $item.Port,
            $listener.OwningProcess,
            $proc.Name
        ) -ForegroundColor Green
    }
    else {
        Write-Host (
            "{0,-18} :{1,-6} STOPPED" -f `
            $item.Name,
            $item.Port
        ) -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "CAPABILITIES" -ForegroundColor Cyan

try {
    $health = Invoke-RestMethod `
        "http://127.0.0.1:8010/api/father/health" `
        -TimeoutSec 5

    Write-Host "TEXT       $($health.services.llm.status.ToUpper())"
    Write-Host "VOICE IN   $($health.services.stt.status.ToUpper())"
    Write-Host "VOICE OUT  $($health.services.tts.status.ToUpper())"
    Write-Host "IMAGE      $($health.services.image.status.ToUpper())"

    Write-Host ""
    Write-Host "Registered models: $($health.registered_models.Count)"
}
catch {
    Write-Host "FATHER health endpoint unavailable." -ForegroundColor Yellow
}

Write-Host ""
