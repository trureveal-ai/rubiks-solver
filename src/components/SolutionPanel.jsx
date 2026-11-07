import { useState, useMemo } from "react";
import { FACE_COLOR, FLABEL, MOVE_DESC } from "../engine/cube.js";
import ThreeCubeLazy, { CAMERA_PRESETS } from "./ThreeCubeLazy.jsx";
import MoveBadge from "./MoveBadge.jsx";
import NavigationControls from "./NavigationControls.jsx";
import Celebration from "./Celebration.jsx";
import TimerStats from "./TimerStats.jsx";
import BeginnerSolution from "./BeginnerSolution.jsx";
import CfopAnnotation from "./CfopAnnotation.jsx";
import { solveBeginner, scrambleFromSolutionMoves } from "../engine/beginner-solver.js";
import { cfopAnnotate } from "../engine/cfop-annotate.js";
import { NoWebGL, ProgressRing, formatTime, hasWebGL } from "./ui.jsx";

const METHODS = [
  { key: "kociemba", label: "Kociemba" },
  { key: "beginner", label: "Beginner" },
  { key: "cfop", label: "CFOP" },
];

// A small segmented control to switch between solving-method views.
function MethodToggle({ method, setMethod }) {
  return (
    <div role="tablist" aria-label="Solution method" style={{
      display: "flex", gap: 4, background: "var(--surface-2)", border: "1px solid var(--border)",
      borderRadius: 10, padding: 4, marginBottom: 16,
    }}>
      {METHODS.map(({ key, label }) => (
        <button key={key} role="tab" aria-selected={method === key} onClick={() => setMethod(key)} style={{
          flex: 1, padding: "8px 6px", border: "none", borderRadius: 7, cursor: "pointer",
          fontFamily: "var(--font-sans)", fontSize: 12, letterSpacing: 1, fontWeight: method === key ? 900 : 400,
          background: method === key ? "linear-gradient(135deg,var(--accent-2),var(--accent))" : "transparent",
          color: method === key ? "#000" : "#777", transition: "all .15s",
        }}>{label}</button>
      ))}
    </div>
  );
}

