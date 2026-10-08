param(
    [ValidateSet("smoke","full")]
    [string]$Mode = "smoke"
)

$ErrorActionPreference = "Stop"

$Factory =
    Split-Path -Parent $MyInvocation.MyCommand.Path

$Common =
    Join-Path $Factory "00_COMMON"

$Prompt =
    Get-Content `
        (Join-Path $Common "PROMPT.md") `
        -Raw

$OriginalInput =
    Get-Content `
        (Join-Path $Common "INPUT.json") `
        -Raw

$PromptHash =
    (Get-FileHash `
        (Join-Path $Common "PROMPT.md") `
        -Algorithm SHA256).Hash

$InputHash =
    (Get-FileHash `
        (Join-Path $Common "INPUT.json") `
        -Algorithm SHA256).Hash


# ==========================================
# RUN ID
# ==========================================

$RunId =
    Get-Date -Format "yyyyMMdd-HHmmss"

$RunRoot =
    Join-Path `
        (Join-Path $Factory "RUNS") `
        $RunId

New-Item `
    -ItemType Directory `
    -Force `
    $RunRoot |
    Out-Null


# ==========================================
# COPY COMMON EVIDENCE
# ==========================================

$RunCommon =
    Join-Path $RunRoot "00_COMMON"

New-Item `
    -ItemType Directory `
    -Force `
    $RunCommon |
    Out-Null

Copy-Item `
    (Join-Path $Common "PROMPT.md") `
    (Join-Path $RunCommon "PROMPT.md")

Copy-Item `
    (Join-Path $Common "INPUT.json") `
    (Join-Path $RunCommon "INPUT.json")


# ==========================================
# MODELS
# ==========================================

if ($Mode -eq "smoke") {

    $Stages = @(
        @{
            order = 1
            id    = "llama32_1b"
            model = "llama3.2:1b"
        },

        @{
            order = 2
            id    = "qwen25_3b"
            model = "qwen2.5:3b"
        },

        @{
            order = 3
            id    = "qwen25_7b"
            model = "qwen2.5:7b"
        }
    )
}
else {

    $Stages = @(
        @{
            order = 1
            id    = "llama32_1b"
            model = "llama3.2:1b"
        },

        @{
            order = 2
            id    = "qwen25_3b"
            model = "qwen2.5:3b"
        },

        @{
            order = 3
            id    = "qwen25_coder_15b"
            model = "qwen2.5-coder:1.5b"
        },

        @{
            order = 4
            id    = "qwen25_7b"
            model = "qwen2.5:7b"
        },

        @{
            order = 5
            id    = "qwen25_coder_7b"
            model = "qwen2.5-coder:7b-instruct-q4_K_M"
        },

        @{
            order = 6
            id    = "deepseek_r1_7b"
            model = "deepseek-r1:7b"
        },

        @{
            order = 7
            id    = "qwen3_vl_8b"
            model = "qwen3-vl:8b-instruct-q4_K_M"
        }
    )
}


# ==========================================
# OLLAMA HEALTH
# ==========================================

Write-Host ""
Write-Host "=== OLLAMA HEALTH ==="

$Tags =
    Invoke-RestMethod `
        "http://127.0.0.1:11434/api/tags" `
        -TimeoutSec 10

$Available =
    @(
        $Tags.models |
        ForEach-Object {
            $_.name
        }
    )

Write-Host "AVAILABLE:" $Available.Count


# ==========================================
# PRODUCT CHAIN
# ==========================================

$PreviousProduct = ""

$ManifestStages = @()


