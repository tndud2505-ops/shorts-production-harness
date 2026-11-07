import React from "react";
import {AbsoluteFill,Img,staticFile} from "remotion";
import inventory from "../public/illustrations/manifest.json";
import {DraftFontLoader} from "./components/DraftFontLoader";
import {KOREAN_FONT} from "./art";

export type SvgInventoryProps={group:"mascot"|"balloons"|"other"};
const kinds:Record<string,string>={thought:"생각풍선",speech:"말풍선",whisper:"작은 말",shout:"강조·외침"};
export const SvgInventorySheet:React.FC<SvgInventoryProps>=({group})=>{
 const assets=inventory.assets.filter(a=>group==="other"?!a.file.startsWith("mascot/")&&!a.file.startsWith("balloons/"):a.file.startsWith(group+"/"));
 const columns=group==="mascot"?5:group==="balloons"?4:6;
 const rows=Math.ceil(assets.length/columns);
 const cellWidth=1520/columns,cellHeight=900/rows;
 const heading=group==="mascot"?"캐릭터 · 10개":group==="balloons"?"풍선 · 8개":"소품·스티커·차트·보조 인물 · 18개";
 return <AbsoluteFill style={{background:"#fff",fontFamily:KOREAN_FONT,color:"#49433d"}}>
  <DraftFontLoader/>
  <div style={{position:"absolute",left:55,top:30,fontSize:33}}>{heading}</div>
  {assets.map((asset,i)=>{
   const parts=asset.file.split("/");
   const label=group==="balloons"?`${kinds[parts[1]]} · ${parts[2].startsWith('left')?'왼쪽':'오른쪽'}`:asset.label.replace('기존 부모님 보조 인물 ','부모님 ');
   return <div key={asset.id} style={{position:"absolute",left:40+(i%columns)*cellWidth,top:100+Math.floor(i/columns)*cellHeight,width:cellWidth,height:cellHeight,textAlign:"center"}}>
    <Img src={staticFile(`illustrations/${asset.file}`)} style={{position:"absolute",left:22,top:5,width:cellWidth-44,height:cellHeight-100,objectFit:"contain"}}/>
    <div style={{position:"absolute",left:0,right:0,bottom:56,fontSize:24}}>{label}</div>
    <div style={{position:"absolute",left:0,right:0,bottom:26,fontSize:17,color:"#847b72"}}>{asset.file.replace(/^(mascot\/poses|balloons)\//,'')}</div>
   </div>;
  })}
 </AbsoluteFill>;
};
