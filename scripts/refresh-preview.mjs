#!/usr/bin/env node
// Refresh artwork metadata without pretending changed speech has measured timing.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {isDeepStrictEqual} from 'node:util';
const root=fs.realpathSync(path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'));
const id=process.argv[2] ?? 'ep08-full-reference';
if (process.argv.includes('--help')) {
  console.log('node scripts/refresh-preview.mjs [EPISODE]\nRefresh public props from local runtime (or existing preview). Changed speech/order/fps requires new timing.');
  process.exit(0);
}
if (!/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,79}$/.test(id) || process.argv.length>3) throw new Error('Expected one safe episode slug.');
const dir=fs.realpathSync(path.join(root,'episodes',id));
if (!dir.startsWith(root+path.sep)) throw new Error('Episode escapes workspace.');
const read=file=>JSON.parse(fs.readFileSync(path.join(dir,file),'utf8').replace(/^\uFEFF/,''));
const privatePath=path.join(dir,'runtime.json');
const hasPrivate=fs.existsSync(privatePath);
const prior=read(hasPrivate?'runtime.json':'runtime.preview.json');
const episode=read('episode.json');
const timingIdentity=e=>({fps:e.fps,scenes:e.scenes.map(s=>({id:s.id,narration:s.narration,caption_lines:s.caption_lines,speech_segments:s.speech_segments}))});
if (!isDeepStrictEqual(timingIdentity(episode),timingIdentity(prior.episode))) {
  throw new Error('Speech, captions, scene order or fps changed. Prepare measured narration first; existing files preserved.');
}
const write=(name,value)=>{
  const target=path.join(dir,name),temp=path.join(dir,`${name}.pending-${process.pid}`);
  if (fs.existsSync(target) && !fs.realpathSync(target).startsWith(root+path.sep)) throw new Error('Output escapes workspace.');
  fs.writeFileSync(temp,JSON.stringify(value,null,2)+'\n');fs.renameSync(temp,target);
};
if (hasPrivate) write('runtime.json',{...prior,episode});
const preview={episode:structuredClone(episode),sceneRuntime:structuredClone(prior.sceneRuntime)};
for (const scene of preview.episode.scenes) if (scene.visual_data) delete scene.visual_data.image;
for (const scene of preview.sceneRuntime) scene.audioSrc='';
write('runtime.preview.json',preview);
console.log(`Refreshed ${id}: ${hasPrivate?'private metadata and ':''}silent public timing; no audio synthesized.`);
