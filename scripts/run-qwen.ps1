<#
.SYNOPSIS
Prepare sentence-level local Qwen TTS audio and Remotion runtime props only.
.DESCRIPTION
Pass Python-style arguments through to scripts/tts/qwen_local.py in .venv-qwen.
Dependencies, official vendor/qwen3-tts source, model weights/tokenizer and the
reference audio must already exist locally. No install, download or render runs.
Clone profile reference_audio must be workspace-relative. A voice_design profile
instead contains instruct and requires the corresponding VoiceDesign model.
source_url/provenance/note
are metadata only and are never fetched. The Python loader enforces HF offline
mode and uses CUDA 0, bfloat16, SDPA (no flash-attn installation required).
Author short complete sentences in scene.speech_segments; spoken_text overrides
pronunciation while text is kept in captions. Cache is per synthesized sentence.
Output captions are measured sentence WAV boundaries, not word alignment.
runtime.json, narration.srt and narration-qwen.wav use source speed. Rendering
and any playback-rate conversion belong to the separate production command.
Existing runtime from another TTS provider is protected; use a copied episode.
.EXAMPLE
.\scripts\run-qwen.ps1 --episode ep08-full-reference --profile voices/profiles/youtube-XIbUKM89IJI.json --model models/Qwen3-TTS-12Hz-0.6B-Base
.EXAMPLE
.\scripts\run-qwen.ps1 --episode ep08-full-reference --profile voices/profiles/youtube-XIbUKM89IJI.json --non-streaming-mode --temperature 0.45 --top-p 0.8 --seed 42
#>
$ErrorActionPreference = 'Stop'
$QwenWorkspaceRoot = Split-Path -Parent $PSScriptRoot
$QwenPython = Join-Path $QwenWorkspaceRoot '.venv-qwen\Scripts\python.exe'
$QwenEntryPoint = Join-Path $PSScriptRoot 'tts\qwen_local.py'
if (-not (Test-Path -LiteralPath $QwenPython -PathType Leaf)) {
    throw 'Missing .venv-qwen\Scripts\python.exe. Install the local Qwen environment separately first.'
}
& $QwenPython -X utf8 -u $QwenEntryPoint @args
exit $LASTEXITCODE
