import { useState } from "react";
import {
  C, NAMES, PAL, FLABEL, FACE_COLOR, MOVE_DESC, ALL_MOVES,
} from "./engine/cube.js";
import Cell from "./components/Cell.jsx";
import FlatFace from "./components/FlatFace.jsx";
import ThreeCube from "./components/ThreeCube.jsx";
import MoveBadge from "./components/MoveBadge.jsx";
import ScrambleBanner from "./components/ScrambleBanner.jsx";

import useCubeState from "./hooks/useCubeState.js";
import useSolver from "./hooks/useSolver.js";
import useAnimation from "./hooks/useAnimation.js";

// Detect WebGL support once at startup
const hasWebGL = (() => {
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") || c.getContext("webgl") || c.getContext("experimental-webgl"));
  } catch { return false; }
})();

function NoWebGL({ width, height }) {
  return (
    <div style={{width,height,background:"#07070f",borderRadius:12,display:"flex",
      alignItems:"center",justifyContent:"center",color:"#666",
      fontFamily:"'Courier New',monospace",fontSize:11,textAlign:"center",padding:20,
      border:"1px solid #1a1a2e"}}>
      3D view requires WebGL<br/>Try Chrome or enable WebGL in your browser
    </div>
  );
}

export default function App() {
  const cs = useCubeState();
  const solver = useSolver();

  const [solution, setSolution] = useState(null);
  const [startCube, setStartCube] = useState(null);

  const anim = useAnimation({ solution, startCube, cube: cs.cube });

  // ── Solve ──────────────────────────────────────────────────────
  const handleSolve = async () => {
    anim.setPhase("solving"); cs.setErr("");
    try {
      const result = await solver.solve(cs.cube);
      setSolution(result.solution);
      setStartCube(result.startCube);
      anim.resetAnimation();
      // setPhase after resetAnimation so it doesn't get overwritten
      anim.setPhase("solution");
    } catch (e) {
      cs.setErr("Kociemba error — cube state may be invalid. Try re-entering colors.");
      anim.setPhase("input");
    }
  };

  const reset = () => {
    cs.resetCube();
    setSolution(null); setStartCube(null);
    anim.resetAnimation();
  };

  const total = anim.total;
  const cur = solution?.steps?.[anim.step < total ? anim.step : total - 1];
  const pct = total ? Math.round((anim.step / total) * 100) : 0;
  const STAGE_C = {"White Cross":"#eee","White Corners":"#aaa","Middle Layer":"#FFD600","Yellow Cross":"#FFD600","Orient Yellow Corners":"#FF6D00","Position Last Layer Corners":"#C62828","Cycle Last Layer Edges":"#2E7D32","Solved!":"#2E7D32"};
  const sc = STAGE_C[cur?.stage] || "#FF6D00";
  const busy = cs.scrambling || cs.animatingAlgo;
  const canSolve = !busy && cs.validationErrs.length === 0;

  const tabBtn = (label, key) => <button onClick={() => cs.setTab(key)} style={{flex:1,padding:"9px 0",border:"none",cursor:"pointer",fontFamily:"'Courier New',monospace",fontSize:9,letterSpacing:3,background:cs.tab===key?"#FFD600":"transparent",color:cs.tab===key?"#000":"#444",borderRadius:cs.tab===key?6:0,fontWeight:cs.tab===key?900:400,transition:"all .2s"}}>{label}</button>;

  const kBadge = () => {
    const cfg = {
      loading:      {col:"#444",   txt:"⟳ LOADING SOLVER..."},
      initializing: {col:"#FF6D00",txt:"⟳ INITIALIZING KOCIEMBA..."},
      ready:        {col:"#2E7D32",txt:"✓ KOCIEMBA READY (≤22 MOVES)"},
      error:        {col:"#C62828",txt:"⚠ KOCIEMBA UNAVAILABLE"},
    }[solver.kStatus] || {col:"#444",txt:""};
    return <div style={{fontSize:7,color:cfg.col,letterSpacing:2,textAlign:"center",padding:"6px 10px",background:cfg.col+"11",border:`1px solid ${cfg.col}33`,borderRadius:6,marginBottom:12,transition:"all .3s"}}>{cfg.txt}</div>;
  };

  return (
    <div style={{minHeight:"100vh",background:"#07070f",backgroundImage:"radial-gradient(ellipse 80% 50% at 50% -10%, #0f0f2a, transparent)",color:"#fff",fontFamily:"'Courier New',monospace",display:"flex",flexDirection:"column",alignItems:"center",padding:"28px 16px 80px",userSelect:"none"}}>
      <style>{`
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes pulse{0%,100%{opacity:.3}50%{opacity:1}}
        @keyframes up{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:translateY(0)}}
        @keyframes flash{0%,100%{opacity:1}50%{opacity:.4}}
        @keyframes glow{0%,100%{box-shadow:0 0 0px #FFD60000}50%{box-shadow:0 0 32px #FFD60066}}
        *{box-sizing:border-box;}
        input{background:#0d0d18;color:#fff;border:1px solid #1a1a2e;border-radius:6px;font-family:'Courier New',monospace;outline:none;}
        input:focus{border-color:#FFD600;}
        button:hover:not(:disabled){filter:brightness(1.15);}
      `}</style>

      {/* Header */}
      <div style={{textAlign:"center",marginBottom:22}}>
        <div style={{fontSize:9,letterSpacing:8,color:"#333",marginBottom:5}}>◈ KOCIEMBA · AI-POWERED ◈</div>
        <div style={{fontSize:"2.4rem",fontWeight:900,letterSpacing:"-1px",lineHeight:1,background:"linear-gradient(100deg,#E65100 0%,#FFD600 30%,#2E7D32 60%,#1565C0 100%)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent"}}>RUBIK'S<br/>SOLVER</div>
      </div>

      {/* ══════════════ INPUT ══════════════ */}
      {anim.phase==="input" && (
        <div style={{width:"100%",maxWidth:530}}>
          {kBadge()}

          {solver.kStatus!=="ready" && (
            <div style={{fontSize:8,color:"#FF6D00",textAlign:"center",marginBottom:12,letterSpacing:1,padding:"8px",background:"#FF6D0010",border:"1px solid #FF6D0033",borderRadius:8}}>
              {solver.kStatus==="error" ? "Solver failed to load — try refreshing the page." : "Please wait for the solver to finish initializing..."}
            </div>
          )}
          {solver.kStatus==="ready" && (
            <div style={{fontSize:8,color:"#2E7D32",textAlign:"center",marginBottom:12,letterSpacing:1,padding:"8px",background:"#2E7D3210",border:"1px solid #2E7D3233",borderRadius:8}}>
              Solver ready — guarantees ≤22 moves for any valid state.
            </div>
          )}

          {/* Tabs */}
          <div style={{display:"flex",background:"#0d0d18",borderRadius:8,border:"1px solid #1a1a2e",marginBottom:16,padding:4,gap:4}}>
            {tabBtn("✏  PAINT","paint")}
            {tabBtn("⬡  3D + MOVES","3d")}
          </div>

          {/* ── PAINT TAB ── */}
          {cs.tab==="paint" && (
            <div>
              <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:12,flexWrap:"wrap"}}>
                <div style={{display:"flex",background:"#0d0d18",border:"1px solid #1a1a2e",borderRadius:6,padding:3,gap:3}}>
                  {[["✛","cross"],["▦","grid"]].map(([icon,key])=>(
                    <button key={key} onClick={()=>cs.setFlatLayout(key)} style={{width:30,height:26,border:"none",cursor:"pointer",fontSize:13,background:cs.flatLayout===key?"#FFD600":"transparent",color:cs.flatLayout===key?"#000":"#444",borderRadius:4,transition:"all .2s"}}>{icon}</button>
                  ))}
                </div>
                <button onClick={()=>cs.setCycleMode(p=>!p)} style={{padding:"5px 10px",border:`1px solid ${cs.cycleMode?"#FFD600":"#1a1a2e"}`,cursor:"pointer",fontFamily:"'Courier New',monospace",fontSize:8,letterSpacing:2,background:cs.cycleMode?"#FFD60018":"transparent",color:cs.cycleMode?"#FFD600":"#555",borderRadius:6}}>↻ CYCLE</button>
                <button onClick={cs.undo} disabled={!cs.history.length} style={{padding:"5px 10px",border:"1px solid #1a1a2e",cursor:cs.history.length?"pointer":"default",fontFamily:"'Courier New',monospace",fontSize:8,letterSpacing:2,background:"transparent",color:cs.history.length?"#888":"#2a2a2a",borderRadius:6,marginLeft:"auto"}}>↩ UNDO{cs.history.length>0?` (${cs.history.length})`:""}</button>
              </div>

              {!cs.cycleMode ? (
                <div style={{marginBottom:14}}>
                  <div style={{display:"flex",gap:10,justifyContent:"center",background:"#0d0d18",padding:"8px 16px",borderRadius:40,border:"1px solid #1a1a2e"}}>
                    {PAL.map(col=><div key={col} onClick={()=>cs.setSelColor(col)} title={NAMES[col]} style={{width:38,height:38,borderRadius:"50%",background:C[col],cursor:"pointer",border:cs.selColor===col?"3px solid #fff":"3px solid transparent",transform:cs.selColor===col?"scale(1.3)":"scale(1)",boxShadow:cs.selColor===col?`0 0 16px ${C[col]}cc`:"none",transition:"all .15s"}}/>)}
                  </div>
                  <div style={{textAlign:"center",fontSize:9,color:C[cs.selColor],letterSpacing:3,marginTop:6,fontWeight:900}}>PAINTING: {NAMES[cs.selColor].toUpperCase()}</div>
                </div>
              ) : (
                <div style={{textAlign:"center",fontSize:9,color:"#FFD600",letterSpacing:2,marginBottom:14,padding:"8px",background:"#FFD60010",border:"1px solid #FFD60033",borderRadius:8}}>CYCLE MODE — CLICK ANY STICKER TO STEP THROUGH COLORS</div>
              )}

              {cs.flatLayout==="cross" && (
                <div onMouseDown={()=>cs.setPainting(true)} style={{display:"grid",gridTemplateColumns:"repeat(4,auto)",gridTemplateRows:"repeat(3,auto)",gridTemplateAreas:`". U . ." "L F R B" ". D . ."`,gap:6,justifyContent:"center"}}>
                  {["U","L","F","R","B","D"].map(fk=><div key={fk} style={{gridArea:fk}}><FlatFace faceKey={fk} stickers={cs.cube[fk]} onPaint={cs.paint} onCycle={cs.cycleSticker} painting={cs.painting} cycleMode={cs.cycleMode} /></div>)}
                </div>
              )}
              {cs.flatLayout==="grid" && (
                <div onMouseDown={()=>cs.setPainting(true)} style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,maxWidth:330,margin:"0 auto"}}>
                  {["U","R","F","B","D","L"].map(fk=><div key={fk}><FlatFace faceKey={fk} stickers={cs.cube[fk]} onPaint={cs.paint} onCycle={cs.cycleSticker} painting={cs.painting} cycleMode={cs.cycleMode}/></div>)}
                </div>
              )}

              {/* Algo input */}
              <div style={{marginTop:18,background:"#08080f",border:"1px solid #1a1a2e",borderRadius:10,padding:14}}>
                <div style={{fontSize:7,color:"#555",letterSpacing:3,marginBottom:8}}>⌨  ALGORITHM INPUT</div>
                <div style={{display:"flex",gap:6,marginBottom:6}}>
                  <input value={cs.algoInput} onChange={e=>cs.setAlgoInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&cs.applyAlgo()} placeholder="e.g.  R U R' U' R U2 R'" style={{flex:1,padding:"8px 12px",fontSize:"0.82rem",letterSpacing:1}}/>
                  <button onClick={cs.applyAlgo} disabled={!cs.algoInput||busy} style={{padding:"8px 14px",background:"#1a1a2e",border:"1px solid #2a2a4e",borderRadius:6,color:cs.algoInput&&!busy?"#FFD600":"#333",fontFamily:"'Courier New',monospace",fontSize:8,letterSpacing:2,cursor:"pointer"}}>APPLY</button>
                  <button onClick={cs.animateAlgo} disabled={!cs.algoInput||busy} style={{padding:"8px 14px",background:"#1a1a2e",border:"1px solid #2a2a4e",borderRadius:6,color:cs.algoInput&&!busy?"#2E7D32":"#333",fontFamily:"'Courier New',monospace",fontSize:11,cursor:"pointer"}}>▶</button>
                </div>
                {cs.algoErr&&<div style={{color:"#ff5555",fontSize:9,marginBottom:6}}>⚠ {cs.algoErr}</div>}
                <div style={{fontSize:7,color:"#2a2a2a",letterSpacing:1,lineHeight:2}}>{ALL_MOVES.join("  ")}</div>
              </div>

              {/* Validation */}
              {cs.validationErrs.length>0 ? (
                <div style={{marginTop:12,background:"#180808",border:"1px solid #3a1a1a",borderRadius:10,padding:14}}>
                  <div style={{fontSize:7,color:"#ff5555",letterSpacing:3,marginBottom:8}}>⚠  VALIDATION ERRORS</div>
                  {cs.validationErrs.map((e,i)=><div key={i} style={{fontSize:9,color:"#ff7777",marginBottom:5,letterSpacing:1}}>• {e}</div>)}
                </div>
              ) : (
                <div style={{marginTop:12,background:"#081408",border:"1px solid #0d260d",borderRadius:10,padding:10,textAlign:"center"}}>
                  <div style={{fontSize:8,color:"#2E7D32",letterSpacing:3}}>✓ VALID — READY TO SOLVE</div>
                </div>
              )}
            </div>
          )}

          {/* ── 3D TAB ── */}
          {cs.tab==="3d" && (
            <div style={{display:"flex",flexDirection:"column",alignItems:"center"}}>
              <div style={{fontSize:9,color:"#444",letterSpacing:3,marginBottom:12}}>DRAG TO ROTATE</div>
              <div style={{marginBottom:24}}>
                {hasWebGL ? <ThreeCube cube={cs.cube} width={360} height={360} animTrigger={cs.paintAnimTrigger} onAnimationDone={cs.handlePaintAnimDone} animDuration={0.35}/> : <NoWebGL width={360} height={360}/>}
              </div>
              <div style={{width:"100%",background:"#08080f",border:"1px solid #1a1a2e",borderRadius:10,padding:14}}>
                <div style={{fontSize:7,color:"#555",letterSpacing:3,marginBottom:12,textAlign:"center"}}>INTERACTIVE FACE ROTATIONS</div>
                <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8}}>
                  {[["U","#FFD600"],["R","#C62828"],["F","#1565C0"],["D","#ccc"],["L","#E65100"],["B","#2E7D32"]].map(([face,col])=>(
                    <div key={face} style={{background:"#0d0d18",border:`1px solid ${col}22`,borderRadius:8,padding:"8px 4px"}}>
                      <div style={{fontSize:8,color:col,letterSpacing:3,marginBottom:7,textAlign:"center",fontWeight:900}}>{FLABEL[face]}</div>
                      <div style={{display:"flex",gap:3,justifyContent:"center"}}>
                        {[face,face+"'",face+"2"].map(m=><button key={m} onClick={()=>cs.doMoveAnimated(m)} disabled={!!cs.paintPendingMove} style={{flex:1,background:"#1a1a2e",border:`1px solid ${col}33`,borderRadius:4,padding:"6px 2px",cursor:cs.paintPendingMove?"default":"pointer",fontFamily:"'Courier New',monospace",fontWeight:900,fontSize:"0.72rem",color:cs.paintPendingMove?col+"66":col,minWidth:0}}>{m}</button>)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {cs.scrambleSeq&&<div style={{marginTop:14}}><ScrambleBanner seq={cs.scrambleSeq}/></div>}
          {cs.err&&<div style={{color:"#ff5555",fontSize:11,textAlign:"center",marginTop:14}}>⚠ {cs.err}</div>}

          <div style={{display:"flex",gap:8,marginTop:20,justifyContent:"center",flexWrap:"wrap"}}>
            <button onClick={cs.handleScramble} disabled={busy} style={{background:busy?"#0d0d18":"linear-gradient(135deg,#1565C0,#2E7D32)",border:busy?"1px solid #1a1a2e":"none",borderRadius:8,padding:"14px 20px",color:busy?"#444":"#fff",fontFamily:"'Courier New',monospace",fontWeight:900,fontSize:"0.85rem",letterSpacing:3,cursor:busy?"default":"pointer",animation:cs.scrambling?"flash .5s ease infinite":"none"}}>
              {cs.scrambling?"⟳ SCRAMBLING...":"🎲 SCRAMBLE"}
            </button>
            <button onClick={handleSolve} disabled={!canSolve||solver.kStatus!=="ready"} style={{background:(!canSolve||solver.kStatus!=="ready")?"#0d0d18":"linear-gradient(135deg,#E65100,#FFD600)",border:(!canSolve||solver.kStatus!=="ready")?"1px solid #1a1a2e":"none",borderRadius:8,padding:"14px 34px",color:(!canSolve||solver.kStatus!=="ready")?"#333":"#000",fontFamily:"'Courier New',monospace",fontWeight:900,fontSize:"1rem",letterSpacing:4,cursor:"pointer",transition:"all .2s"}}>▶ SOLVE</button>
            <button onClick={reset} disabled={busy} style={{background:"transparent",border:"1px solid #1a1a2e",borderRadius:8,padding:"14px 18px",color:"#444",fontFamily:"'Courier New',monospace",fontSize:9,letterSpacing:3,cursor:"pointer"}}>RESET</button>
          </div>
        </div>
      )}

      {/* ══════════════ SOLVING ══════════════ */}
      {anim.phase==="solving" && (
        <div style={{textAlign:"center",padding:"80px 0"}}>
          <div style={{width:60,height:60,margin:"0 auto 20px",borderRadius:"50%",border:"3px solid #1a1a2e",borderTop:"3px solid #FFD600",borderRight:"3px solid #E65100",animation:"spin .8s linear infinite"}}/>
          <div style={{fontSize:10,letterSpacing:6,color:"#444",animation:"pulse 1.4s ease infinite"}}>SOLVING...</div>
        </div>
      )}

      {/* ══════════════ SOLUTION ══════════════ */}
      {anim.phase==="solution" && solution && cur && (
        <div style={{width:"100%",maxWidth:520,animation:"up .4s ease"}}>

          {/* Live 3D cube */}
          <div style={{display:"flex",flexDirection:"column",alignItems:"center",marginBottom:20,background:"#08080f",border:"1px solid #1a1a2e",borderRadius:14,padding:"20px 20px 16px",animation:anim.cubeFlash?"glow .35s ease":"none"}}>
            <div style={{fontSize:7,color:"#444",letterSpacing:4,marginBottom:14}}>
              LIVE CUBE — {anim.step} OF {total} MOVES APPLIED
              {anim.highlightFace&&<span style={{color:FACE_COLOR[anim.highlightFace]||"#FFD600",marginLeft:8}}>[ {FLABEL[anim.highlightFace]} FACE ]</span>}
            </div>
            {hasWebGL ? <ThreeCube cube={anim.displayCube} width={320} height={320} animTrigger={anim.animTrigger} onAnimationDone={anim.handleAnimDone} animDuration={anim.SPEEDS[anim.playSpeed].anim}/> : <NoWebGL width={320} height={320}/>}
            <div style={{display:"flex",gap:4,marginTop:12,flexWrap:"wrap",justifyContent:"center",maxWidth:400}}>
              {solution.steps.map((_,i)=><div key={i} onClick={()=>anim.goStep(i+1)} style={{height:5,width:i===anim.step-1?18:5,borderRadius:3,cursor:"pointer",background:i<anim.step?"#E65100":i===anim.step?"#FFD600":"#1a1a2e",transition:"all .2s"}}/>)}
            </div>
          </div>

          {/* Stats */}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",background:"#0d0d18",border:"1px solid #1a1a2e",borderRadius:8,marginBottom:14,overflow:"hidden"}}>
            {[["TOTAL MOVES",solution.totalMoves,"#FFD600"],["DONE",`${anim.step} / ${total}`,"#fff"],["PROGRESS",`${pct}%`,"#2E7D32"]].map(([l,v,col])=>(
              <div key={l} style={{padding:"12px 0",textAlign:"center",borderRight:"1px solid #1a1a2e"}}>
                <div style={{fontSize:7,color:"#444",letterSpacing:2,marginBottom:4}}>{l}</div>
                <div style={{fontSize:"1.2rem",fontWeight:900,color:col}}>{v}</div>
              </div>
            ))}
          </div>

          <div style={{height:3,background:"#111",borderRadius:4,marginBottom:18,overflow:"hidden"}}>
            <div style={{height:"100%",background:"linear-gradient(90deg,#E65100,#FFD600,#2E7D32)",width:`${pct}%`,transition:"width .4s ease",borderRadius:4}}/>
          </div>

          {/* Step card */}
          <div key={anim.animIdx} style={{background:"#0d0d18",border:"1px solid #1a1a2e",borderRadius:14,padding:24,marginBottom:16,animation:"up .35s ease"}}>
            <div style={{display:"inline-block",marginBottom:16,padding:"4px 16px",borderRadius:20,background:sc+"18",border:`1px solid ${sc}33`,fontSize:8,letterSpacing:3,color:sc}}>{cur.stage.toUpperCase()}</div>
            <MoveBadge move={cur.move} idx={anim.animIdx}/>
            {cur.move&&(
              <div style={{textAlign:"center",fontSize:9,color:"#444",marginBottom:14,letterSpacing:1,lineHeight:1.8}}>
                {cur.move.trim().split(/\s+/).map(m=>MOVE_DESC[m]||m).join("  →  ")}
              </div>
            )}
            <p style={{color:"#ccc",lineHeight:1.85,margin:"0 0 14px",fontSize:"0.87rem"}}>{cur.explain}</p>
            {cur.tip&&<div style={{background:"#081408",border:"1px solid #0d260d",borderRadius:6,padding:"10px 14px",fontSize:"0.78rem",color:"#4a9",lineHeight:1.7}}>💡 {cur.tip}</div>}
          </div>

          {/* Nav */}
          <div style={{display:"flex",gap:8,justifyContent:"center",marginBottom:20}}>
            {[["⏮",()=>anim.goStep(0),anim.step===0||anim.pendingStep!==null,false],["← BACK",()=>{anim.setPlayingSync(false);anim.goStep(Math.max(0,anim.step-1));},anim.step===0||anim.pendingStep!==null,false]].map(([label,fn,dis,hi])=>(
              <button key={label} onClick={fn} disabled={dis} style={{background:"transparent",border:"1px solid #1a1a2e",borderRadius:6,padding:"11px 18px",cursor:dis?"default":"pointer",color:dis?"#2a2a2a":"#888",fontFamily:"'Courier New',monospace",fontSize:"0.8rem",letterSpacing:2}}>{label}</button>
            ))}
            <button
              onClick={()=>{if(!anim.playing){anim.setPlayingSync(true);anim.goStep(anim.step+1);}else{anim.setPlayingSync(false);}}}
              disabled={anim.step===total}
              style={{background:anim.playing?"#1a1a2e":"linear-gradient(135deg,#E65100,#FFD600)",border:"none",borderRadius:6,padding:"11px 22px",cursor:anim.step===total?"default":"pointer",color:anim.playing?"#FFD600":anim.step===total?"#333":"#000",fontFamily:"'Courier New',monospace",fontWeight:900,fontSize:"1rem",letterSpacing:2}}
            >{anim.playing?"⏸":"▶"}</button>
            <div style={{display:"flex",gap:3,alignItems:"center"}}>
              {[["0.5×","slow"],["1×","normal"],["2×","fast"]].map(([label,key])=>(
                <button key={key} onClick={()=>anim.setPlaySpeed(key)} style={{padding:"7px 9px",border:`1px solid ${anim.playSpeed===key?"#FFD600":"#1a1a2e"}`,borderRadius:5,cursor:"pointer",fontFamily:"'Courier New',monospace",fontSize:9,letterSpacing:1,background:anim.playSpeed===key?"#FFD60018":"transparent",color:anim.playSpeed===key?"#FFD600":"#444"}}>{label}</button>
              ))}
            </div>
            {[["NEXT →",()=>{anim.setPlayingSync(false);anim.goStep(Math.min(total,anim.step+1));},anim.step===total||anim.pendingStep!==null,true],["⏭",()=>{anim.setPlayingSync(false);anim.goStep(total);},anim.step===total||anim.pendingStep!==null,false]].map(([label,fn,dis,hi])=>(
              <button key={label} onClick={fn} disabled={dis} style={{background:hi&&!dis?"linear-gradient(135deg,#E65100,#FFD600)":"transparent",border:hi&&!dis?"none":"1px solid #1a1a2e",borderRadius:6,padding:"11px 18px",cursor:dis?"default":"pointer",color:hi&&!dis?"#000":dis?"#2a2a2a":"#888",fontFamily:"'Courier New',monospace",fontWeight:hi?"900":"400",fontSize:"0.8rem",letterSpacing:2}}>{label}</button>
            ))}
          </div>

          {/* All moves */}
          <details style={{marginBottom:18}}>
            <summary style={{cursor:"pointer",fontSize:9,color:"#444",letterSpacing:3,padding:"10px 14px",background:"#0d0d18",border:"1px solid #1a1a2e",borderRadius:8,listStyle:"none"}}>▸ VIEW ALL {solution.totalMoves} MOVES</summary>
            <div style={{background:"#08080f",border:"1px solid #1a1a2e",borderTop:"none",borderRadius:"0 0 8px 8px",maxHeight:200,overflowY:"auto",padding:6}}>
              {solution.steps.map((s,i)=>(
                <div key={i} onClick={()=>anim.goStep(i+1)} style={{display:"flex",alignItems:"center",gap:12,padding:"7px 10px",borderRadius:5,cursor:"pointer",marginBottom:2,background:i===anim.step-1?"#1a1a2e":"transparent",borderLeft:`2px solid ${i===anim.step-1?"#FFD600":"transparent"}`}}>
                  <span style={{color:"#333",fontSize:9,minWidth:20}}>{i+1}</span>
                  <span style={{color:"#FFD600",fontWeight:900,minWidth:88,fontSize:"0.82rem",letterSpacing:2}}>{s.move||"—"}</span>
                  <span style={{color:"#555",fontSize:9}}>{s.stage}</span>
                </div>
              ))}
            </div>
          </details>

          <button onClick={reset} style={{width:"100%",background:"transparent",border:"1px solid #1a1a2e",borderRadius:8,padding:11,color:"#444",fontFamily:"'Courier New',monospace",fontSize:9,letterSpacing:3,cursor:"pointer"}}>◂ START OVER</button>
        </div>
      )}
    </div>
  );
}
