import React from "react";
import {useCurrentFrame,useVideoConfig} from "remotion";

export const REFERENCE_MASCOT_POSES = ["neutral","thinking","explaining","surprised","typing","hope","disappointed","celebrating","reading","phone"] as const;
export type ReferenceMascotPose = typeof REFERENCE_MASCOT_POSES[number];
export type ReferenceMascotProps = {pose?:ReferenceMascotPose;width?:number;frame?:number;talking?:boolean;style?:React.CSSProperties};
// Native approved drawing: 77×96, placed in the film's existing 400×400 canvas.
export const REFERENCE_MASCOT_HEAD = {x:202.2,y:133,radius:108,tailAnchor:{x:112,y:70}} as const;
export const REFERENCE_MASCOT_LABELS:Record<ReferenceMascotPose,string> = {
 neutral:"기본",thinking:"생각",explaining:"설명",surprised:"당황",typing:"타이핑",hope:"기대",
 disappointed:"실망",celebrating:"축하",reading:"독서",phone:"휴대폰",
};
const C={cream:"#FFFCF3",line:"#9D968D",prop:"#CBCDD0",paper:"#EEE7D9",accent:"#D6AE69"};
// These exact curves and face paths come from the user's APPROVED v5 front study.
const HEAD="M11.6 43.3 C9.6 35 10.1 26.7 14.6 20 C19.7 12.9 29.5 9.2 39.6 9.3 C50.1 9.3 58.7 13.4 63.8 21.7 C68.4 29.2 68.2 39.2 64.8 46.6 C62.6 50.7 59.1 53.7 55.6 56.4";
const RIGHT="C56.6 60.4 57.4 64.2 56.8 68.9 C56.5 72.3 55.9 75.5 54.6 77 C53 75.8 52.5 71.2 52 69";
const BASE="L49.9 81.8 Q49.8 83.1 48.8 82.5 C45 79 40.2 77.4 35.5 77.5 C30.7 77.3 27.3 79.3 24.7 82.7 Q23.9 83.3 23.5 82 C21.4 77.4 23.1 70.9 22.9 66.9";
const LEFT="Q22.8 65.4 21.2 65 C14.6 63.1 10.8 59.5 9.4 55 Q7.8 49.7 11.6 43.3 Z";
// Poses with hands in front have bare flanks, not the neutral pose's hanging arm.
const TUCK_R="C54.8 60.8 53.2 65.3 52 69";
const TUCK_L="C20.8 62.5 17.8 57 15.8 52 Q13 48.4 11.6 43.3 Z";
// One raised arm, then straight back to the flank. No extra hanging arm below it.
const WAVE_R="C60 55.5 64.5 50.6 68.4 44.3 Q71 40.6 72.2 42.6 Q73.5 45 69.2 51.1 C65.8 57 61.6 60.5 55 62.2 Q53.7 66 52 69";
const WAVE_L="Q22.8 64.8 20.8 64.1 C13.4 61.4 9.1 55 5.4 48 Q3.6 44 5.7 43.3 Q8 42.8 10 47 Q13.9 54 19 55.2 Q14.7 50.4 11.6 43.3 Z";
const EYES=["M27.3 33 Q30.9 32.9 34.4 33.3","M46.3 33.9 Q49.6 33.9 53 34.4"];
const MOUTH="M38.6 39.1 Q42 38.6 45.4 39.6 Q44.1 41.6 40.9 43.5 Q39.5 41.5 38.6 39.1 Z";
const ARM="M11.6 43.3 C13.6 49.7 17.3 55.2 22.1 57.2";

