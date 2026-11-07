#!/usr/bin/env node
// Read-only inventory of an authored plan. It does not infer semantic asset needs.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=fs.realpathSync(path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'));
const args=process.argv.slice(2);
if (!args.length || args.includes('--help')) {
  console.log('node scripts/scene-assets.mjs --episode SLUG\nRead scene-plan.json. Report reuse/adapt/create needs and source availability; never generate assets or audio.');
  process.exit(0);
}
try {
  if (args.length!==2 || args[0]!=='--episode' || !/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,79}$/.test(args[1])) throw new Error('Expected --episode with a safe slug.');
  const safe=(relative)=>{
    if (typeof relative!=='string' || !relative || relative.includes(':') || relative.includes('\\') || relative.startsWith('/') || relative.split('/').includes('..')) throw new Error('Expected workspace-relative source path.');
    const resolved=path.resolve(root,relative);
    if (!resolved.startsWith(root+path.sep)) throw new Error('Path escapes workspace.');
    if (fs.existsSync(resolved) && !fs.realpathSync(resolved).startsWith(root+path.sep)) throw new Error('Symlink escapes workspace.');
    return resolved;
  };
  const plan=JSON.parse(fs.readFileSync(safe(`episodes/${args[1]}/scene-plan.json`),'utf8').replace(/^\uFEFF/,''));
  if (plan.episode!==args[1] || !Array.isArray(plan.assets) || !Array.isArray(plan.scenes)) throw new Error('Plan needs matching episode, assets and scenes.');
  const assets=new Map(),sceneIds=new Set();
  for (const asset of plan.assets) {
    if (!asset.id || assets.has(asset.id) || !['reuse','adapt','create'].includes(asset.action) || !asset.label || !asset.brief) throw new Error('Asset needs unique id, label, action and brief.');
    assets.set(asset.id,asset);
  }
  for (const scene of plan.scenes) {
    if (!scene.id || sceneIds.has(scene.id) || !Array.isArray(scene.asset_ids) || scene.asset_ids.some(id=>!assets.has(id))) throw new Error('Scene needs unique id and known asset_ids.');
    sceneIds.add(scene.id);
  }
  const counts={reuse:0,adapt:0,create:0};
  console.log(`${plan.episode} | ${plan.status ?? 'draft'} | ${plan.scenes.length} scenes`);
  for (const asset of assets.values()) {
    counts[asset.action]++;
    const source=asset.source?safe(asset.source):null;
    const availability=source&&fs.existsSync(source)&&fs.statSync(source).isFile()?'SOURCE FOUND':asset.action==='create'?'PLANNED':'SOURCE NEEDED';
    const uses=plan.scenes.filter(s=>s.asset_ids.includes(asset.id)).map(s=>s.id).join(', ') || 'UNASSIGNED';
    console.log(`\n[${asset.action.toUpperCase()} / ${availability}] ${asset.id}: ${asset.label}\n  Scenes: ${uses}\n  Source: ${asset.source ?? '(new asset)'}\n  Brief: ${asset.brief}`);
  }
  console.log(`\nReuse ${counts.reuse} / Adapt ${counts.adapt} / Create ${counts.create}. File presence is not visual approval. Planned assets do not fail this report.`);
} catch(error) {console.error(error.message);process.exitCode=1;}
