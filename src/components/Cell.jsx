import { useState } from "react";
import { C } from "../engine/cube.js";

export default function Cell({color,size=36,onClick,onCycle,painting,cycleMode}) {
  const [hover,setHover]=useState(false);
  return <div onClick={cycleMode?onCycle:onClick} onMouseEnter={()=>{setHover(true);if(painting&&!cycleMode)onClick?.();}} onMouseLeave={()=>setHover(false)} style={{width:size,height:size,background:C[color]||"#1a1a1a",borderRadius:5,border:"2.5px solid rgba(0,0,0,0.5)",cursor:"pointer",transition:"transform .1s,box-shadow .1s",transform:hover?"scale(0.85)":"scale(1)",boxShadow:hover?`0 0 10px ${C[color]}99,inset 0 0 6px rgba(255,255,255,0.15)`:"inset 0 0 4px rgba(0,0,0,0.3)"}}/>;
}
