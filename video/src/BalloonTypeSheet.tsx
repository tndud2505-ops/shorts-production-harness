import React from "react";
import {AbsoluteFill} from "remotion";
import {SvgBalloon} from "./components/SvgBalloon";
import {KOREAN_FONT} from "./art";
import {DraftFontLoader} from "./components/DraftFontLoader";

export const BalloonTypeSheet:React.FC=()=> <AbsoluteFill style={{background:"#fff",fontFamily:KOREAN_FONT,color:"#554f49"}}>
 <DraftFontLoader/>
 {([['thought','생각풍선','어디에 쓰게 될까?'],['speech','말풍선','이렇게 해봤어요.'],['whisper','작은 말','잠깐만…'],['shout','강조·외침','드디어!']] as const).map(([kind,label,text],i)=><React.Fragment key={kind}>
  <SvgBalloon kind={kind} x={50+i%2*630} y={35+Math.floor(i/2)*430} width={550} size={35} text={text} side={i%2?'right':'left'}/>
  <div style={{position:'absolute',left:50+i%2*630,top:345+Math.floor(i/2)*430,width:550,textAlign:'center',fontSize:27}}>{label}</div>
 </React.Fragment>)}
</AbsoluteFill>;
