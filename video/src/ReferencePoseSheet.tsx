import React from "react";
import {AbsoluteFill} from "remotion";
import {ReferenceMascot,REFERENCE_MASCOT_POSES,REFERENCE_MASCOT_LABELS} from "./components/ReferenceMascot";
import {ART,KOREAN_FONT} from "./art";
import {DraftFontLoader} from "./components/DraftFontLoader";

export const ReferencePoseSheet:React.FC=()=> <AbsoluteFill style={{background:'#FFFFFF',fontFamily:KOREAN_FONT}}>
 <DraftFontLoader/>
 {REFERENCE_MASCOT_POSES.map((pose,i)=><div key={pose} style={{position:'absolute',left:35+i%5*310,top:45+Math.floor(i/5)*400,textAlign:'center'}}><ReferenceMascot pose={pose} width={285} frame={0}/><div style={{fontSize:25,color:ART.ink}}>{REFERENCE_MASCOT_LABELS[pose]}</div></div>)}
</AbsoluteFill>;
