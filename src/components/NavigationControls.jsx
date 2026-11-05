// Solution playback transport: start/prev/play-pause/next/end, speed, keyboard hint.
export default function NavigationControls({ anim, total }) {
  return (
    <>
      {/* Nav */}
      <nav aria-label="Solution playback controls" style={{display:"flex",gap:"clamp(4px,1.5vw,8px)",justifyContent:"center",marginBottom:8,flexWrap:"wrap",alignItems:"center"}}>
        <button aria-label="Go to start" onClick={()=>anim.goStep(0)} disabled={anim.step===0||anim.pendingStep!==null} style={{background:"transparent",border:"1px solid #1a1a2e",borderRadius:6,padding:"11px 14px",cursor:anim.step===0||anim.pendingStep!==null?"default":"pointer",color:anim.step===0||anim.pendingStep!==null?"#2a2a2a":"#888",fontFamily:"'Courier New',monospace",fontSize:"0.8rem",letterSpacing:2}}>⏮</button>
        <button aria-label="Previous step (undo)" onClick={()=>{anim.setPlayingSync(false);anim.goStep(Math.max(0,anim.step-1));}} disabled={anim.step===0||anim.pendingStep!==null} style={{background:"transparent",border:"1px solid #1a1a2e",borderRadius:6,padding:"11px 14px",cursor:anim.step===0||anim.pendingStep!==null?"default":"pointer",color:anim.step===0||anim.pendingStep!==null?"#2a2a2a":"#888",fontFamily:"'Courier New',monospace",fontSize:"0.8rem",letterSpacing:2}}>←</button>
        <button
          aria-label={anim.playing?"Pause playback":"Play solution"}
          onClick={()=>{if(!anim.playing){anim.setPlayingSync(true);anim.goStep(anim.step+1);}else{anim.setPlayingSync(false);}}}
          disabled={anim.step===total}
          style={{background:anim.playing?"#1a1a2e":"linear-gradient(135deg,#E65100,#FFD600)",border:"none",borderRadius:6,padding:"11px 22px",cursor:anim.step===total?"default":"pointer",color:anim.playing?"#FFD600":anim.step===total?"#333":"#000",fontFamily:"'Courier New',monospace",fontWeight:900,fontSize:"1rem",letterSpacing:2}}
        >{anim.playing?"⏸":"▶"}</button>
        <button aria-label="Next step (redo)" onClick={()=>{anim.setPlayingSync(false);anim.goStep(Math.min(total,anim.step+1));}} disabled={anim.step===total||anim.pendingStep!==null} style={{background:anim.step<total&&anim.pendingStep===null?"linear-gradient(135deg,#E65100,#FFD600)":"transparent",border:anim.step<total&&anim.pendingStep===null?"none":"1px solid #1a1a2e",borderRadius:6,padding:"11px 14px",cursor:anim.step===total||anim.pendingStep!==null?"default":"pointer",color:anim.step<total&&anim.pendingStep===null?"#000":anim.step===total||anim.pendingStep!==null?"#2a2a2a":"#888",fontFamily:"'Courier New',monospace",fontWeight:900,fontSize:"0.8rem",letterSpacing:2}}>→</button>
        <button aria-label="Go to end" onClick={()=>{anim.setPlayingSync(false);anim.goStep(total);}} disabled={anim.step===total||anim.pendingStep!==null} style={{background:"transparent",border:"1px solid #1a1a2e",borderRadius:6,padding:"11px 14px",cursor:anim.step===total||anim.pendingStep!==null?"default":"pointer",color:anim.step===total||anim.pendingStep!==null?"#2a2a2a":"#888",fontFamily:"'Courier New',monospace",fontSize:"0.8rem",letterSpacing:2}}>⏭</button>
      </nav>

      {/* Speed + keyboard hint */}
      <div style={{display:"flex",gap:8,justifyContent:"center",marginBottom:20,alignItems:"center",flexWrap:"wrap"}}>
        <div style={{display:"flex",gap:3,alignItems:"center"}}>
          {[["0.5×","slow"],["1×","normal"],["2×","fast"]].map(([label,key])=>(
            <button key={key} onClick={()=>anim.setPlaySpeed(key)} style={{padding:"7px 9px",border:`1px solid ${anim.playSpeed===key?"#FFD600":"#1a1a2e"}`,borderRadius:5,cursor:"pointer",fontFamily:"'Courier New',monospace",fontSize:9,letterSpacing:1,background:anim.playSpeed===key?"#FFD60018":"transparent",color:anim.playSpeed===key?"#FFD600":"#444"}}>{label}</button>
          ))}
        </div>
        <div style={{fontSize:7,color:"#2a2a2a",letterSpacing:1}}>← → STEP · SPACE PLAY · HOME END · ⌘Z UNDO</div>
      </div>
    </>
  );
}
