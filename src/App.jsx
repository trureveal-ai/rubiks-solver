import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  C, NAMES, PAL, FLABEL, FACE_COLOR, MOVE_DESC,
  initCube, copyCube, MOVE_FN, ALL_MOVES,
  generateScramble, applyMoveString, replayToCube,
} from "./engine/cube.js";
import { validateCube } from "./engine/validate.js";
import { initKociemba, cubeToKociemba, terminateKociemba, KociembaCube } from "./engine/kociemba.js";
import Cell from "./components/Cell.jsx";
import FlatFace from "./components/FlatFace.jsx";
import ThreeCube, { MOVE_ANIM } from "./components/ThreeCube.jsx";
import MoveBadge from "./components/MoveBadge.jsx";
import ScrambleBanner from "./components/ScrambleBanner.jsx";

export default function App() {
  const [cube,setCube]               = useState(initCube);
  const [history,setHistory]         = useState([]);
  const [selColor,setSelColor]       = useState("R");
  const [cycleMode,setCycleMode]     = useState(false);
  const [painting,setPainting]       = useState(false);
  const [flatLayout,setFlatLayout]   = useState("cross");
  const [tab,setTab]                 = useState("paint");

  const [phase,setPhase]             = useState("input");
  const [solution,setSolution]       = useState(null);
  const [startCube,setStartCube]     = useState(null);
  const [step,setStep]               = useState(0);
  const [animIdx,setAnimIdx]         = useState(0);
  const [cubeFlash,setCubeFlash]     = useState(false);
  const [pendingStep,setPendingStep] = useState(null);  // step queued behind an animation
  const [animTrigger,setAnimTrigger] = useState(null);  // {move,key} passed to ThreeCube
  const animKeyRef                   = useRef(0);

  const [err,setErr]                 = useState("");
  const [scrambleSeq,setScrambleSeq] = useState(null);
  const [scrambling,setScrambling]   = useState(false);
  const [algoInput,setAlgoInput]     = useState("");
  const [algoErr,setAlgoErr]         = useState("");
  const [animatingAlgo,setAnimatingAlgo] = useState(false);
  const [validationErrs,setValidationErrs] = useState([]);

  const [kStatus,setKStatus]         = useState("loading"); // loading | initializing | ready | error
  const [solveMode,setSolveMode]     = useState("optimal"); // optimal | ai

  // ── Load Kociemba solver ────────────────────────────────────────
  useEffect(()=>{
    let mounted=true;
    initKociemba(status=>{
      console.log('[App] kStatus callback:', status, '| mounted:', mounted);
      if(mounted)setKStatus(status);
    }).catch((e)=>{
      console.error('[App] initKociemba rejected:', e);
      if(mounted){setKStatus("error");setSolveMode("ai");}
    });
    return()=>{
      console.log('[App] useEffect cleanup — terminating worker, mounted→false');
      mounted=false; terminateKociemba();
    };
  },[]);

  // Track every kStatus change
  useEffect(()=>{console.log('[App] kStatus changed to:', kStatus);},[kStatus]);

  // ── Computed ───────────────────────────────────────────────────
  const highlightFace = useMemo(()=>{
    if(!solution?.steps?.[step]?.move) return null;
    return solution.steps[step].move.trim().split(/\s+/)[0]?.[0]||null;
  },[solution,step]);

  const displayCube = useMemo(()=>{
    if(!solution||!startCube) return cube;
    return replayToCube(startCube,solution.steps,step);
  },[solution,startCube,step]);

  // ── Handlers ──────────────────────────────────────────────────
  const paint=useCallback((face,idx)=>{
    setCube(prev=>{setHistory(h=>[...h.slice(-49),prev]);return{...prev,[face]:prev[face].map((c,i)=>i===idx?selColor:c)};});
  },[selColor]);

  const cycleSticker=useCallback((face,idx)=>{
    setCube(prev=>{setHistory(h=>[...h.slice(-49),prev]);const next=PAL[(PAL.indexOf(prev[face][idx])+1)%PAL.length];return{...prev,[face]:prev[face].map((c,i)=>i===idx?next:c)};});
  },[]);

  const undo=()=>{if(!history.length)return;setCube(history[history.length-1]);setHistory(h=>h.slice(0,-1));};
  const doMove=useCallback((move)=>{if(!MOVE_FN[move])return;setCube(prev=>{setHistory(h=>[...h.slice(-49),prev]);return MOVE_FN[move](prev);});},[]);

  const applyAlgo=()=>{
    const moves=algoInput.trim().split(/\s+/).filter(Boolean);
    const bad=moves.filter(m=>!MOVE_FN[m]);
    if(bad.length){setAlgoErr(`Unknown: ${bad.join(" ")}`);return;}
    setAlgoErr("");setCube(prev=>{setHistory(h=>[...h.slice(-49),prev]);let c=prev;moves.forEach(m=>{c=MOVE_FN[m](c);});return c;});
  };
  const animateAlgo=async()=>{
    const moves=algoInput.trim().split(/\s+/).filter(Boolean);
    const bad=moves.filter(m=>!MOVE_FN[m]);
    if(bad.length){setAlgoErr(`Unknown: ${bad.join(" ")}`);return;}
    setAlgoErr("");setAnimatingAlgo(true);setHistory(h=>[...h.slice(-49),cube]);
    let c=cube;
    for(const m of moves){await new Promise(r=>setTimeout(r,300));c=MOVE_FN[m](c);setCube({...c});}
    setAnimatingAlgo(false);
  };

  useEffect(()=>{const up=()=>setPainting(false);window.addEventListener("mouseup",up);return()=>window.removeEventListener("mouseup",up);},[]);
  useEffect(()=>{setValidationErrs(validateCube(cube));},[cube]);
  useEffect(()=>{if(phase!=="solution")return;setCubeFlash(true);const t=setTimeout(()=>setCubeFlash(false),350);return()=>clearTimeout(t);},[step,phase]);

  // ── Scramble ───────────────────────────────────────────────────
  const handleScramble=async()=>{
    setScrambling(true);setErr("");setScrambleSeq(null);setHistory([]);
    const {seq}=generateScramble(20);
    let cur=initCube();setCube({...cur});
    for(const m of seq){await new Promise(r=>setTimeout(r,65));cur=MOVE_FN[m](cur);setCube({...cur});}
    setScrambleSeq(seq);setScrambling(false);
  };

  // ── Solve: Kociemba optimal ────────────────────────────────────
  const handleSolveKociemba=async()=>{
    console.log('[App] handleSolveKociemba START');
    setPhase("solving");setErr("");
    try {
      console.log('[App] raw cube →', JSON.stringify(cube));
      const facelets=cubeToKociemba(cube);
      console.log('[App] spawning solve worker...');
      const solutionStr=await new Promise((resolve,reject)=>{
        const worker=new Worker(new URL('./engine/solve.worker.js',import.meta.url),{type:'module'});
        console.log('[App] worker object created:', worker);
        worker.onmessage=({data})=>{
          console.log('[App] worker message received:', data);
          worker.terminate();
          if(data.type==='solution') resolve(data.moves);
          else reject(new Error(data.message||'Worker error'));
        };
        worker.onmessageerror=e=>{
          console.error('[App] worker message error (deserialization?):', e);
          worker.terminate();reject(new Error('Worker message error'));
        };
        worker.onerror=e=>{
          console.error('[App] worker onerror:', e.message, e.filename, e.lineno, e);
          worker.terminate();reject(e);
        };
        console.log('[App] posting solve message, facelets length:', facelets.length);
        worker.postMessage({type:'solve',facelets});
      });
      console.log('[App] solve worker resolved, solutionStr:', solutionStr);
      const moves=solutionStr?solutionStr.trim().split(/\s+/).filter(Boolean):[];

      if(moves.length===0){
        setSolution({totalMoves:0,steps:[{n:1,stage:"Solved!",move:"",explain:"Your cube is already solved!",tip:""}]});
        setStartCube(copyCube(cube));setStep(0);setAnimIdx(0);setPhase("solution");
        return;
      }

      const chunkSize=5;
      const steps=[];
      for(let i=0;i<moves.length;i+=chunkSize){
        const chunk=moves.slice(i,i+chunkSize);
        steps.push({
          n:steps.length+1,
          stage:`Moves ${i+1}–${Math.min(i+chunkSize,moves.length)}`,
          move:chunk.join(" "),
          explain:chunk.map(m=>MOVE_DESC[m]||m).join(", then "),
          tip:i===0?"Kociemba optimal solution — typically 20 moves or fewer.":"",
        });
      }

      setSolution({totalMoves:moves.length,steps});
      setStartCube(copyCube(cube));
      setStep(0);setAnimIdx(0);setPhase("solution");
    } catch(e) {
      setErr("Kociemba error — cube state may be invalid. Try re-entering colors.");
      setPhase("input");
    }
  };

  // ── Solve: AI beginner ─────────────────────────────────────────
  const solveAI=async()=>{
    setPhase("solving");setErr("");
    try {
      const state=Object.entries(cube).map(([f,s])=>`${FLABEL[f]} (${f}): ${s.join(" ")}`).join("\n");
      const prompt=`You are a Rubik's cube expert. Solve this cube using the beginner layer-by-layer method.

CUBE STATE (9 stickers per face, left→right top→bottom):
${state}

Colors: W=White Y=Yellow B=Blue(front) G=Green(back) R=Red(right) O=Orange(left)
Orientation: Y=Top(U) W=Bottom(D) B=Front(F) G=Back(B) R=Right(R) O=Left(L)

Stages: 1.White Cross 2.White Corners 3.Middle Layer 4.Yellow Cross 5.Orient Yellow Corners 6.Position Last Layer Corners 7.Cycle Last Layer Edges

Return ONLY valid JSON, no markdown or backticks:
{"totalMoves":<int>,"steps":[{"n":1,"stage":"<name>","move":"<e.g. R U R' U'>","explain":"<plain English>","tip":"<beginner tip or empty>"}]}

If already solved: {"totalMoves":0,"steps":[{"n":1,"stage":"Solved!","move":"","explain":"Your cube is already solved!","tip":""}]}`;

      const res=await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:1000,messages:[{role:"user",content:prompt}]})});
      const data=await res.json();
      const raw=data.content.filter(b=>b.type==="text").map(b=>b.text).join("");
      const parsed=JSON.parse(raw.replace(/```json|```/g,"").trim());
      setSolution(parsed);setStartCube(copyCube(cube));setStep(0);setAnimIdx(0);setPhase("solution");
    } catch(e) {
      setErr("Couldn't parse solution — verify all 54 stickers are correctly set.");setPhase("input");
    }
  };

  const solve=()=>{
    console.log('[App] SOLVE clicked — solveMode:', solveMode, '| kStatus:', kStatus, '| canSolve:', canSolve);
    solveMode==="optimal"&&kStatus==="ready" ? handleSolveKociemba() : solveAI();
  };

  const goStep=n=>{
    // Forward by exactly one step: animate the move then snap
    if(n===step+1 && solution){
      const rawMove=solution.steps[step]?.move?.trim()??"";
      const tokens=rawMove.split(/\s+/).filter(Boolean);
      // Only animate single-move steps (Kociemba produces 1-move chunks when chunkSize=1;
      // multi-move chunks fall through to instant snap)
      if(tokens.length===1 && MOVE_ANIM[tokens[0]]){
        animKeyRef.current+=1;
        setAnimTrigger({move:tokens[0],key:animKeyRef.current});
        setPendingStep(n);
        return;
      }
    }
    // All other navigation: instant snap
    setStep(n);
    setAnimIdx(a=>a+1);
  };

  const handleAnimDone=()=>{
    if(pendingStep!==null){
      setStep(pendingStep);
      setAnimIdx(a=>a+1);
      setPendingStep(null);
    }
    setAnimTrigger(null);
  };

  const reset=()=>{setCube(initCube());setSolution(null);setStartCube(null);setPhase("input");setStep(0);setErr("");setScrambleSeq(null);setHistory([]);setAlgoInput("");setAlgoErr("");setPendingStep(null);setAnimTrigger(null);};

  const cur=solution?.steps?.[step];
  const total=solution?.steps?.length||0;
  const pct=total?Math.round(((step+1)/total)*100):0;
  const STAGE_C={"White Cross":"#eee","White Corners":"#aaa","Middle Layer":"#FFD600","Yellow Cross":"#FFD600","Orient Yellow Corners":"#FF6D00","Position Last Layer Corners":"#C62828","Cycle Last Layer Edges":"#2E7D32","Solved!":"#2E7D32"};
  const sc=STAGE_C[cur?.stage]||"#FF6D00";
  const busy=scrambling||animatingAlgo;
  const canSolve=!busy&&validationErrs.length===0;

  const tabBtn=(label,key)=><button onClick={()=>setTab(key)} style={{flex:1,padding:"9px 0",border:"none",cursor:"pointer",fontFamily:"'Courier New',monospace",fontSize:9,letterSpacing:3,background:tab===key?"#FFD600":"transparent",color:tab===key?"#000":"#444",borderRadius:tab===key?6:0,fontWeight:tab===key?900:400,transition:"all .2s"}}>{label}</button>;

  const kBadge=()=>{
    const cfg={
      loading:  {col:"#444",   txt:"⟳ LOADING SOLVER..."},
      initializing:{col:"#FF6D00",txt:"⟳ INITIALIZING KOCIEMBA..."},
      ready:    {col:"#2E7D32",txt:"✓ KOCIEMBA READY (≤22 MOVES)"},
      error:    {col:"#C62828",txt:"⚠ KOCIEMBA UNAVAILABLE"},
    }[kStatus]||{col:"#444",txt:""};
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
      {phase==="input" && (
        <div style={{width:"100%",maxWidth:530}}>
          {kBadge()}

          {/* Solve mode toggle */}
          <div style={{display:"flex",background:"#0d0d18",border:"1px solid #1a1a2e",borderRadius:8,marginBottom:14,padding:3,gap:3}}>
            {[["⚡ OPTIMAL (KOCIEMBA)","optimal"],["📖 BEGINNER (AI)","ai"]].map(([label,key])=>(
              <button key={key} onClick={()=>setSolveMode(key)} style={{flex:1,padding:"8px 0",border:"none",cursor:"pointer",fontFamily:"'Courier New',monospace",fontSize:8,letterSpacing:2,background:solveMode===key?"#FFD600":"transparent",color:solveMode===key?"#000":"#444",borderRadius:solveMode===key?6:0,fontWeight:solveMode===key?900:400,transition:"all .2s"}}>{label}</button>
            ))}
          </div>

          {solveMode==="optimal" && kStatus!=="ready" && (
            <div style={{fontSize:8,color:"#FF6D00",textAlign:"center",marginBottom:12,letterSpacing:1,padding:"8px",background:"#FF6D0010",border:"1px solid #FF6D0033",borderRadius:8}}>
              {kStatus==="error" ? "Kociemba failed to load — switch to Beginner mode or retry by refreshing." : "Please wait for Kociemba to finish initializing before solving."}
            </div>
          )}
          {solveMode==="optimal" && kStatus==="ready" && (
            <div style={{fontSize:8,color:"#2E7D32",textAlign:"center",marginBottom:12,letterSpacing:1,padding:"8px",background:"#2E7D3210",border:"1px solid #2E7D3233",borderRadius:8}}>
              Kociemba guarantees ≤22 moves for any valid state.
            </div>
          )}
          {solveMode==="ai" && (
            <div style={{fontSize:8,color:"#888",textAlign:"center",marginBottom:12,letterSpacing:1,padding:"8px",background:"#ffffff08",border:"1px solid #1a1a2e",borderRadius:8}}>
              AI beginner method — step-by-step with explanations (60–80 moves typical).
            </div>
          )}

          {/* Tabs */}
          <div style={{display:"flex",background:"#0d0d18",borderRadius:8,border:"1px solid #1a1a2e",marginBottom:16,padding:4,gap:4}}>
            {tabBtn("✏  PAINT","paint")}
            {tabBtn("⬡  3D + MOVES","3d")}
          </div>

          {/* ── PAINT TAB ── */}
          {tab==="paint" && (
            <div>
              <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:12,flexWrap:"wrap"}}>
                <div style={{display:"flex",background:"#0d0d18",border:"1px solid #1a1a2e",borderRadius:6,padding:3,gap:3}}>
                  {[["✛","cross"],["▦","grid"]].map(([icon,key])=>(
                    <button key={key} onClick={()=>setFlatLayout(key)} style={{width:30,height:26,border:"none",cursor:"pointer",fontSize:13,background:flatLayout===key?"#FFD600":"transparent",color:flatLayout===key?"#000":"#444",borderRadius:4,transition:"all .2s"}}>{icon}</button>
                  ))}
                </div>
                <button onClick={()=>setCycleMode(p=>!p)} style={{padding:"5px 10px",border:`1px solid ${cycleMode?"#FFD600":"#1a1a2e"}`,cursor:"pointer",fontFamily:"'Courier New',monospace",fontSize:8,letterSpacing:2,background:cycleMode?"#FFD60018":"transparent",color:cycleMode?"#FFD600":"#555",borderRadius:6}}>↻ CYCLE</button>
                <button onClick={undo} disabled={!history.length} style={{padding:"5px 10px",border:"1px solid #1a1a2e",cursor:history.length?"pointer":"default",fontFamily:"'Courier New',monospace",fontSize:8,letterSpacing:2,background:"transparent",color:history.length?"#888":"#2a2a2a",borderRadius:6,marginLeft:"auto"}}>↩ UNDO{history.length>0?` (${history.length})`:""}</button>
              </div>

              {!cycleMode ? (
                <div style={{marginBottom:14}}>
                  <div style={{display:"flex",gap:10,justifyContent:"center",background:"#0d0d18",padding:"8px 16px",borderRadius:40,border:"1px solid #1a1a2e"}}>
                    {PAL.map(col=><div key={col} onClick={()=>setSelColor(col)} title={NAMES[col]} style={{width:38,height:38,borderRadius:"50%",background:C[col],cursor:"pointer",border:selColor===col?"3px solid #fff":"3px solid transparent",transform:selColor===col?"scale(1.3)":"scale(1)",boxShadow:selColor===col?`0 0 16px ${C[col]}cc`:"none",transition:"all .15s"}}/>)}
                  </div>
                  <div style={{textAlign:"center",fontSize:9,color:C[selColor],letterSpacing:3,marginTop:6,fontWeight:900}}>PAINTING: {NAMES[selColor].toUpperCase()}</div>
                </div>
              ) : (
                <div style={{textAlign:"center",fontSize:9,color:"#FFD600",letterSpacing:2,marginBottom:14,padding:"8px",background:"#FFD60010",border:"1px solid #FFD60033",borderRadius:8}}>CYCLE MODE — CLICK ANY STICKER TO STEP THROUGH COLORS</div>
              )}

              {flatLayout==="cross" && (
                <div onMouseDown={()=>setPainting(true)} style={{display:"grid",gridTemplateColumns:"repeat(4,auto)",gridTemplateRows:"repeat(3,auto)",gridTemplateAreas:`". U . ." "L F R B" ". D . ."`,gap:6,justifyContent:"center"}}>
                  {["U","L","F","R","B","D"].map(fk=><div key={fk} style={{gridArea:fk}}><FlatFace faceKey={fk} stickers={cube[fk]} onPaint={paint} onCycle={cycleSticker} painting={painting} cycleMode={cycleMode}/></div>)}
                </div>
              )}
              {flatLayout==="grid" && (
                <div onMouseDown={()=>setPainting(true)} style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,maxWidth:330,margin:"0 auto"}}>
                  {["U","R","F","B","D","L"].map(fk=><div key={fk}><FlatFace faceKey={fk} stickers={cube[fk]} onPaint={paint} onCycle={cycleSticker} painting={painting} cycleMode={cycleMode}/></div>)}
                </div>
              )}

              {/* Algo input */}
              <div style={{marginTop:18,background:"#08080f",border:"1px solid #1a1a2e",borderRadius:10,padding:14}}>
                <div style={{fontSize:7,color:"#555",letterSpacing:3,marginBottom:8}}>⌨  ALGORITHM INPUT</div>
                <div style={{display:"flex",gap:6,marginBottom:6}}>
                  <input value={algoInput} onChange={e=>setAlgoInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&applyAlgo()} placeholder="e.g.  R U R' U' R U2 R'" style={{flex:1,padding:"8px 12px",fontSize:"0.82rem",letterSpacing:1}}/>
                  <button onClick={applyAlgo} disabled={!algoInput||busy} style={{padding:"8px 14px",background:"#1a1a2e",border:"1px solid #2a2a4e",borderRadius:6,color:algoInput&&!busy?"#FFD600":"#333",fontFamily:"'Courier New',monospace",fontSize:8,letterSpacing:2,cursor:"pointer"}}>APPLY</button>
                  <button onClick={animateAlgo} disabled={!algoInput||busy} style={{padding:"8px 14px",background:"#1a1a2e",border:"1px solid #2a2a4e",borderRadius:6,color:algoInput&&!busy?"#2E7D32":"#333",fontFamily:"'Courier New',monospace",fontSize:11,cursor:"pointer"}}>▶</button>
                </div>
                {algoErr&&<div style={{color:"#ff5555",fontSize:9,marginBottom:6}}>⚠ {algoErr}</div>}
                <div style={{fontSize:7,color:"#2a2a2a",letterSpacing:1,lineHeight:2}}>{ALL_MOVES.join("  ")}</div>
              </div>

              {/* Validation */}
              {validationErrs.length>0 ? (
                <div style={{marginTop:12,background:"#180808",border:"1px solid #3a1a1a",borderRadius:10,padding:14}}>
                  <div style={{fontSize:7,color:"#ff5555",letterSpacing:3,marginBottom:8}}>⚠  VALIDATION ERRORS</div>
                  {validationErrs.map((e,i)=><div key={i} style={{fontSize:9,color:"#ff7777",marginBottom:5,letterSpacing:1}}>• {e}</div>)}
                </div>
              ) : (
                <div style={{marginTop:12,background:"#081408",border:"1px solid #0d260d",borderRadius:10,padding:10,textAlign:"center"}}>
                  <div style={{fontSize:8,color:"#2E7D32",letterSpacing:3}}>✓ VALID — READY TO SOLVE</div>
                </div>
              )}
            </div>
          )}

          {/* ── 3D TAB ── */}
          {tab==="3d" && (
            <div style={{display:"flex",flexDirection:"column",alignItems:"center"}}>
              <div style={{fontSize:9,color:"#444",letterSpacing:3,marginBottom:12}}>DRAG TO ROTATE</div>
              <div style={{marginBottom:24}}>
                <ThreeCube cube={cube} width={360} height={360}/>
              </div>
              <div style={{width:"100%",background:"#08080f",border:"1px solid #1a1a2e",borderRadius:10,padding:14}}>
                <div style={{fontSize:7,color:"#555",letterSpacing:3,marginBottom:12,textAlign:"center"}}>INTERACTIVE FACE ROTATIONS</div>
                <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8}}>
                  {[["U","#FFD600"],["R","#C62828"],["F","#1565C0"],["D","#ccc"],["L","#E65100"],["B","#2E7D32"]].map(([face,col])=>(
                    <div key={face} style={{background:"#0d0d18",border:`1px solid ${col}22`,borderRadius:8,padding:"8px 4px"}}>
                      <div style={{fontSize:8,color:col,letterSpacing:3,marginBottom:7,textAlign:"center",fontWeight:900}}>{FLABEL[face]}</div>
                      <div style={{display:"flex",gap:3,justifyContent:"center"}}>
                        {[face,face+"'",face+"2"].map(m=><button key={m} onClick={()=>doMove(m)} style={{flex:1,background:"#1a1a2e",border:`1px solid ${col}33`,borderRadius:4,padding:"6px 2px",cursor:"pointer",fontFamily:"'Courier New',monospace",fontWeight:900,fontSize:"0.72rem",color:col,minWidth:0}}>{m}</button>)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {scrambleSeq&&<div style={{marginTop:14}}><ScrambleBanner seq={scrambleSeq}/></div>}
          {err&&<div style={{color:"#ff5555",fontSize:11,textAlign:"center",marginTop:14}}>⚠ {err}</div>}

          <div style={{display:"flex",gap:8,marginTop:20,justifyContent:"center",flexWrap:"wrap"}}>
            <button onClick={handleScramble} disabled={busy} style={{background:busy?"#0d0d18":"linear-gradient(135deg,#1565C0,#2E7D32)",border:busy?"1px solid #1a1a2e":"none",borderRadius:8,padding:"14px 20px",color:busy?"#444":"#fff",fontFamily:"'Courier New',monospace",fontWeight:900,fontSize:"0.85rem",letterSpacing:3,cursor:busy?"default":"pointer",animation:scrambling?"flash .5s ease infinite":"none"}}>
              {scrambling?"⟳ SCRAMBLING...":"🎲 SCRAMBLE"}
            </button>
            <button onClick={solve} disabled={!canSolve||(solveMode==="optimal"&&kStatus!=="ready")} style={{background:(!canSolve||(solveMode==="optimal"&&kStatus!=="ready"))?"#0d0d18":"linear-gradient(135deg,#E65100,#FFD600)",border:(!canSolve||(solveMode==="optimal"&&kStatus!=="ready"))?"1px solid #1a1a2e":"none",borderRadius:8,padding:"14px 34px",color:(!canSolve||(solveMode==="optimal"&&kStatus!=="ready"))?"#333":"#000",fontFamily:"'Courier New',monospace",fontWeight:900,fontSize:"1rem",letterSpacing:4,cursor:"pointer",transition:"all .2s"}}>▶ SOLVE</button>
            <button onClick={reset} disabled={busy} style={{background:"transparent",border:"1px solid #1a1a2e",borderRadius:8,padding:"14px 18px",color:"#444",fontFamily:"'Courier New',monospace",fontSize:9,letterSpacing:3,cursor:"pointer"}}>RESET</button>
          </div>
          <div style={{display:"flex",gap:6,marginTop:10,justifyContent:"center",flexWrap:"wrap"}}>
            {['U','D','F','B','R','L'].map(m=>(
              <button key={m} onClick={()=>{
                const after=MOVE_FN[m](initCube());
                console.log(`[debug] ${m} move on solved cube → facelets: ${cubeToKociemba(after)}`);
              }} style={{background:"#0d0d18",border:"1px solid #333",borderRadius:6,padding:"6px 10px",color:"#aaa",fontFamily:"'Courier New',monospace",fontSize:10,cursor:"pointer"}}>
                dbg {m}
              </button>
            ))}
            <button onClick={()=>{
              const seq=["D","R","L","D","R2","B","L2","D"];
              let c=initCube();
              for(const m of seq){
                c=MOVE_FN[m](c);
                const facelets=cubeToKociemba(c);
                const kc=KociembaCube.fromString(facelets);
                console.log(`[debug] after ${m}: ep=[${kc.ep.join(',')}]`);
              }
            }} style={{background:"#0d0d18",border:"1px solid #C62828",borderRadius:6,padding:"6px 10px",color:"#C62828",fontFamily:"'Courier New',monospace",fontSize:10,cursor:"pointer"}}>
              dbg seq
            </button>
          </div>
        </div>
      )}

      {/* ══════════════ SOLVING ══════════════ */}
      {phase==="solving" && (
        <div style={{textAlign:"center",padding:"80px 0"}}>
          <div style={{width:60,height:60,margin:"0 auto 20px",borderRadius:"50%",border:"3px solid #1a1a2e",borderTop:"3px solid #FFD600",borderRight:"3px solid #E65100",animation:"spin .8s linear infinite"}}/>
          <div style={{fontSize:10,letterSpacing:6,color:"#444",animation:"pulse 1.4s ease infinite"}}>{solveMode==="optimal"?"RUNNING KOCIEMBA...":"CALCULATING SOLUTION..."}</div>
        </div>
      )}

      {/* ══════════════ SOLUTION ══════════════ */}
      {phase==="solution" && solution && cur && (
        <div style={{width:"100%",maxWidth:520,animation:"up .4s ease"}}>

          {/* Live 3D cube */}
          <div style={{display:"flex",flexDirection:"column",alignItems:"center",marginBottom:20,background:"#08080f",border:"1px solid #1a1a2e",borderRadius:14,padding:"20px 20px 16px",animation:cubeFlash?"glow .35s ease":"none"}}>
            <div style={{fontSize:7,color:"#444",letterSpacing:4,marginBottom:14}}>
              LIVE CUBE — AFTER STEP {step+1}
              {highlightFace&&<span style={{color:FACE_COLOR[highlightFace]||"#FFD600",marginLeft:8}}>[ {FLABEL[highlightFace]} FACE ]</span>}
            </div>
            <ThreeCube cube={displayCube} width={320} height={320} animTrigger={animTrigger} onAnimationDone={handleAnimDone}/>
            <div style={{display:"flex",gap:4,marginTop:12,flexWrap:"wrap",justifyContent:"center",maxWidth:400}}>
              {solution.steps.map((_,i)=><div key={i} onClick={()=>goStep(i)} style={{height:5,width:i===step?18:5,borderRadius:3,cursor:"pointer",background:i===step?"#FFD600":i<step?"#E65100":"#1a1a2e",transition:"all .2s"}}/>)}
            </div>
          </div>

          {/* Stats */}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",background:"#0d0d18",border:"1px solid #1a1a2e",borderRadius:8,marginBottom:14,overflow:"hidden"}}>
            {[["TOTAL MOVES",solution.totalMoves,"#FFD600"],["STEP",`${step+1} / ${total}`,"#fff"],["PROGRESS",`${pct}%`,"#2E7D32"]].map(([l,v,col])=>(
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
          <div key={animIdx} style={{background:"#0d0d18",border:"1px solid #1a1a2e",borderRadius:14,padding:24,marginBottom:16,animation:"up .35s ease"}}>
            <div style={{display:"inline-block",marginBottom:16,padding:"4px 16px",borderRadius:20,background:sc+"18",border:`1px solid ${sc}33`,fontSize:8,letterSpacing:3,color:sc}}>{cur.stage.toUpperCase()}</div>
            <MoveBadge move={cur.move} idx={animIdx}/>
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
            {[["⏮",()=>goStep(0),step===0||pendingStep!==null,false],["← BACK",()=>goStep(Math.max(0,step-1)),step===0||pendingStep!==null,false],["NEXT →",()=>goStep(Math.min(total-1,step+1)),step===total-1||pendingStep!==null,true],["⏭",()=>goStep(total-1),step===total-1||pendingStep!==null,false]].map(([label,fn,dis,hi])=>(
              <button key={label} onClick={fn} disabled={dis} style={{background:hi&&!dis?"linear-gradient(135deg,#E65100,#FFD600)":"transparent",border:hi&&!dis?"none":"1px solid #1a1a2e",borderRadius:6,padding:"11px 18px",cursor:dis?"default":"pointer",color:hi&&!dis?"#000":dis?"#2a2a2a":"#888",fontFamily:"'Courier New',monospace",fontWeight:hi?"900":"400",fontSize:"0.8rem",letterSpacing:2}}>{label}</button>
            ))}
          </div>

          {/* All moves */}
          <details style={{marginBottom:18}}>
            <summary style={{cursor:"pointer",fontSize:9,color:"#444",letterSpacing:3,padding:"10px 14px",background:"#0d0d18",border:"1px solid #1a1a2e",borderRadius:8,listStyle:"none"}}>▸ VIEW ALL {solution.totalMoves} MOVES</summary>
            <div style={{background:"#08080f",border:"1px solid #1a1a2e",borderTop:"none",borderRadius:"0 0 8px 8px",maxHeight:200,overflowY:"auto",padding:6}}>
              {solution.steps.map((s,i)=>(
                <div key={i} onClick={()=>goStep(i)} style={{display:"flex",alignItems:"center",gap:12,padding:"7px 10px",borderRadius:5,cursor:"pointer",marginBottom:2,background:i===step?"#1a1a2e":"transparent",borderLeft:`2px solid ${i===step?"#FFD600":"transparent"}`}}>
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
