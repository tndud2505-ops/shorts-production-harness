#!/usr/bin/env python3
"""Prepare local Qwen3-TTS clone or designed audio; never render or download anything.

Run with .venv-qwen via scripts/run-qwen.ps1. Inputs are workspace-relative.
Each scene must provide author-written, short complete speech_segments with
display text and optional spoken_text. No automatic word/character splitting.

Captions cover measured segment WAV intervals, including their internal pauses:
sentence-level timing, NOT word alignment or detected speech onset/offset.
runtime.json, narration.srt and narration-qwen.wav all use source speed; episode
picture/playback flags are preserved, but no tempo conversion is performed.
The joined WAV includes scene frame padding, but not a silent closing card.

Segment WAV + checksum metadata are committed before reuse; runtime.json is
committed last. An existing non-Qwen runtime is protected: use a copied episode.
Model weights, tokenizer files and dependencies must already be installed.
"""

from __future__ import annotations

import argparse
import hashlib
import io
import json
import math
import os
import random
import re
import sys
import tempfile
import time
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
PROVIDER = "qwen-local"
SAFE_ID = re.compile(r"[A-Za-z0-9][A-Za-z0-9_-]{0,79}\Z")
RESERVED = {"CON", "PRN", "AUX", "NUL", *(f"{p}{i}" for p in ("COM", "LPT") for i in range(1, 10))}


def log(message: str) -> None:
    print(message, flush=True)


def safe_id(value: str) -> str:
    if not isinstance(value, str) or not SAFE_ID.fullmatch(value) or value.upper() in RESERVED:
        raise ValueError(f"Unsafe episode/scene ID: {value!r}")
    return value


def local_path(value: str) -> Path:
    """Only local workspace-relative paths; no URLs, drives, UNC or escapes."""
    if not isinstance(value, str) or not value.strip() or ":" in value:
        raise ValueError(f"Expected a workspace-relative local path: {value!r}")
    relative = Path(value)
    if relative.is_absolute() or relative.anchor or ".." in relative.parts:
        raise ValueError(f"Expected a workspace-relative local path: {value!r}")
    result = (ROOT / relative).resolve()
    if not result.is_relative_to(ROOT):
        raise ValueError(f"Path escapes workspace: {value!r}")
    return result


def json_bytes(value: object) -> bytes:
    return (json.dumps(value, ensure_ascii=False, sort_keys=True, indent=2, allow_nan=False) + "\n").encode("utf-8")


def read_json(path: Path) -> dict:
    value = json.loads(path.read_text(encoding="utf-8-sig"))
    if not isinstance(value, dict):
        raise ValueError(f"Expected a JSON object: {path}")
    return value


