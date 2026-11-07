import {
  C, NAMES, PAL, FLABEL, ALL_MOVES,
} from "../engine/cube.js";
import FlatFace from "./FlatFace.jsx";
import ThreeCubeLazy from "./ThreeCubeLazy.jsx";
import ScrambleBanner from "./ScrambleBanner.jsx";
import PatternLibrary from "./PatternLibrary.jsx";
import CameraScanner from "./CameraScanner.jsx";
import { NoWebGL, hasWebGL } from "./ui.jsx";

// The input screen: solver status, paint/3D tabs, algorithm entry,
// validation, and the scramble/solve/reset action row.
export default function InputPanel({ cs, solver, onSolve, onReset }) {
  const busy = cs.scrambling || cs.animatingAlgo;
  const canSolve = !busy && cs.validationErrs.length === 0;

  const tabBtn = (label, key) => (
    <button onClick={() => cs.setTab(key)} style={{
      flex:1, padding:"9px 0", border:"none", cursor:"pointer",
      fontFamily:"var(--font-sans)", fontSize:12, letterSpacing:1,
      background: cs.tab===key ? "var(--accent)" : "transparent",
      color: cs.tab===key ? "#000" : "#444",
      borderRadius: cs.tab===key ? 6 : 0,
      fontWeight: cs.tab===key ? 900 : 400,
      transition:"all .2s",
      WebkitTapHighlightColor:"transparent",
    }}>{label}</button>
  );

  const kBadge = () => {
    let col, txt;
    if (solver.kStatus === 'initializing' && solver.initProgress) {
      const p = solver.initProgress;
      const phaseName = p.phase === 'moveTables' ? 'MOVE TABLES' : 'PRUNING TABLES';
      const initPct = Math.round((p.done / p.total) * 100);
      col = "#FF6D00";
      txt = `⟳ BUILDING ${phaseName}... ${p.done}/${p.total} (${initPct}%)`;
    } else {
      const cfg = {
        loading:      {col:"#444",   txt:"⟳ LOADING SOLVER..."},
        initializing: {col:"#FF6D00",txt:"⟳ INITIALIZING KOCIEMBA..."},
        ready:        {col:"#2E7D32",txt:"✓ KOCIEMBA READY — MULTI-ORIENTATION SEARCH"},
        error:        {col:"#C62828",txt:"⚠ KOCIEMBA UNAVAILABLE"},
      }[solver.kStatus] || {col:"#444",txt:""};
      col = cfg.col; txt = cfg.txt;
    }
    return (
      <div style={{
        fontSize:11, color:col, letterSpacing:1, textAlign:"center",
        padding:"6px 10px", background:col+"11", border:`1px solid ${col}33`,
        borderRadius:6, marginBottom:12, transition:"all .3s",
      }}>{txt}</div>
    );
  };

  return (
    <div style={{width:"100%",maxWidth:530}}>
      {kBadge()}

      {solver.kStatus!=="ready" && (
        <div style={{fontSize:11,color:"var(--orange)",textAlign:"center",marginBottom:12,letterSpacing:1,padding:"8px",background:"#FF6D0010",border:"1px solid #FF6D0033",borderRadius:8}}>
          {solver.kStatus==="error" ? "Solver failed to load — try refreshing the page." : "Please wait for the solver to finish initializing..."}
        </div>
      )}
      {solver.kStatus==="ready" && (
        <div style={{fontSize:11,color:"var(--green)",textAlign:"center",marginBottom:12,letterSpacing:1,padding:"8px",background:"#2E7D3210",border:"1px solid #2E7D3233",borderRadius:8}}>
          Solver ready — searches 24 orientations for the shortest solution.
        </div>
      )}

      {/* Tabs */}
      <div style={{display:"flex",background:"var(--surface)",borderRadius:8,border:"1px solid var(--border)",marginBottom:16,padding:4,gap:4}}>
        {tabBtn("✏  PAINT","paint")}
        {tabBtn("⬡  3D + MOVES","3d")}
        {tabBtn("📷  SCAN","scan")}
      </div>

      {/* ── PAINT TAB ── */}
      {cs.tab==="paint" && (
        <div>
          <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:12,flexWrap:"wrap"}}>
            <div style={{display:"flex",background:"var(--surface)",border:"1px solid var(--border)",borderRadius:6,padding:3,gap:3}}>
              {[["✛","cross"],["▦","grid"]].map(([icon,key])=>(
                <button key={key} onClick={()=>cs.setFlatLayout(key)} style={{width:30,height:26,border:"none",cursor:"pointer",fontSize:13,background:cs.flatLayout===key?"var(--accent)":"transparent",color:cs.flatLayout===key?"#000":"#444",borderRadius:4,transition:"all .2s"}}>{icon}</button>
              ))}
            </div>
            <button onClick={()=>cs.setCycleMode(p=>!p)} style={{padding:"5px 10px",border:`1px solid ${cs.cycleMode?"var(--accent)":"var(--border)"}`,cursor:"pointer",fontFamily:"var(--font-sans)",fontSize:11,letterSpacing:1,background:cs.cycleMode?"#FFD60018":"transparent",color:cs.cycleMode?"var(--accent)":"#555",borderRadius:6}}>↻ CYCLE</button>
            <button onClick={cs.undo} disabled={!cs.history.length} style={{padding:"5px 10px",border:"1px solid var(--border)",cursor:cs.history.length?"pointer":"default",fontFamily:"var(--font-sans)",fontSize:11,letterSpacing:1,background:"transparent",color:cs.history.length?"#888":"#2a2a2a",borderRadius:6,marginLeft:"auto"}}>↩ UNDO{cs.history.length>0?` (${cs.history.length})`:""}</button>
          </div>

          {!cs.cycleMode ? (
            <div style={{marginBottom:14}}>
              <div style={{display:"flex",gap:"clamp(6px, 2vw, 10px)",justifyContent:"center",background:"var(--surface)",padding:"10px 16px",borderRadius:40,border:"1px solid var(--border)"}}>
                {PAL.map(col=><div key={col} onClick={()=>cs.setSelColor(col)} title={NAMES[col]} style={{width:"clamp(28px, 7vw, 38px)",height:"clamp(28px, 7vw, 38px)",borderRadius:"50%",background:C[col],cursor:"pointer",border:cs.selColor===col?"3px solid #fff":"3px solid transparent",transform:cs.selColor===col?"scale(1.15)":"scale(1)",boxShadow:cs.selColor===col?`0 0 12px ${C[col]}cc`:"none",transition:"all .15s",WebkitTapHighlightColor:"transparent"}}/>)}
              </div>
              <div style={{textAlign:"center",fontSize:12,color:C[cs.selColor],letterSpacing:1,marginTop:6,fontWeight:900}}>PAINTING: {NAMES[cs.selColor].toUpperCase()}</div>
            </div>
          ) : (
            <div style={{textAlign:"center",fontSize:12,color:"var(--accent)",letterSpacing:1,marginBottom:14,padding:"8px",background:"#FFD60010",border:"1px solid #FFD60033",borderRadius:8}}>CYCLE MODE — TAP ANY STICKER TO STEP THROUGH COLORS</div>
          )}

          {cs.flatLayout==="cross" && (
            <div onMouseDown={()=>cs.setPainting(true)} style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gridTemplateRows:"repeat(3,auto)",gridTemplateAreas:`". U . ." "L F R B" ". D . ."`,gap:"clamp(2px, 0.8vw, 6px)",justifyContent:"center",width:"100%",maxWidth:530,margin:"0 auto",overflow:"hidden"}}>
              {["U","L","F","R","B","D"].map(fk=><div key={fk} style={{gridArea:fk}}><FlatFace faceKey={fk} stickers={cs.cube[fk]} onPaint={cs.paint} onCycle={cs.cycleSticker} painting={cs.painting} cycleMode={cs.cycleMode} /></div>)}
            </div>
          )}
          {cs.flatLayout==="grid" && (
            <div onMouseDown={()=>cs.setPainting(true)} style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,maxWidth:330,margin:"0 auto"}}>
              {["U","R","F","B","D","L"].map(fk=><div key={fk}><FlatFace faceKey={fk} stickers={cs.cube[fk]} onPaint={cs.paint} onCycle={cs.cycleSticker} painting={cs.painting} cycleMode={cs.cycleMode}/></div>)}
            </div>
          )}

          {/* Algo input */}
          <div style={{marginTop:18,background:"var(--surface-2)",border:"1px solid var(--border)",borderRadius:10,padding:14}}>
            <div style={{fontSize:11,color:"#555",letterSpacing:1,marginBottom:8}}>⌨  ALGORITHM INPUT</div>
            <div style={{display:"flex",gap:6,marginBottom:6}}>
              <input value={cs.algoInput} onChange={e=>cs.setAlgoInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&cs.applyAlgo()} placeholder="e.g.  R U R' U' R U2 R'" style={{flex:1,padding:"8px 12px",fontSize:"0.82rem",letterSpacing:1,minWidth:0}}/>
              <button onClick={cs.applyAlgo} disabled={!cs.algoInput||busy} style={{padding:"8px 14px",background:"var(--border)",border:"1px solid var(--border-2)",borderRadius:6,color:cs.algoInput&&!busy?"var(--accent)":"#333",fontFamily:"var(--font-sans)",fontSize:11,letterSpacing:1,cursor:"pointer",whiteSpace:"nowrap"}}>APPLY</button>
              <button onClick={cs.animateAlgo} disabled={!cs.algoInput||busy} style={{padding:"8px 14px",background:"var(--border)",border:"1px solid var(--border-2)",borderRadius:6,color:cs.algoInput&&!busy?"var(--green)":"#333",fontFamily:"var(--font-sans)",fontSize:11,cursor:"pointer"}}>▶</button>
            </div>
            {cs.algoErr&&<div style={{color:"var(--err)",fontSize:12,marginBottom:6}}>⚠ {cs.algoErr}</div>}
            <div style={{fontFamily:"var(--font-mono)",fontSize:11,color:"#2a2a2a",letterSpacing:1,lineHeight:2,overflowWrap:"break-word"}}>{ALL_MOVES.join("  ")}</div>
          </div>

          {/* Pattern library (collapsible) */}
          <PatternLibrary cs={cs} />

          {/* Validation */}
          {cs.validationErrs.length>0 ? (
            <div style={{marginTop:12,background:"var(--err-bg)",border:"1px solid var(--err-border)",borderRadius:10,padding:14}}>
              <div style={{fontSize:11,color:"var(--err)",letterSpacing:1,marginBottom:8}}>⚠  VALIDATION ERRORS</div>
              {cs.validationErrs.map((e,i)=><div key={i} style={{fontSize:12,color:"var(--err-2)",marginBottom:5,letterSpacing:1}}>• {e}</div>)}
            </div>
          ) : (
            <div style={{marginTop:12,background:"var(--ok-bg)",border:"1px solid var(--ok-border)",borderRadius:10,padding:10,textAlign:"center"}}>
              <div style={{fontSize:11,color:"var(--green)",letterSpacing:1}}>✓ VALID — READY TO SOLVE</div>
            </div>
          )}
        </div>
      )}

      {/* ── 3D TAB ── */}
      {cs.tab==="3d" && (
        <div style={{display:"flex",flexDirection:"column",alignItems:"center"}}>
          <div style={{fontSize:12,color:"#444",letterSpacing:1,marginBottom:12}}>DRAG TO ROTATE</div>
          <div style={{marginBottom:24,width:"100%",maxWidth:360,aspectRatio:"1"}}>
            {hasWebGL ? <ThreeCubeLazy cube={cs.cube} width="100%" height="100%" animTrigger={cs.paintAnimTrigger} onAnimationDone={cs.handlePaintAnimDone} animDuration={0.35} onMove={cs.doMoveAnimated}/> : <NoWebGL width="100%" height="100%"/>}
          </div>
          <div style={{width:"100%",background:"var(--surface-2)",border:"1px solid var(--border)",borderRadius:10,padding:14}}>
            <div style={{fontSize:11,color:"#555",letterSpacing:1,marginBottom:12,textAlign:"center"}}>INTERACTIVE FACE ROTATIONS</div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8}}>
              {[["U","#FFD600"],["R","#C62828"],["F","#1565C0"],["D","#ccc"],["L","#E65100"],["B","#2E7D32"]].map(([face,col])=>(
                <div key={face} style={{background:"var(--surface)",border:`1px solid ${col}22`,borderRadius:8,padding:"8px 4px"}}>
                  <div style={{fontSize:11,color:col,letterSpacing:1,marginBottom:7,textAlign:"center",fontWeight:900}}>{FLABEL[face]}</div>
                  <div style={{display:"flex",gap:3,justifyContent:"center"}}>
                    {[face,face+"'",face+"2"].map(m=><button key={m} onClick={()=>cs.doMoveAnimated(m)} disabled={!!cs.paintPendingMove} style={{flex:1,background:"var(--border)",border:`1px solid ${col}33`,borderRadius:4,padding:"6px 2px",cursor:cs.paintPendingMove?"default":"pointer",fontFamily:"var(--font-mono)",fontWeight:900,fontSize:"0.72rem",color:cs.paintPendingMove?col+"66":col,minWidth:0}}>{m}</button>)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── SCAN TAB ── */}
      {cs.tab==="scan" && (
        <CameraScanner cs={cs} />
      )}

      {cs.scrambleSeq&&<div style={{marginTop:14}}><ScrambleBanner seq={cs.scrambleSeq}/></div>}
      {cs.err&&<div style={{color:"var(--err)",fontSize:11,textAlign:"center",marginTop:14}}>⚠ {cs.err}</div>}

      <div style={{display:"flex",gap:8,marginTop:20,justifyContent:"center",flexWrap:"wrap"}}>
        <button onClick={cs.handleScramble} disabled={busy} style={{background:busy?"var(--surface)":"linear-gradient(135deg,var(--blue),var(--green))",border:busy?"1px solid var(--border)":"none",borderRadius:8,padding:"14px 20px",color:busy?"#444":"#fff",fontFamily:"var(--font-sans)",fontWeight:900,fontSize:"0.85rem",letterSpacing:1,cursor:busy?"default":"pointer",animation:cs.scrambling?"flash .5s ease infinite":"none"}}>
          {cs.scrambling?"⟳ SCRAMBLING...":"🎲 SCRAMBLE"}
        </button>
        <button onClick={onSolve} disabled={!canSolve||solver.kStatus!=="ready"} style={{background:(!canSolve||solver.kStatus!=="ready")?"var(--surface)":"linear-gradient(135deg,var(--accent-2),var(--accent))",border:(!canSolve||solver.kStatus!=="ready")?"1px solid var(--border)":"none",borderRadius:8,padding:"14px 34px",color:(!canSolve||solver.kStatus!=="ready")?"#333":"#000",fontFamily:"var(--font-sans)",fontWeight:900,fontSize:"1rem",letterSpacing:1,cursor:"pointer",transition:"all .2s"}}>▶ SOLVE</button>
        <button onClick={onReset} disabled={busy} style={{background:"transparent",border:"1px solid var(--border)",borderRadius:8,padding:"14px 18px",color:"#444",fontFamily:"var(--font-sans)",fontSize:12,letterSpacing:1,cursor:"pointer"}}>RESET</button>
      </div>
    </div>
  );
}