const Drawing:React.FC<ReferenceMascotProps & {frame:number;fps:number}>=({pose="neutral",width=320,frame,fps,talking=false,style})=>{
 const t=frame/fps;
 const breath=(1-Math.cos(t*1.1))*.12;
 let right=RIGHT,left=LEFT,eyes=EYES,mouth=MOUTH;
 let arms:string[]=[ARM];
 let prop:React.ReactNode=null;
 if(["thinking","typing","hope","disappointed","reading","phone"].includes(pose)){right=TUCK_R;left=TUCK_L;arms=[];}
 if(pose==="thinking"){
  arms=["M21 62 Q29 67 39 63","M49 65 Q53 61 49 56 L45 51 Q43 47 40.5 48 Q38 49.5 40.5 52 L43.5 55 Q39 53.6 39 56 Q40.5 59 44 59 Q46 61 42 63"];
  eyes=["M27 34 L34 32.3","M46 33.7 L52.7 32.3"];
  mouth="M39.4 41 Q42.2 39.4 44.6 40.2";
 }
 if(pose==="explaining"){right=WAVE_R;arms=[ARM];}
 if(pose==="surprised"){
  right="Q60 57 64.5 60 L61 62 L66 65 L60 65.8 Q56 65.4 52 69";
  left="Q19 65 15 64.6 L9 66 L12.4 62.5 L8.8 60 Q12.3 58 15.7 57 Q13 51 11.6 43.3 Z";
  eyes=["M27.8 30.5 C23.5 30.5 23.4 37.1 27.8 37.1 C32.2 37.1 32.2 30.5 27.8 30.5 Z","M49.5 31 C45.1 31 45.1 37.6 49.5 37.6 C53.9 37.6 53.9 31 49.5 31 Z"];
  mouth="M38.8 43 Q41.5 41.9 44.2 43 L43.8 46 L39.4 46 Z";arms=[];
 }
 if(pose==="typing"){
  prop=<g strokeWidth={.8}><path d="M26 67 H55 L58 82 H23 Z" fill={C.prop}/><path d="M23 82 H58 L61 85 H20Z" fill="#E6E5E0"/><path d="M35 83.5 H46" fill="none"/></g>;
  arms=["M19 58 Q20 64 28 67 L32 66 Q34 64 30 63 Q24 61 22 59","M54 58 Q55 64 49 66 L45 66 Q43 64 47 62 L51 60"];
  eyes=["M27.3 34 L34.4 35.2","M46.3 35.2 L53 34"];
  mouth="M39 41 L44 41";
 }
 if(pose==="hope"){
  // Rounded fists with one thumb turn each; no finger forks or doubled forearms.
  arms=["M21 59 Q25 56.5 25.5 53 C23.5 46 34 44.7 36.1 50.7 Q32.8 48.8 31.4 51.1 Q30.9 53.5 34.9 54.1 C34 61.3 30.5 67.5 25.5 67.5 Q21.3 67.5 20.6 63.3",
        "M52 59.2 Q48.2 57.1 48 53.6 C50 46.6 39.5 45.3 37.4 51.3 Q40.7 49.4 42.1 51.7 Q42.6 54.1 38.6 54.7 C39.5 61.9 43 68.1 48 68.1 Q52.2 68.1 52.9 63.9"];
  eyes=["M27.3 33.6 L34.4 32.2","M46.3 33 L53 32.5"];
 }
 if(pose==="disappointed"){
  eyes=["M27 33.3 L34.3 35","M46 35 L53 33.8"];
  mouth="M39 42 Q42 40 45 42";
  arms=["M24 61 Q23 65 25 68","M50 61 Q51 65 48 68"];
 }
 if(pose==="celebrating"){
  right=WAVE_R;left=WAVE_L;
  arms=[];
  eyes=["M27 33 L34 31","M46 32 L53 34"];
  prop=<g strokeWidth={.65}><path d="M3 30 l-2 -3 l3 -1 l1 3Z" fill="#DCC58F"/><path d="M71 24 l2 -3 l2 2 l-2 3Z" fill="#C7D9CE"/><path d="M72 36 l2 -1 l1 4 l-2 1Z" fill="#E7C6B5"/></g>;
 }
 if(pose==="reading"){
  prop=<g strokeWidth={.85}><path d="M22 64 Q31 61 39 65 Q47 61 57 64 L56 81 Q47 78 39 82 Q30 78 23 81Z" fill="#DCCBB1"/><path d="M39 65 V81" fill="none"/></g>;
  arms=["M20 60 Q20 66 23 71 L26 70 Q28 68 24 67","M54 60 Q58 65 57 70 L53 70 Q51 68 55 67"];
  eyes=["M28 33 L31.7 33","M48 33.8 L51.5 33.8"];
  mouth="M39.5 42 Q42 43 44.5 42";
 }
 if(pose==="phone"){
  prop=<g strokeWidth={.85}><path d="M30 57 L44 57 L45 76 L31 76Z" fill="#BDC7CD"/><path d="M35 73 H40" fill="none"/></g>;
  arms=["M20 59 Q21 65 30 67 L33 65 Q35 62 31 63 L27 62","M54 59 Q54 64 45 65 L42 64 Q40 62 44 61 L49 60"];
  eyes=["M27.3 34 L34.4 35.2","M46.3 35.2 L53 34"];
 }
 const blinkPhase=t%5.1, blink=Math.max(0,1-Math.abs(blinkPhase-4.5)/.12);
 const speechMouth=talking?"M38.6 39.1 Q42 38.6 45.4 39.6 Q44.2 "+(43+Math.max(0,Math.sin(t*12))*.9)+" 40.9 43.5 Q39.5 41.5 38.6 39.1 Z":mouth;
 return <svg xmlns="http://www.w3.org/2000/svg" width={width} height={width} viewBox="0 0 400 400" role="img" aria-label={`승인된 기본형 캐릭터 · ${REFERENCE_MASCOT_LABELS[pose]}`} style={{display:"block",...style}}>
  <g transform={`translate(54 ${-breath*3.8}) scale(3.8)`} stroke={C.line} strokeWidth={.95} strokeLinecap="round" strokeLinejoin="round">
   <path d={HEAD+right+BASE+left} fill={C.cream}/>
   {prop}
   {arms.map((d,index)=><path key={index} d={d} fill={d===ARM||pose==="disappointed"||(pose==="thinking"&&index===0)?"none":C.cream} transform={pose==="typing"?`translate(0 ${Math.sin(t*10+index*Math.PI)*.35})`:undefined}/>)}
   <g fill="none" strokeWidth={1.05}>
    <g transform={`translate(0 34) scale(1 ${1-blink*.9}) translate(0 -34)`}>{eyes.map((d,index)=><path key={index} d={d}/>)}</g>
    <path d={speechMouth}/>
    {pose==="reading"&&<g strokeWidth={.8}><circle cx={29.8} cy={33.2} r={6.6}/><circle cx={49.5} cy={33.8} r={6.6}/><path d="M36.4 33.5 L42.9 33.6"/></g>}
   </g>
  </g>
 </svg>;
};
const Animated:React.FC<ReferenceMascotProps>=(props)=>{const frame=useCurrentFrame();const {fps}=useVideoConfig();return <Drawing {...props} frame={frame} fps={fps}/>;};
export const ReferenceMascot:React.FC<ReferenceMascotProps>=(props)=>props.frame===undefined?<Animated {...props}/>:<Drawing {...props} frame={props.frame} fps={30}/>;