def checksum(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(4 * 1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def model_checksum(folder: Path) -> str:
    # Ignore Hub download bookkeeping and documentation, not model/tokenizer data.
    files = []
    for path in sorted(folder.rglob("*")):
        relative = path.relative_to(folder)
        if not path.is_file() or any(p.startswith(".") for p in relative.parts) or path.suffix.lower() == ".md":
            continue
        checked = local_path(str(path.relative_to(ROOT)))
        files.append([relative.as_posix(), checksum(checked)])
    if not files or not any(name.endswith((".safetensors", ".bin")) for name, _ in files):
        raise ValueError(f"Local model weights are missing: {folder}")
    return hashlib.sha256(json_bytes(files)).hexdigest()


def atomic_write(path: Path, data: bytes) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    descriptor, temporary = tempfile.mkstemp(prefix=f".{path.name}.", suffix=".tmp", dir=path.parent)
    try:
        with os.fdopen(descriptor, "wb") as handle:
            handle.write(data)
            handle.flush()
            os.fsync(handle.fileno())
        os.replace(temporary, path)
    finally:
        Path(temporary).unlink(missing_ok=True)


def write_wav(path: Path, audio, sample_rate: int, sf) -> dict:
    buffer = io.BytesIO()
    sf.write(buffer, audio, sample_rate, format="WAV", subtype="PCM_16")
    atomic_write(path, buffer.getvalue())
    measured = sf.info(str(path))
    if measured.frames <= 0 or measured.channels != 1 or measured.samplerate <= 0:
        raise ValueError(f"Invalid generated WAV: {path}")
    return {"samples": measured.frames, "sample_rate": measured.samplerate, "sha256": checksum(path)}


def cached_segment(audio: Path, metadata: Path, spec: dict, sf) -> dict | None:
    if not audio.is_file() or not metadata.is_file():
        return None
    try:
        saved = read_json(metadata)
        if saved.get("spec") != spec or saved.get("audio", {}).get("sha256") != checksum(audio):
            return None
        measured = sf.info(str(audio))
        record = saved["audio"]
        if (measured.channels != 1 or measured.frames <= 0 or measured.subtype != "PCM_16"
                or measured.frames != record["samples"] or measured.samplerate != record["sample_rate"]):
            return None
        return record
    except (OSError, ValueError, KeyError, TypeError, RuntimeError):
        return None


def validate_episode(episode: dict) -> None:
    for field in ("fps", "width", "height"):
        if type(episode.get(field)) is not int or episode[field] <= 0:
            raise ValueError(f"episode.{field} must be a positive integer")
    scenes = episode.get("scenes")
    if not isinstance(scenes, list) or not scenes:
        raise ValueError("episode.scenes must be a nonempty array")
    seen = set()
    for scene in scenes:
        if not isinstance(scene, dict):
            raise ValueError("Each scene must be an object")
        scene_id = safe_id(scene.get("id"))
        if scene_id.casefold() in seen:
            raise ValueError(f"Duplicate scene ID: {scene_id}")
        seen.add(scene_id.casefold())
        segments = scene.get("speech_segments")
        if not isinstance(segments, list) or not segments:
            raise ValueError(f"{scene_id}: author short, complete sentences in speech_segments")
        for segment in segments:
            if not isinstance(segment, dict):
                raise ValueError(f"{scene_id}: each speech segment must be an object")
            for field in ("text", "spoken_text"):
                if field == "text" or field in segment:
                    if not isinstance(segment.get(field), str) or not segment[field].strip():
                        raise ValueError(f"{scene_id}: segment {field} must be nonempty text")
        displayed = " ".join(" ".join(s["text"] for s in segments).split())
        narration = scene.get("narration")
        if not isinstance(narration, str) or displayed != " ".join(narration.split()):
            raise ValueError(f"{scene_id}: joined segment text must match narration (whitespace may differ)")


def load_engine(model_path: Path, reference_audio, reference_sr: int, reference_text, mode="voice_clone"):
    # These flags are set before importing Transformers/Hub, including vendored code.
    for key in ("HF_HUB_OFFLINE", "TRANSFORMERS_OFFLINE", "HF_HUB_DISABLE_TELEMETRY"):
        os.environ[key] = "1"
    sys.path.insert(0, str(local_path("vendor/qwen3-tts")))
    import torch
    from qwen_tts import Qwen3TTSModel

    if not torch.cuda.is_available():
        raise RuntimeError("CUDA is required; this CLI does not silently switch to CPU")
    torch.cuda.init()
    torch.cuda.reset_peak_memory_stats(0)
    log(f"Loading local model on {torch.cuda.get_device_name(0)} (bfloat16, SDPA; no flash-attn required)")
    started = time.perf_counter()
    model = Qwen3TTSModel.from_pretrained(
        str(model_path), device_map="cuda:0", dtype=torch.bfloat16,
        attn_implementation="sdpa", local_files_only=True,
    )
    prompt = None
    if mode == "voice_clone":
        log("Creating reusable voice-clone prompt from local waveform and reference transcript")
        prompt = model.create_voice_clone_prompt(
            ref_audio=(reference_audio, reference_sr), ref_text=reference_text, x_vector_only_mode=False,
        )
    elif model.model.tts_model_type != "voice_design":
        raise ValueError("A voice_design profile requires a VoiceDesign model")
    torch.cuda.synchronize(0)
    log(f"Model and prompt ready in {time.perf_counter() - started:.1f}s")
    return model, prompt, torch


def srt_text(captions: list[dict]) -> str:
    def timestamp(seconds: float) -> str:
        millis = max(0, round(seconds * 1000))
        hours, millis = divmod(millis, 3_600_000)
        minutes, millis = divmod(millis, 60_000)
        seconds, millis = divmod(millis, 1000)
        return f"{hours:02d}:{minutes:02d}:{seconds:02d},{millis:03d}"

    return "\n\n".join(
        f"{i}\n{timestamp(c['start'])} --> {timestamp(c['end'])}\n{c['text']}"
        for i, c in enumerate(captions, 1)
    ) + "\n"


def prepare(args: argparse.Namespace) -> None:
    started = time.perf_counter()
    episode_id = safe_id(args.episode)
    source = local_path(f"episodes/{episode_id}/episode.json")
    runtime_path = local_path(f"episodes/{episode_id}/runtime.json")
    episode = read_json(source)
    validate_episode(episode)
    if runtime_path.exists() and read_json(runtime_path).get("tts", {}).get("provider") != PROVIDER:
        raise ValueError("Existing runtime belongs to another TTS pipeline. Use a copied episode; it will not be overwritten.")
    profile_path = local_path(args.profile)
    profile = read_json(profile_path)
    mode = profile.get("mode", "voice_clone")
    reference_text = reference_bytes = None
    if mode == "voice_clone":
        reference = local_path(profile.get("reference_audio"))
        reference_text = profile.get("reference_text")
        if not isinstance(reference_text, str) or not reference_text.strip():
            raise ValueError("Voice profile needs nonempty reference_text for voice-clone ICL mode")
        reference_bytes = reference.read_bytes()
        conditioning = {"reference_sha256": hashlib.sha256(reference_bytes).hexdigest(),
                        "reference_text": reference_text, "x_vector_only_mode": False}
    elif mode == "voice_design":
        if not isinstance(profile.get("instruct"), str) or not profile["instruct"].strip():
            raise ValueError("voice_design profile requires a nonempty instruct string")
        conditioning = {"mode": mode, "instruct": profile["instruct"]}
    else:
        raise ValueError(f"Unknown voice profile mode: {mode}")
    model_path = local_path(args.model)
    if not model_path.is_dir():
        raise ValueError(f"Local model directory missing: {model_path}")
    log("Hashing local model/tokenizer files for reusable segment cache (no network)")
    model_hash = model_checksum(model_path)
    api_hash = checksum(local_path("vendor/qwen3-tts/qwen_tts/inference/qwen3_tts_model.py"))

    import numpy as np
    import soundfile as sf

    ref_wave, ref_sr = None, 0
    if reference_bytes is not None:
        ref_wave, ref_sr = sf.read(io.BytesIO(reference_bytes), dtype="float32", always_2d=True)
        if not len(ref_wave) or not np.isfinite(ref_wave).all():
            raise ValueError("Reference audio is empty or contains invalid samples")
        ref_wave = ref_wave.mean(axis=1)
    parameters = {
        "language": "Korean", "non_streaming_mode": args.non_streaming_mode,
        "max_new_tokens": args.max_new_tokens, "do_sample": True,
        "top_k": 50, "top_p": args.top_p, "temperature": args.temperature,
        "repetition_penalty": 1.05, "subtalker_dosample": True, "subtalker_top_k": 50,
        "subtalker_top_p": args.top_p, "subtalker_temperature": args.temperature,
    }
    common_spec = {
        "cache_version": 1, "model_sha256": model_hash, "api_sha256": api_hash,
        **conditioning, "seed": args.seed, "parameters": parameters,
        "loader": {"device_map": "cuda:0", "dtype": "bfloat16", "attn_implementation": "sdpa"},
    }
    model = prompt = torch = None
    generated = hits = 0
    scene_runtime, all_captions, joined_scenes = [], [], []
    offset_frames = 0
    output_sr = None
    total = sum(len(scene["speech_segments"]) for scene in episode["scenes"])
    done = 0
    log(f"Preparing {len(episode['scenes'])} scenes / {total} authored sentences; sentence-level WAV timing only")
    for scene in episode["scenes"]:
        pieces, captions, segment_hashes = [], [], []
        cursor = 0
        for index, segment in enumerate(scene["speech_segments"]):
            done += 1
            spoken = segment.get("spoken_text", segment["text"])
            spec = {**common_spec, "spoken_text": spoken}
            key = hashlib.sha256(json_bytes(spec)).hexdigest()
            audio = local_path(f"episodes/{episode_id}/audio/qwen/{key}.wav")
            metadata = local_path(f"episodes/{episode_id}/audio/qwen/{key}.json")
            record = cached_segment(audio, metadata, spec, sf)
            label = f"[{done}/{total} {scene['id']}:{index + 1}]"
            if record is None:
                log(f"{label} Generating sentence: {spoken}")
                if model is None:
                    model, prompt, torch = load_engine(model_path, ref_wave, int(ref_sr), reference_text, mode)
                # Reset per sentence so cache hits/restarts do not shift the RNG sequence.
                random.seed(args.seed)
                np.random.seed(args.seed)
                torch.manual_seed(args.seed)
                torch.cuda.manual_seed_all(args.seed)
                torch.cuda.synchronize(0)
                segment_started = time.perf_counter()
                if mode == "voice_design":
                    wavs, sr = model.generate_voice_design(text=spoken, instruct=profile["instruct"], **parameters)
                else:
                    wavs, sr = model.generate_voice_clone(text=spoken, voice_clone_prompt=prompt, **parameters)
                torch.cuda.synchronize(0)
                wave = np.asarray(wavs[0], dtype=np.float32) if len(wavs) == 1 else np.array([])
                if wave.ndim != 1 or not len(wave) or not np.isfinite(wave).all() or int(sr) <= 0:
                    raise ValueError(f"{label} Qwen returned invalid mono audio")
                record = write_wav(audio, wave, int(sr), sf)
                atomic_write(metadata, json_bytes({"spec": spec, "audio": record}))
                generated += 1
                log(f"{label} Saved {record['samples'] / record['sample_rate']:.3f}s; "
                    f"inference {time.perf_counter() - segment_started:.1f}s; "
                    f"peak allocated VRAM {torch.cuda.max_memory_allocated(0) / 2**30:.2f} GiB")
            else:
                hits += 1
                log(f"{label} Verified cache hit ({record['samples'] / record['sample_rate']:.3f}s)")
            wave, sr = sf.read(str(audio), dtype="float32")
            if output_sr is None:
                output_sr = int(sr)
            if sr != output_sr:
                raise ValueError("Segment sample rates differ; refusing an implicit resampling change")
            if index:
                gap = round(args.gap_seconds * sr)
                pieces.append(np.zeros(gap, dtype=np.float32))
                cursor += gap
            start = cursor
            pieces.append(wave)
            cursor += len(wave)
            captions.append({"start": start / sr, "end": cursor / sr, "text": segment["text"]})
            segment_hashes.append(record["sha256"])

        # Pad up to the next picture frame so joining scene WAVs follows Remotion.
        frames = math.ceil(cursor * episode["fps"] / output_sr)
        padded_samples = max(cursor, round(frames * output_sr / episode["fps"]))
        pieces.append(np.zeros(padded_samples - cursor, dtype=np.float32))
        scene_wave = np.concatenate(pieces)
        scene_key = hashlib.sha256(json_bytes({
            "segments": segment_hashes, "gap_samples": round(args.gap_seconds * output_sr),
            "samples": padded_samples, "sample_rate": output_sr,
        })).hexdigest()
        public_relative = f"audio/{episode_id}/qwen-{scene['id']}-{scene_key}.wav"
        public_path = local_path(f"video/public/{public_relative}")
        measured = write_wav(public_path, scene_wave, output_sr, sf)
        duration = measured["samples"] / measured["sample_rate"]
        scene_runtime.append({"id": scene["id"], "duration_seconds": duration,
                              "audioSrc": public_relative, "captions": captions})
        # Use actual joined samples for SRT; frame padding rounds within one sample.
        offset = sum(len(w) for w in joined_scenes) / output_sr
        all_captions.extend({**c, "start": offset + c["start"], "end": offset + c["end"]} for c in captions)
        joined_scenes.append(scene_wave)
        offset_frames += frames
        log(f"[{scene['id']}] Joined {len(captions)} sentences: {duration:.3f}s / {frames} frames")

    # Preserve the exact input picture flags; do not commit stale props if edited mid-run.
    if read_json(source) != episode or read_json(profile_path) != profile:
        raise ValueError("Episode/profile changed during preparation. Rerun; completed sentences remain cached.")
    runtime = {"episode": episode, "sceneRuntime": scene_runtime, "tts": {
        "provider": PROVIDER, "caption_timing": "sentence-level measured WAV intervals; no word alignment",
        "timing_speed": "source", "profile_path": args.profile, "profile": profile,
        "model_path": args.model, **common_spec, "gap_seconds": args.gap_seconds,
    }}
    write_wav(local_path(f"episodes/{episode_id}/narration-qwen.wav"), np.concatenate(joined_scenes), output_sr, sf)
    atomic_write(local_path(f"episodes/{episode_id}/narration.txt"),
                 ("\n\n".join(s["narration"] for s in episode["scenes"]) + "\n").encode("utf-8"))
    atomic_write(local_path(f"episodes/{episode_id}/narration.srt"), srt_text(all_captions).encode("utf-8"))
    atomic_write(runtime_path, json_bytes(runtime))
    log(f"Ready: {runtime_path}\n{generated} generated / {hits} cached; {offset_frames} picture frames; "
        f"elapsed {time.perf_counter() - started:.1f}s. SRT and raw narration WAV use source speed. "
        f"playback_rate={episode.get('playback_rate', 1)} preserved; no rendering/tempo conversion performed.")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--episode", required=True, help="Dedicated episode ID, e.g. ep04-qwen-test")
    parser.add_argument("--profile", required=True, help="Local JSON: reference_audio/reference_text, or mode=voice_design with instruct")
    parser.add_argument("--model", default="models/Qwen3-TTS-12Hz-0.6B-Base", help="Already-downloaded workspace-relative model directory")
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--top-p", type=float, default=0.65)
    parser.add_argument("--temperature", type=float, default=0.65)
    parser.add_argument("--max-new-tokens", type=int, default=700, help="Per-sentence codec token limit (32..700)")
    parser.add_argument("--gap-seconds", type=float, default=0.12, help="Silence between authored sentences in a scene")
    parser.add_argument("--non-streaming-mode", action="store_true",
                        help="Use non-streaming text conditioning; default False matches official Base API, which still returns whole WAVs")
    args = parser.parse_args()
    if not 0 <= args.seed < 2**32:
        parser.error("--seed must be 0..4294967295")
    if not 0 < args.top_p <= 1 or not math.isfinite(args.temperature) or args.temperature <= 0:
        parser.error("--top-p must be (0,1] and --temperature must be positive and finite")
    if not 32 <= args.max_new_tokens <= 700 or not 0 <= args.gap_seconds <= 1:
        parser.error("--max-new-tokens must be 32..700 and --gap-seconds must be 0..1")
    prepare(args)


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        log(f"Qwen preparation failed: {exc}")
        sys.exit(1)
