#!/usr/bin/env node
// Current Remotion adapter; episode data chooses the composition and timing.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
import {isDeepStrictEqual} from 'node:util';

const root = fs.realpathSync(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'));
const video = path.join(root, 'video');
const publicDir = path.join(video, 'public');
const cli = path.join(video, 'node_modules/@remotion/cli/remotion-cli.js');
const defaultEpisode = 'ep08-full-reference';
const help = `Current Remotion production adapter (Node only; uses installed tools).

  node scripts/production.mjs COMMAND [--episode SLUG] [OPTIONS]

  doctor   Report Node/npm, FFmpeg/FFprobe, installed video packages/browser,
           portable props and available private audio/evidence. Read only.
  scenes   Print measured scene offsets and numbered caption sentences for Dot.
           --private selects runtime.json instead of runtime.preview.json.
  still    --scene ID [--sentence N] [--progress FRACTION] [--output PATH]
           [--private]. N is a 1-based measured caption cue, not guessed text.
           Progress is 0..1 within the scene or selected cue (default 0.5).
           Default output: video/out/review/ID.png.
  preview  Render a silent H.264 MP4 from runtime.preview.json at 1x speed.
           [--frames N|START-END] is an inclusive, 0-based Remotion frame range.
           [--output PATH], default: video/out/SLUG-preview.mp4.
  render   Use private runtime.json and existing local audio/evidence at 1x.
           [--output PATH], default: video/out/SLUG-final.mp4.
           H.264 CRF18 source, then FFmpeg video copy, loudnorm
           I=-18:TP=-1.5:LRA=7,apad, finite duration including silent outro,
           AAC 192k/48k and +faststart. Never synthesizes or changes voices.
  assets   Run node scripts/export-svg-library.cjs (current SVG library only).
  check    Run npm run typecheck in video, with no other checks.

--episode defaults to ${defaultEpisode}; new path-safe episode slugs work too.
Props live at episodes/SLUG/runtime.preview.json (portable, audioSrc: '') or
runtime.json (private). No fallback from portable to private. Composition comes
from runtime.episode.composition, falling back to PurposeRetrospective.
This is the current Remotion adapter, not a universal engine or required visual
style for future episodes. Existing v6 scene components remain in use.

Output PATH must be workspace-relative (.png for still, .mp4 for videos), stay
inside the workspace including symlinks, and avoid source/asset directories.
Paths with spaces are supported. Outputs are rendered to unique sibling pending
files and renamed only after success; existing outputs survive failed commands.
Private renders keep their source MP4; failed pending files are kept for recovery.
Commands run sequentially using local dependencies and a cached Remotion browser;
no installs/browser downloads, TTS, publication, uploads or git operations.
--help / -h shows this help without loading props or starting any tools.

Examples:
  node scripts/production.mjs scenes
  node scripts/production.mjs still --scene intro --sentence 2 --progress 0.5
  node scripts/production.mjs preview --frames 0-29
  node scripts/production.mjs render --episode ${defaultEpisode}
`;

function fail(message) { throw new Error(message); }
function inside(base, target) {
  const relative = path.relative(base, target);
  return relative === '' || (!path.isAbsolute(relative) && relative !== '..' && !relative.startsWith(`..${path.sep}`));
}
function physicalPath(target) {
  let ancestor = target;
  while (!fs.existsSync(ancestor)) {
    const parent = path.dirname(ancestor);
    if (parent === ancestor) fail('Cannot resolve path boundary.');
    ancestor = parent;
  }
  return path.resolve(fs.realpathSync(ancestor), path.relative(ancestor, target));
}
function localPath(base, value, label) {
  if (typeof value !== 'string' || !value || /[\x00-\x1f:]/.test(value) || path.win32.isAbsolute(value) || path.posix.isAbsolute(value)) {
    fail(`${label} must be a relative local path.`);
  }
  const parts = value.replaceAll('\\', '/').split('/');
  if (parts.includes('..')) fail(`${label} cannot contain '..'.`);
  const target = path.resolve(base, ...parts);
  if (!inside(base, target) || !inside(base, physicalPath(target))) fail(`${label} escapes its directory (possibly through a symlink).`);
  return target;
}
function fileExists(target) {
  try { return fs.statSync(target).isFile() && fs.statSync(target).size > 0; }
  catch { return false; }
}
function requireFile(target, label) {
  if (!fileExists(target)) fail(`${label} is missing or empty: ${path.relative(root, target)}`);
}
function json(target) {
  requireFile(target, 'JSON file');
  try { return JSON.parse(fs.readFileSync(target, 'utf8').replace(/^\uFEFF/, '')); }
  catch { fail(`Cannot parse JSON: ${path.relative(root, target)}`); }
}
function slug(value, label) {
  if (typeof value !== 'string' || !/^[a-zA-Z0-9][a-zA-Z0-9_-]*$/.test(value)) fail(`${label} must contain only letters, digits, '-' or '_', starting with a letter or digit.`);
  return value;
}
function parse(argv) {
  const commands = {
    doctor: [], scenes: ['private'],
    still: ['scene', 'sentence', 'progress', 'output', 'private'],
    preview: ['output', 'frames'], render: ['output'], assets: [], check: [],
  };
  const command = argv[0];
  if (!Object.hasOwn(commands, command)) fail('Choose doctor|scenes|still|preview|render|assets|check. Use --help.');
  const options = {episode: defaultEpisode};
  const seen = new Set();
  for (let i = 1; i < argv.length; i++) {
    const key = argv[i].startsWith('--') ? argv[i].slice(2) : '';
    if (!['episode', ...commands[command]].includes(key)) fail(`Unknown option for ${command}: ${argv[i]}`);
    if (seen.has(key)) fail(`Duplicate option: --${key}`);
    seen.add(key);
    if (key === 'private') options[key] = true;
    else {
      const value = argv[++i];
      if (!value || value.startsWith('--')) fail(`--${key} needs a value.`);
      options[key] = value;
    }
  }
  slug(options.episode, '--episode');
  return {command, options};
}

function loadRuntime(episodeId, privateMode) {
  const propsPath = localPath(root, `episodes/${episodeId}/runtime${privateMode ? '' : '.preview'}.json`, 'Runtime path');
  if (!fileExists(propsPath)) fail(`Missing ${path.relative(root, propsPath)}. ${privateMode ? 'Restore the prepared private runtime and its selected audio.' : 'Portable preview props must be supplied; private runtime is never substituted.'}`);
  const props = json(propsPath);
  const {episode, sceneRuntime} = props;
  const current = json(path.join(root, 'episodes', episodeId, 'episode.json'));
  if (!privateMode) for (const scene of current.scenes ?? []) if (scene.visual_data) delete scene.visual_data.image;
  if (!isDeepStrictEqual(current, episode)) fail('Episode source and runtime snapshot differ. Run scripts/refresh-preview.mjs; changed speech requires fresh measured timing.');
  if (!episode || !Array.isArray(episode.scenes) || !episode.scenes.length || !Array.isArray(sceneRuntime)) fail('Props need episode.scenes and measured sceneRuntime.');
  if (![episode.fps, episode.width, episode.height].every(n => Number.isFinite(n) && n > 0)) fail('Episode needs positive fps, width and height.');
  if ((episode.playback_rate ?? 1) !== 1 || (props.playback_rate ?? 1) !== 1) fail('playback_rate must be 1; this adapter never converts speed or switches voices.');
  const composition = episode.composition ?? 'PurposeRetrospective';
  if (typeof composition !== 'string' || !/^[a-zA-Z0-9][a-zA-Z0-9_-]*$/.test(composition)) fail('Invalid episode.composition ID.');
  const byId = new Map();
  for (const runtime of sceneRuntime) {
    if (!runtime || byId.has(runtime.id)) fail('Duplicate or invalid sceneRuntime entry.');
    byId.set(runtime.id, runtime);
  }
  const ids = new Set();
  let cursor = 0;
  const scenes = episode.scenes.map(scene => {
    slug(scene.id, 'Scene ID');
    if (ids.has(scene.id)) fail(`Duplicate scene: ${scene.id}`);
    ids.add(scene.id);
    const runtime = byId.get(scene.id);
    if (!runtime || !Number.isFinite(runtime.duration_seconds) || runtime.duration_seconds <= 0 || !Array.isArray(runtime.captions)) fail(`Missing measured duration/captions: ${scene.id}`);
    if (typeof runtime.audioSrc !== 'string' || (privateMode ? !runtime.audioSrc : runtime.audioSrc !== '')) fail(`${scene.id}: ${privateMode ? 'private runtime requires audioSrc.' : "portable runtime requires audioSrc: ''."}`);
    let previousEnd = 0;
    for (const cue of runtime.captions) {
      if (!cue || typeof cue.text !== 'string' || !Number.isFinite(cue.start) || !Number.isFinite(cue.end) || cue.start < 0 || cue.end <= cue.start || cue.start < previousEnd - 0.1 || cue.end > runtime.duration_seconds + 0.1) fail(`Invalid measured caption interval: ${scene.id}`);
      previousEnd = cue.end;
    }
    const frames = Math.max(1, Math.round(runtime.duration_seconds * episode.fps));
    const item = {scene, runtime, from: cursor, frames};
    cursor += frames;
    return item;
  });
  if (byId.size !== ids.size || [...byId.keys()].some(id => !ids.has(id))) fail('Runtime scene IDs must match episode scene IDs.');
  const outroSeconds = episode.silent_outro?.duration_seconds ?? 0;
  if (!Number.isFinite(outroSeconds) || outroSeconds < 0) fail('Invalid silent outro duration.');
  const outroFrames = Math.max(0, Math.round(outroSeconds * episode.fps));
  const duration = sceneRuntime.reduce((sum, scene) => sum + scene.duration_seconds, 0) + outroSeconds;
  return {propsPath, episode, composition, scenes, outroFrom: cursor, outroFrames, totalFrames: cursor + outroFrames, duration};
}
function inspectAssets(data, privateMode) {
  const audio = [], images = [], problems = [];
  const inspect = (src, label, list) => {
    try {
      const target = localPath(publicDir, src, label);
      list.push(target);
      requireFile(target, label);
    } catch (error) { problems.push(error.message); }
  };
  for (const {scene, runtime} of data.scenes) {
    if (privateMode) inspect(runtime.audioSrc, `${scene.id} audio`, audio);
    if (scene.visual_data?.image) inspect(scene.visual_data.image, `${scene.id} evidence`, images);
  }
  return {audio, images, problems};
}
function validateAssets(data, privateMode) {
  const {problems} = inspectAssets(data, privateMode);
  if (problems.length) fail(`Missing/unsafe local assets:\n${problems.join('\n')}`);
}

function executable(name) {
  const names = process.platform === 'win32' ? [`${name}.exe`, `${name}.cmd`] : [name];
  for (const directory of (process.env.PATH || '').split(path.delimiter)) {
    if (!directory) continue;
    for (const filename of names) {
      const target = path.join(directory.replace(/^"|"$/g, ''), filename);
      if (fileExists(target)) return target;
    }
  }
  fail(`${name} is unavailable on PATH.`);
}
function npmCommand(args) {
  if (process.platform !== 'win32') return [executable('npm'), args];
  // .cmd is not an executable for spawnSync(shell:false). Run npm's JS entry
  // with Node directly, avoiding cmd.exe quoting/interpolation entirely.
  const shim = executable('npm');
  const candidates = [path.join(path.dirname(shim), 'node_modules/npm/bin/npm-cli.js'), path.join(path.dirname(process.execPath), 'node_modules/npm/bin/npm-cli.js')];
  const entry = candidates.find(fileExists);
  if (!entry) fail('Cannot locate npm-cli.js beside npm.cmd/Node; no shell fallback is used.');
  return [process.execPath, [entry, ...args]];
}
function run(program, args, {cwd = video, optional = false} = {}) {
  const result = spawnSync(program, args, {cwd, stdio: 'inherit', shell: false, windowsHide: true});
  if (result.error || result.signal || result.status !== 0) {
    const message = `${path.basename(program)} failed: ${result.error?.message || result.signal || `exit ${result.status}`}`;
    if (!optional) fail(message);
    console.log(`  unavailable: ${message}`);
    return false;
  }
  return true;
}
function cachedBrowser() {
  const platform = process.platform === 'win32' ? 'win64' : process.platform === 'darwin' ? `mac-${process.arch}` : process.platform === 'linux' ? (process.arch === 'arm64' ? 'linux-arm64' : 'linux64') : '';
  const directory = path.join(video, 'node_modules/.remotion/chrome-headless-shell', platform, `chrome-headless-shell-${platform}`);
  return ['chrome-headless-shell.exe', 'chrome-headless-shell', 'headless_shell'].map(name => path.join(directory, name)).find(fileExists);
}
function remotionArgs(data) {
  requireFile(cli, 'Installed Remotion CLI');
  const browser = cachedBrowser();
  if (!browser) fail('No cached Remotion headless browser. This adapter will not download one; run doctor.');
  return ['--props', data.propsPath, '--browser-executable', browser, '--concurrency', '1', '--overwrite', '--log', 'error'];
}
function outputPath(value, extension) {
  const target = localPath(root, value, '--output');
  if (path.extname(target).toLowerCase() !== extension) fail(`--output must end in ${extension}.`);
  const protectedDirs = ['episodes', 'scripts', 'vendor', 'voices', 'models', 'references', 'docs', '.git', '.agents', 'video/src', 'video/public', 'video/node_modules'];
  for (const directory of protectedDirs) {
    const base = path.join(root, directory);
    if (inside(base, target) || inside(base, physicalPath(target))) fail('--output must avoid source/asset directories; use video/out.');
  }
  return target;
}
function pendingPath(target, label) {
  const extension = path.extname(target);
  return `${target.slice(0, -extension.length)}.${label}-${process.pid}-${Date.now()}${extension}`;
}
function publishLocal(pending, target) {
  requireFile(pending, 'Completed pending output');
  // Rename replaces only after success. Never unlink the previous output first.
  fs.renameSync(pending, target);
  console.log(`Completed: ${path.relative(root, target)}`);
}
function frameRange(value, totalFrames) {
  if (!/^\d+(?:-\d+)?$/.test(value)) fail('--frames must be N or START-END (inclusive, 0-based).');
  const parts = value.split('-').map(Number);
  const [start, end = start] = parts;
  if (![start, end].every(Number.isSafeInteger) || start > end || end >= totalFrames) fail(`--frames must stay within 0-${totalFrames - 1}.`);
  return value;
}
function stillFrame(data, options) {
  const id = slug(options.scene, '--scene');
  const item = data.scenes.find(({scene}) => scene.id === id);
  if (!item) fail(`Unknown scene: ${id}. Run scenes for available IDs.`);
  const progress = options.progress === undefined ? 0.5 : Number(options.progress);
  if (!Number.isFinite(progress) || progress < 0 || progress > 1) fail('--progress must be a fraction from 0 to 1.');
  let start = 0, end = item.frames - 1;
  if (options.sentence !== undefined) {
    const number = Number(options.sentence);
    if (!/^\d+$/.test(options.sentence) || !Number.isSafeInteger(number) || number < 1 || number > item.runtime.captions.length) fail(`--sentence must be 1-${item.runtime.captions.length} for ${id}.`);
    const cue = item.runtime.captions[number - 1];
    start = Math.max(0, Math.ceil(cue.start * data.episode.fps - 1e-7));
    end = Math.min(end, Math.ceil(cue.end * data.episode.fps - 1e-7) - 1);
    if (end < start) fail('Selected caption has no frame at this episode fps.');
  }
  return item.from + start + Math.floor((end - start) * progress);
}
function scenes(data) {
  const fps = data.episode.fps;
  console.log(`${data.composition} | ${fps} fps | ${data.totalFrames} frames | ${(data.totalFrames / fps).toFixed(3)}s | ${path.relative(root, data.propsPath)}`);
  for (const {scene, runtime, from, frames} of data.scenes) {
    console.log(`${scene.id}  ${(from / fps).toFixed(3)}-${((from + frames) / fps).toFixed(3)}s  f${from}-${from + frames - 1}  ${scene.title || ''}`);
    runtime.captions.forEach((cue, i) => console.log(`  ${i + 1}. ${(from / fps + cue.start).toFixed(3)}-${(from / fps + cue.end).toFixed(3)}s  ${cue.text}`));
  }
  if (data.outroFrames) console.log(`(silent outro)  ${(data.outroFrom / fps).toFixed(3)}-${(data.totalFrames / fps).toFixed(3)}s  f${data.outroFrom}-${data.totalFrames - 1}`);
}
function doctor(episodeId) {
  let healthy = true;
  console.log(`Workspace: ${root}\nNode: ${process.version}`);
  for (const name of ['npm', 'ffmpeg', 'ffprobe']) {
    console.log(`\n${name}:`);
    try {
      const [program, args] = name === 'npm' ? npmCommand(['--version']) : [executable(name), ['-version']];
      if (!run(program, args, {optional: true})) healthy = false;
    } catch (error) { console.log(`  ${error.message}`); healthy = false; }
  }
  console.log('\nVideo package installs:');
  try {
    const pkg = json(path.join(video, 'package.json'));
    for (const [name, wanted] of Object.entries({...pkg.dependencies, ...pkg.devDependencies})) {
      const manifest = path.join(video, 'node_modules', name, 'package.json');
      if (fileExists(manifest)) console.log(`  ${name}: ${json(manifest).version} (declared ${wanted})`);
      else { console.log(`  ${name}: MISSING (declared ${wanted})`); healthy = false; }
    }
  } catch (error) { console.log(`  ${error.message}`); healthy = false; }
  const browser = cachedBrowser();
  console.log(`Cached browser: ${browser ? path.relative(root, browser) : 'MISSING (automatic download disabled)'}`);
  if (!browser || !fileExists(cli)) healthy = false;
  for (const privateMode of [false, true]) {
    console.log(`\n${privateMode ? 'Private runtime (optional for portable work)' : 'Portable preview'}:`);
    try {
      const data = loadRuntime(episodeId, privateMode);
      const {audio, images, problems} = inspectAssets(data, privateMode);
      console.log(`  ${path.relative(root, data.propsPath)}: ${data.scenes.length} scenes, ${data.duration.toFixed(3)}s, ${data.composition}`);
      console.log(`  audio: ${privateMode ? `${audio.filter(fileExists).length}/${data.scenes.length} local files available` : 'silent; empty audioSrc in every measured scene'}`);
      console.log(`  evidence: ${images.filter(fileExists).length}/${images.length} referenced local files available`);
      for (const problem of problems) console.log(`  ${problem}`);
      if (!privateMode && problems.length) healthy = false;
    } catch (error) { console.log(`  ${error.message}`); if (!privateMode) healthy = false; }
  }
  if (!healthy) process.exitCode = 1;
}

function main(argv) {
  if (!argv.length || argv.includes('--help') || argv.includes('-h')) { console.log(help); return; }
  const {command, options} = parse(argv);
  if (command === 'doctor') { doctor(options.episode); return; }
  if (command === 'check') { const [program, args] = npmCommand(['run', 'typecheck']); run(program, args); return; }
  if (command === 'assets') { run(process.execPath, [path.join(root, 'scripts/export-svg-library.cjs')], {cwd: root}); return; }
  const privateMode = command === 'render' || Boolean(options.private);
  const data = loadRuntime(options.episode, privateMode);
  if (command === 'scenes') { if (privateMode) validateAssets(data, true); scenes(data); return; }
  validateAssets(data, privateMode);
  if (command === 'still') {
    const frame = stillFrame(data, options);
    const target = outputPath(options.output ?? `video/out/review/${options.scene}.png`, '.png');
    const pending = pendingPath(target, 'pending');
    const flags = remotionArgs(data);
    fs.mkdirSync(path.dirname(target), {recursive: true});
    console.log(`${options.scene}: frame ${frame} (${(frame / data.episode.fps).toFixed(3)}s), ${data.composition}`);
    run(process.execPath, [cli, 'still', 'src/index.ts', data.composition, pending, ...flags, '--frame', String(frame)]);
    publishLocal(pending, target);
    return;
  }
  const target = outputPath(options.output ?? `video/out/${options.episode}-${command === 'preview' ? 'preview' : 'final'}.mp4`, '.mp4');
  const pending = pendingPath(target, 'pending');
  const flags = remotionArgs(data);
  if (command === 'preview') {
    if (options.frames !== undefined) flags.push('--frames', frameRange(options.frames, data.totalFrames));
    fs.mkdirSync(path.dirname(target), {recursive: true});
    run(process.execPath, [cli, 'render', 'src/index.ts', data.composition, pending, ...flags, '--codec', 'h264', '--crf', '18', '--muted']);
    publishLocal(pending, target);
    return;
  }
  const ffmpeg = executable('ffmpeg');
  const source = pendingPath(target, 'source');
  fs.mkdirSync(path.dirname(target), {recursive: true});
  run(process.execPath, [cli, 'render', 'src/index.ts', data.composition, source, ...flags, '--codec', 'h264', '--crf', '18']);
  requireFile(source, 'Remotion source');
  run(ffmpeg, ['-v', 'error', '-y', '-i', source, '-map', '0:v:0', '-map', '0:a:0', '-c:v', 'copy', '-af', 'loudnorm=I=-18:TP=-1.5:LRA=7,apad', '-t', data.duration.toFixed(6), '-c:a', 'aac', '-b:a', '192k', '-ar', '48000', '-movflags', '+faststart', pending]);
  publishLocal(pending, target);
  console.log(`Source retained: ${path.relative(root, source)}`);
}

try { main(process.argv.slice(2)); }
catch (error) { console.error(`production: ${error.message}`); process.exitCode = 1; }
