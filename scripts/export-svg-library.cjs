// Export the actual scene components as editable standalone SVG files.
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const deps = path.join(root, 'video/node_modules');
const ts = require(path.join(deps, 'typescript'));
const React = require(path.join(deps, 'react'));
const {renderToStaticMarkup} = require(path.join(deps, 'react-dom/server'));
for (const ext of ['.ts','.tsx']) require.extensions[ext]=(module,filename)=>{
  const compiled=ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.React,esModuleInterop:true,target:ts.ScriptTarget.ES2020,resolveJsonModule:true}}).outputText;
  module._compile(compiled,filename);
};
const load=(name)=>require(path.join(root,`video/src/components/${name}.tsx`));
const mascot=load('ReferenceMascot'), {SvgBalloon}=load('SvgBalloon');
const art=load('RetrospectiveArt'), {AutomotiveCar}=load('AutomotiveCar');
const output=path.join(root,'video/public/illustrations');
const manifest=[];
function save(file,component,props,source,label){
  let svg=renderToStaticMarkup(React.createElement(component,props));
  if(!svg.startsWith('<svg')) throw new Error(`Not a standalone SVG: ${file}`);
  if(!svg.slice(0,svg.indexOf('>')).includes('xmlns=')) svg=svg.replace('<svg','<svg xmlns="http://www.w3.org/2000/svg"');
  // Stage positioning belongs to Remotion, not a reusable standalone file.
  svg=svg.replace(/^<svg[^>]*>/,tag=>tag.replace(/ style="[^"]*"/,'').replace(/>$/,' style="font-family:Malgun Gothic,sans-serif">'));
  svg=svg.replace(/&quot;Draft Malgun&quot;, sans-serif/g,'&quot;Malgun Gothic&quot;, sans-serif');
  const target=path.join(output,file);fs.mkdirSync(path.dirname(target),{recursive:true});
  fs.writeFileSync(target,svg+'\n','utf8');
  manifest.push({id:file.replace(/\.svg$/,''),label,file,source:`video/src/components/${source}.tsx`,props});
}
for(const pose of mascot.REFERENCE_MASCOT_POSES) save(`mascot/poses/${pose}.svg`,mascot.ReferenceMascot,{pose,width:400,frame:0},'ReferenceMascot',mascot.REFERENCE_MASCOT_LABELS[pose]);
for(const kind of ['thought','speech','whisper','shout']) for(const side of ['left','right']) save(`balloons/${kind}/${side}.svg`,SvgBalloon,{kind,side,width:560,text:''},'SvgBalloon',`${kind} / ${side}`);
save('props/automotive-car.svg',AutomotiveCar,{width:500,progress:1},'AutomotiveCar','자동차');
const common={x:0,y:0};
for(const [file,name,props,label] of [
 ['window','WindowGlyph',{width:300,label:'',active:true},'사이트 창'],
 ['file','FileGlyph',{width:180,label:''},'파일'],
 ['parcel','Parcel',{width:180,label:'',active:true},'상자'],
 ['server','ServerRack',{width:180},'서버'],
 ['calendar','Calendar',{width:180,page:1},'달력'],
 ['desk','Desk',{y:0},'책상'],
])save(`props/${file}.svg`,art[name],{...common,...props},'RetrospectiveArt',label);
for(let variant=0;variant<3;variant++)save(`emoticons/sticker-${variant+1}.svg`,art.Sticker,{...common,width:200,variant},'RetrospectiveArt',`기존 스티커 ${variant+1}`);
for(const down of [false,true])save(`symbols/arrow-${down?'down':'right'}.svg`,art.Arrow,{...common,width:85,down},'RetrospectiveArt','화살표');
for(let variant=0;variant<3;variant++)save(`charts/line-${variant+1}.svg`,art.ChartSketch,{...common,width:400,variant,label:''},'RetrospectiveArt',`차트 모양 ${variant+1}`);
save('charts/issue-graph.svg',art.GraphSketch,{...common,width:440,progress:1},'RetrospectiveArt','업무 관계 그래프');
for(let variant=0;variant<2;variant++)save(`supporting/parent-${variant+1}.svg`,art.ParentFigure,{...common,width:200,variant,puzzled:true,pointing:variant===0},'RetrospectiveArt',`기존 부모님 보조 인물 ${variant+1}`);
fs.writeFileSync(path.join(output,'manifest.json'),JSON.stringify({version:'approved-reference-v6-arm-fix',assets:manifest},null,2)+'\n','utf8');
console.log(`Exported ${manifest.length} SVG files to ${output}`);
