import { useState, useEffect } from "react";

export default function MoveBadge({move,idx}) {
  const [show,setShow]=useState(false);
  useEffect(()=>{setShow(false);const t=setTimeout(()=>setShow(true),40);return()=>clearTimeout(t);},[idx]);
  if(!move) return null;
  return <div style={{display:"flex",gap:8,flexWrap:"wrap",justifyContent:"center",marginBottom:12}}>{move.trim().split(/\s+/).map((m,i)=><div key={i} style={{background:"var(--surface)",border:`2px solid ${i===0?"var(--accent)":"#222"}`,borderRadius:8,padding:"8px 18px",fontFamily:"'Courier New',monospace",fontWeight:900,fontSize:"1.6rem",color:"var(--accent)",letterSpacing:4,opacity:show?1:0,transform:show?"translateY(0) scale(1)":"translateY(14px) scale(0.85)",transition:`all .4s cubic-bezier(.34,1.56,.64,1) ${i*70}ms`,boxShadow:"0 4px 24px rgba(255,214,0,.12)"}}>{m}</div>)}</div>;
}
