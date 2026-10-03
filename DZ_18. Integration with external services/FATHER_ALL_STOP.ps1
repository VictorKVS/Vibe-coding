param(
    [switch]$IncludeOllama
)

$ErrorActionPreference = "Continue"

function Stop-OwnedPort {
    param(
        [int]$Port,
        [string]$Name,
        [string[]]$Patterns
    )

    $listeners = Get-NetTCPConnection `
        -LocalPort $Port `
        -State Listen `
        -ErrorAction SilentlyContinue

    foreach ($listener in $listeners) {

        $proc = Get-CimInstance Win32_Process `
            -Filter "ProcessId=$($listener.OwningProcess)" `
            -ErrorAction SilentlyContinue

        if (-not $proc) {
            continue
        }

        $owned = $false

        foreach ($pattern in $Patterns) {
            if ($proc.CommandLine -match $pattern) {
                $owned = $true
                break
            }
        }

        if ($owned) {

            Write-Host (
                "Stopping {0} PID={1}" -f `
                $Name,
                $proc.ProcessId
            ) -ForegroundColor Yellow

            Stop-Process `
                -Id $proc.ProcessId `
                -Force `
                -ErrorAction SilentlyContinue
        }
        else {
            Write-Host (
                "Skipping :{0}; process not recognized as FATHER-owned." -f $Port
            ) -ForegroundColor DarkYellow
        }
    }
}

Write-Host ""
Write-Host "============================================================"
Write-Host "                    FATHER PLATFORM STOP"
Write-Host "============================================================"

Stop-OwnedPort `
    5188 `
    "DZ18 WEB" `
    @("vite")

Stop-OwnedPort `
    5190 `
    "DZ18 API" `
    @("server[\\/]index\.mjs")

Stop-OwnedPort `
    8010 `
    "FATHER API" `
    @("father\.runtime\.api\.app", "uvicorn")

Stop-OwnedPort `
    8188 `
    "ComfyUI" `
    @("ComfyUI[\\/]main\.py", "ComfyUI\\main\.py")

if ($IncludeOllama) {

    Stop-OwnedPort `
        11434 `
        "Ollama" `
        @("ollama.*serve", "ollama\.exe")
}
else {
    Write-Host "Ollama left running. Use -IncludeOllama to stop it."
}

Start-Sleep -Seconds 2

Write-Host ""
Write-Host "STOP COMPLETE"
Write-Host ""
