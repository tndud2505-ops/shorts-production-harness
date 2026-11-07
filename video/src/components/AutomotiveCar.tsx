import React from "react";

/** Original brand-free automotive prop, independent of the main character. */
export const AutomotiveCar: React.FC<{width?:number; progress?:number}> = ({width=410,progress=1}) => <svg width={width} height={width*0.64} viewBox="0 0 500 320" aria-label="개발용 노트북과 연결된 자동차">
  <g stroke="#80786e" strokeWidth={3.5} strokeLinecap="round" strokeLinejoin="round">
    <path d="M38 189 Q46 158 89 151 L147 78 Q160 62 192 61 L302 65 Q325 66 345 89 L397 154 Q453 166 464 202 L461 244 Q449 257 409 255 L94 257 Q47 255 37 238Z" fill="#d9e5df"/>
    <path d="M111 150 L162 87 Q168 79 192 79 L222 80 L222 150Z M239 80 L300 83 Q311 85 326 100 L366 150 L239 150Z" fill="#fffdf6"/>
    <path d="M237 165 V236 M102 173 L385 173 M258 186 H284" fill="none" strokeWidth={2.5}/>
    <path d="M43 190 L83 190 Q97 192 89 207 L39 211 M416 182 L450 196 L452 211 L417 206Z" fill="#fff6d9"/>
    <path d="M389 233 H453" fill="none" strokeWidth={5}/>
    {[119,372].map(x=><g key={x}><ellipse cx={x} cy={252} rx={40} ry={43} fill="#77756f"/><ellipse cx={x} cy={252} rx={23} ry={26} fill="#edeae1"/><circle cx={x} cy={252} r={7} fill="#aca99f" strokeWidth={2}/></g>)}
    <path d="M384 147 Q400 132 413 143 Q424 159 405 164" fill="#d9e5df"/>
    <path d="M88 174 H104 V185 H88Z" fill="#fbfaf4"/>
    <path d="M87 180 C48 179 48 291 8 291" fill="none" stroke="#7b9288" pathLength={1} strokeDasharray={1} strokeDashoffset={1-progress}/>
  </g>
</svg>;
