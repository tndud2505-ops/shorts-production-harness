param([switch]$PrepareVoice)
$ErrorActionPreference = 'Stop'
$ProjectRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
Push-Location -LiteralPath $ProjectRoot
try {
    if ($PrepareVoice) {
        & ./scripts/run-qwen.ps1 --episode ep08-full-reference --profile voices/profiles/youtube-XIbUKM89IJI.json --model models/Qwen3-TTS-12Hz-0.6B-Base --non-streaming-mode --temperature 0.45 --top-p 0.8 --seed 42
        if ($LASTEXITCODE -ne 0) { throw 'Voice preparation failed; existing outputs preserved.' }
    }
    & node scripts/refresh-preview.mjs ep08-full-reference
    if ($LASTEXITCODE -ne 0) { throw 'Runtime synchronization failed.' }
    & node scripts/production.mjs render --episode ep08-full-reference
    if ($LASTEXITCODE -ne 0) { throw 'Rendering failed.' }
} finally { Pop-Location }