// The solution screen: live 3D cube, stats + analysis, current-step card,
// playback transport, and the full move list.
export default function SolutionPanel({ solution, anim, cameraPreset, setCameraPreset, onCopy, onReset, sessionStats }) {
  const [method, setMethod] = useState("kociemba");
  const total = anim.total;

  // Alternate views are computed lazily — only when their tab is selected.
  const beginnerData = useMemo(() => {
    if (method !== "beginner" || !solution?.steps) return null;
    try {
      const kMoves = solution.steps.map((s) => s.move).filter(Boolean);
      const scramble = scrambleFromSolutionMoves(kMoves);
      return solveBeginner(scramble);
    } catch (e) {
      return { error: e?.message || "solve failed" };
    }
  }, [method, solution]);

  const cfopData = useMemo(
    () => (method === "cfop" && solution ? cfopAnnotate(solution) : null),
    [method, solution],
  );

  const cur = solution?.steps?.[anim.step < total ? anim.step : total - 1];
  if (!cur) return null;

  const pct = total ? Math.round((anim.step / total) * 100) : 0;
  const sc = cur?.stage?.startsWith("Phase 1") ? "#FF6D00"
           : cur?.stage?.startsWith("Phase 2") ? "#1565C0"
           : cur?.stage === "Solved!" ? "#2E7D32" : "#FF6D00";

  return (
    <div style={{width:"100%",maxWidth:520,animation:"up .4s ease"}}>

      {/* Method toggle (Kociemba | Beginner | CFOP) */}
      <MethodToggle method={method} setMethod={setMethod} />

      {method === "kociemba" && (
        <>
          {/* Agent C #17 — solve celebration (fires on the rising edge of 100%) */}
          <Celebration active={pct === 100} />

          {/* Live 3D cube */}
          <div style={{display:"flex",flexDirection:"column",alignItems:"center",marginBottom:20,background:"var(--surface-2)",border:"1px solid var(--border)",borderRadius:14,padding:"20px 16px 16px",animation:anim.cubeFlash?"glow .35s ease":"none"}}>
            <div style={{fontSize:11,color:"#444",letterSpacing:1,marginBottom:14,textAlign:"center"}}>
              LIVE CUBE — {anim.step} OF {total} MOVES APPLIED
              {anim.highlightFace&&<span style={{color:FACE_COLOR[anim.highlightFace]||"var(--accent)",marginLeft:8}}>[ {FLABEL[anim.highlightFace]} FACE ]</span>}
            </div>
            <div style={{width:"100%",maxWidth:320,aspectRatio:"1"}}>
              {hasWebGL ? <ThreeCubeLazy cube={anim.displayCube} width="100%" height="100%" animTrigger={anim.animTrigger} onAnimationDone={anim.handleAnimDone} animDuration={anim.SPEEDS[anim.playSpeed].anim} cameraPreset={cameraPreset}/> : <NoWebGL width="100%" height="100%"/>}
            </div>

            {/* Camera presets */}
            <div style={{display:"flex",gap:4,marginTop:12,alignItems:"center",flexWrap:"wrap",justifyContent:"center"}} role="toolbar" aria-label="Camera angle presets">
              <span style={{fontSize:11,color:"#333",letterSpacing:1,marginRight:4}}>VIEW</span>
              {Object.entries(CAMERA_PRESETS).map(([key,{label,name}])=>(
                <button key={key} onClick={()=>setCameraPreset(key)} aria-label={`${name} camera view`} title={name} style={{
                  width:28, height:24, border:`1px solid ${cameraPreset===key?"var(--accent)":"var(--border)"}`, borderRadius:4,
                  background:cameraPreset===key?"#FFD60018":"transparent", color:cameraPreset===key?"var(--accent)":"#444",
                  fontFamily:"var(--font-sans)", fontSize:12, cursor:"pointer", fontWeight:cameraPreset===key?900:400,
                }}>{label}</button>
              ))}
            </div>

            <div style={{display:"flex",gap:4,marginTop:8,flexWrap:"wrap",justifyContent:"center",maxWidth:400}} role="progressbar" aria-valuenow={anim.step} aria-valuemin={0} aria-valuemax={total} aria-label={`Solution progress: step ${anim.step} of ${total}`}>
              {solution.steps.map((_,i)=><div key={i} onClick={()=>anim.goStep(i+1)} aria-hidden="true" style={{height:5,width:i===anim.step-1?18:5,borderRadius:3,cursor:"pointer",background:i<anim.step?"var(--accent-2)":i===anim.step?"var(--accent)":"var(--border)",transition:"all .2s",WebkitTapHighlightColor:"transparent"}}/>)}
            </div>
          </div>

          {/* Stats — redesigned with progress ring */}
          <div style={{display:"flex",gap:12,alignItems:"center",background:"var(--surface)",border:"1px solid var(--border)",borderRadius:12,padding:"14px 16px",marginBottom:14}}>
            <div style={{position:"relative",flexShrink:0}}>
              <ProgressRing pct={pct} size={56} stroke={4} color={pct===100?"var(--green)":"var(--accent)"}/>
              <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:900,color:pct===100?"var(--green)":"var(--accent)"}}>{pct}%</div>
            </div>
            <div style={{flex:1,display:"grid",gridTemplateColumns:"1fr 1fr",gap:"4px 16px"}}>
              <div>
                <div style={{fontSize:11,color:"#555",letterSpacing:1}}>MOVES</div>
                <div style={{fontSize:"1.1rem",fontWeight:900,color:"var(--accent)"}}>{anim.step} / {total}</div>
              </div>
              <div>
                <div style={{fontSize:11,color:"#555",letterSpacing:1}}>TOTAL</div>
                <div style={{fontSize:"1.1rem",fontWeight:900,color:"#fff"}}>{solution.totalMoves}</div>
              </div>
              {solution.stats?.solveTimeMs != null && (
                <div>
                  <div style={{fontSize:11,color:"#555",letterSpacing:1}}>SOLVE TIME</div>
                  <div style={{fontSize:"0.85rem",fontWeight:700,color:"#888"}}>{formatTime(solution.stats.solveTimeMs)}</div>
                </div>
              )}
              <div>
                <div style={{fontSize:11,color:"#555",letterSpacing:1}}>PHASE</div>
                <div style={{fontSize:"0.85rem",fontWeight:700,color:sc}}>{cur.phase === 1 ? "REDUCE" : cur.phase === 2 ? "SOLVE" : "DONE"}</div>
              </div>
            </div>
          </div>

          {/* Solution comparison / efficiency */}
          {solution.stats && (
            <div style={{background:"var(--surface)",border:"1px solid var(--border)",borderRadius:12,padding:"12px 16px",marginBottom:14}} role="region" aria-label="Solution analysis">
              <div style={{fontSize:11,color:"#555",letterSpacing:1,marginBottom:10}}>◈ SOLUTION ANALYSIS</div>
              <div style={{display:"flex",gap:12,flexWrap:"wrap"}}>
                <div style={{flex:1,minWidth:100}}>
                  <div style={{fontSize:11,color:"#555",letterSpacing:1}}>ORIENTATIONS</div>
                  <div style={{fontSize:"0.9rem",fontWeight:700,color:"var(--accent)"}}>{solution.stats.orientationsSearched} / 24</div>
                </div>
                <div style={{flex:1,minWidth:100}}>
                  <div style={{fontSize:11,color:"#555",letterSpacing:1}}>EFFICIENCY</div>
                  <div style={{fontSize:"0.9rem",fontWeight:700,color:solution.totalMoves<=18?"var(--green)":solution.totalMoves<=22?"var(--accent)":"var(--accent-2)"}}>
                    {solution.totalMoves<=14?"EXCELLENT":solution.totalMoves<=18?"VERY GOOD":solution.totalMoves<=22?"GOOD":"FAIR"}
                  </div>
                </div>
                <div style={{flex:1,minWidth:100}}>
                  <div style={{fontSize:11,color:"#555",letterSpacing:1}}>MOVES / GOD</div>
                  <div style={{fontSize:"0.9rem",fontWeight:700,color:"#888"}}>{solution.totalMoves} / 20</div>
                </div>
              </div>
              <div style={{fontSize:11,color:"#2a2a2a",letterSpacing:1,marginTop:8,lineHeight:1.6}}>
                God's number for a 3×3 is 20 — any cube can be solved in ≤20 moves.
                {solution.totalMoves<=20?" This solution is optimal-range.":" Multi-orientation search found the shortest among 24 rotations."}
              </div>
            </div>
          )}

          {/* Session timer stats (Agent D) — tracked across solves, persisted */}
          {sessionStats && <TimerStats stats={sessionStats} />}

          {/* Step card */}
          <div key={anim.animIdx} style={{background:"var(--surface)",border:"1px solid var(--border)",borderRadius:14,padding:"20px 16px",marginBottom:16,animation:"up .35s ease"}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16,flexWrap:"wrap",gap:8}}>
              <div style={{padding:"4px 16px",borderRadius:20,background:sc+"18",border:`1px solid ${sc}33`,fontSize:11,letterSpacing:1,color:sc}}>{cur.stage.toUpperCase()}</div>
              <button onClick={onCopy} style={{padding:"4px 12px",borderRadius:16,background:"transparent",border:"1px solid var(--border)",fontSize:11,letterSpacing:1,color:"#555",cursor:"pointer",fontFamily:"var(--font-sans)"}} title="Copy solution to clipboard">📋 COPY</button>
            </div>
            <MoveBadge move={cur.move} idx={anim.animIdx}/>
            {cur.move&&(
              <div style={{textAlign:"center",fontSize:12,color:"#444",marginBottom:14,letterSpacing:1,lineHeight:1.8}}>
                {cur.move.trim().split(/\s+/).map(m=>MOVE_DESC[m]||m).join("  →  ")}
              </div>
            )}
            <p style={{color:"#ccc",lineHeight:1.85,margin:"0 0 14px",fontSize:"0.87rem"}}>{cur.explain}</p>
            {cur.tip&&<div style={{background:"var(--ok-bg)",border:"1px solid var(--ok-border)",borderRadius:6,padding:"10px 14px",fontSize:"0.85rem",color:"var(--tip)",lineHeight:1.7}}>💡 {cur.tip}</div>}
          </div>

          <NavigationControls anim={anim} total={total} />

          {/* All moves */}
          <details style={{marginBottom:18}}>
            <summary style={{cursor:"pointer",fontSize:12,color:"#444",letterSpacing:1,padding:"10px 14px",background:"var(--surface)",border:"1px solid var(--border)",borderRadius:8,listStyle:"none",WebkitTapHighlightColor:"transparent"}}>▸ VIEW ALL {solution.totalMoves} MOVES</summary>
            <div style={{background:"var(--surface-2)",border:"1px solid var(--border)",borderTop:"none",borderRadius:"0 0 8px 8px",maxHeight:200,overflowY:"auto",padding:6,WebkitOverflowScrolling:"touch"}}>
              {solution.steps.map((s,i)=>(
                <div key={i} onClick={()=>anim.goStep(i+1)} style={{display:"flex",alignItems:"center",gap:12,padding:"7px 10px",borderRadius:5,cursor:"pointer",marginBottom:2,background:i===anim.step-1?"var(--border)":"transparent",borderLeft:`2px solid ${i===anim.step-1?"var(--accent)":"transparent"}`,WebkitTapHighlightColor:"transparent"}}>
                  <span style={{color:"#333",fontSize:12,minWidth:20}}>{i+1}</span>
                  <span style={{fontFamily:"var(--font-mono)",color:"var(--accent)",fontWeight:900,minWidth:60,fontSize:"0.82rem",letterSpacing:1}}>{s.move||"—"}</span>
                  <span style={{color:"#555",fontSize:12,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{s.stage}</span>
                </div>
              ))}
            </div>
          </details>
        </>
      )}

      {method === "beginner" && <BeginnerSolution data={beginnerData} />}
      {method === "cfop" && <CfopAnnotation data={cfopData} />}

      <button onClick={onReset} style={{width:"100%",background:"transparent",border:"1px solid var(--border)",borderRadius:8,padding:11,marginTop:method==="kociemba"?0:6,color:"#444",fontFamily:"var(--font-sans)",fontSize:12,letterSpacing:1,cursor:"pointer"}}>◂ START OVER</button>
    </div>
  );
}
