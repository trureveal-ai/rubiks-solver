import { FLABEL, FACE_COLOR } from "../engine/cube.js";
import Cell from "./Cell.jsx";

export default function FlatFace({faceKey,stickers,onPaint,onCycle,onHover,painting,cycleMode}) {
  return <div style={{minWidth:0}}><div style={{fontSize:7,color:FACE_COLOR[faceKey],textAlign:"center",marginBottom:3,letterSpacing:2,fontFamily:"monospace",fontWeight:900,opacity:.8}}>{FLABEL[faceKey]}</div><div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:"clamp(2px, 0.6vw, 3px)",padding:"clamp(3px, 0.8vw, 5px)",borderRadius:7,background:"#0d0d0d",border:`2px solid ${FACE_COLOR[faceKey]}33`}}>{stickers.map((col,i)=><Cell key={i} color={col} size="100%" painting={painting} cycleMode={cycleMode} onClick={()=>onPaint(faceKey,i)} onCycle={()=>onCycle(faceKey,i)} onHover={()=>onHover?.(faceKey,i)}/>)}</div></div>;
}