foreach ($Stage in $Stages) {

    $Number =
        "{0:D2}" -f $Stage.order

    $StageName =
        "${Number}_$($Stage.id)"

    $StageDir =
        Join-Path `
            $RunRoot `
            $StageName

    New-Item `
        -ItemType Directory `
        -Force `
        $StageDir |
        Out-Null


    Write-Host ""
    Write-Host "=========================================="
    Write-Host " STAGE $Number"
    Write-Host " MODEL:" $Stage.model
    Write-Host "=========================================="


    if ($Available -notcontains $Stage.model) {

        Write-Host "SKIP — model unavailable."

        $Meta = [ordered]@{
            order       = $Stage.order
            id          = $Stage.id
            model       = $Stage.model
            provider    = "ollama"
            status      = "skipped"
            reason      = "model unavailable"
            prompt_hash = $PromptHash
            input_hash  = $InputHash
        }

        $Meta |
            ConvertTo-Json -Depth 10 |
            Set-Content `
                (Join-Path $StageDir "meta.json") `
                -Encoding UTF8

        $ManifestStages += $Meta

        continue
    }


    # ======================================
    # SAME BASE PROMPT + SAME ORIGINAL INPUT
    # + PREVIOUS PRODUCT
    # ======================================

    $UserMessage = @"
ORIGINAL_INPUT

$OriginalInput


PREVIOUS_PRODUCT

$PreviousProduct


Create the complete improved product now.
"@


    $Request = [ordered]@{

        model = $Stage.model

        stream = $false

        format = "json"

        options = @{
            temperature = 0.2
        }

        messages = @(
            @{
                role    = "system"
                content = $Prompt
            },

            @{
                role    = "user"
                content = $UserMessage
            }
        )
    }


    $Request |
        ConvertTo-Json -Depth 20 |
        Set-Content `
            (Join-Path $StageDir "request.json") `
            -Encoding UTF8


    $Started =
        Get-Date

    try {

        $Response =
            Invoke-RestMethod `
                -Uri "http://127.0.0.1:11434/api/chat" `
                -Method Post `
                -ContentType "application/json; charset=utf-8" `
                -Body (
                    $Request |
                    ConvertTo-Json -Depth 20
                ) `
                -TimeoutSec 600


        $Elapsed =
            [math]::Round(
                (
                    (Get-Date) -
                    $Started
                ).TotalSeconds,
                3
            )


        $Raw =
            [string]$Response.message.content


        $Raw |
            Set-Content `
                (Join-Path $StageDir "raw.txt") `
                -Encoding UTF8


        try {

            $ProductObject =
                $Raw |
                ConvertFrom-Json

            $ProductObject |
                ConvertTo-Json -Depth 30 |
                Set-Content `
                    (Join-Path $StageDir "product.json") `
                    -Encoding UTF8

            $PreviousProduct =
                $ProductObject |
                ConvertTo-Json -Depth 30


            $Status =
                "completed"
        }
        catch {

            $PreviousProduct =
                $Raw

            $Status =
                "completed_raw_invalid_json"
        }


        $Meta = [ordered]@{

            order =
                $Stage.order

            id =
                $Stage.id

            provider =
                "ollama"

            model =
                $Stage.model

            status =
                $Status

            elapsed_seconds =
                $Elapsed

            prompt_hash =
                $PromptHash

            input_hash =
                $InputHash

            previous_product_used =
                ($Stage.order -gt 1)

            completed_at =
                (Get-Date).ToString("o")
        }


        $Meta |
            ConvertTo-Json -Depth 10 |
            Set-Content `
                (Join-Path $StageDir "meta.json") `
                -Encoding UTF8


        $ManifestStages +=
            $Meta


        Write-Host "PASS"
        Write-Host "TIME:" $Elapsed "sec"
        Write-Host "STATUS:" $Status
    }

    catch {

        $Elapsed =
            [math]::Round(
                (
                    (Get-Date) -
                    $Started
                ).TotalSeconds,
                3
            )


        $Meta = [ordered]@{

            order =
                $Stage.order

            id =
                $Stage.id

            provider =
                "ollama"

            model =
                $Stage.model

            status =
                "failed"

            elapsed_seconds =
                $Elapsed

            error =
                $_.Exception.Message

            prompt_hash =
                $PromptHash

            input_hash =
                $InputHash
        }


        $Meta |
            ConvertTo-Json -Depth 10 |
            Set-Content `
                (Join-Path $StageDir "meta.json") `
                -Encoding UTF8


        $ManifestStages +=
            $Meta


        Write-Host "FAIL"
        Write-Host $_.Exception.Message
    }
}


# ==========================================
# FINAL
# ==========================================

$FinalDir =
    Join-Path $RunRoot "FINAL"

New-Item `
    -ItemType Directory `
    -Force `
    $FinalDir |
    Out-Null


$PreviousProduct |
    Set-Content `
        (Join-Path $FinalDir "PRODUCT.json") `
        -Encoding UTF8


$Manifest =
    [ordered]@{

        run_id =
            $RunId

        mode =
            $Mode

        architecture =
            "ALINA Multi-LLM Sequential Factory"

        prompt_sha256 =
            $PromptHash

        input_sha256 =
            $InputHash

        started_models =
            $Stages.Count

        stages =
            $ManifestStages

        final_product =
            "FINAL/PRODUCT.json"
    }


$Manifest |
    ConvertTo-Json -Depth 30 |
    Set-Content `
        (Join-Path $FinalDir "MANIFEST.json") `
        -Encoding UTF8


Write-Host ""
Write-Host "=========================================="
Write-Host " FACTORY RUN COMPLETE"
Write-Host "=========================================="

Write-Host "RUN:"
Write-Host $RunRoot

Write-Host ""
Write-Host "FINAL:"
Write-Host (
    Join-Path `
        $FinalDir `
        "PRODUCT.json"
)

Write-Host ""
Write-Host "PROMPT HASH:"
Write-Host $PromptHash

Write-Host ""
Write-Host "INPUT HASH:"
Write-Host $InputHash

Write-Host ""
Write-Host "=== STAGES ==="

$ManifestStages |
    Format-Table `
        order,
        model,
        status,
        elapsed_seconds `
        -AutoSize
