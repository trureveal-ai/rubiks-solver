import { useState, useRef, useEffect, useCallback, useMemo } from "react";

const C = { W:"#EFEFEF", Y:"#FFD600", B:"#1565C0", G:"#2E7D32", R:"#C62828", O:"#E65100" };
const NAMES = { W:"White", Y:"Yellow", B:"Blue", G:"Green", R:"Red", O:"Orange" };
const PAL = ["W","Y","R","O","B","G"];
const FLABEL = { U:"TOP", D:"BOTTOM", F:"FRONT", B:"BACK", R:"RIGHT", L:"LEFT" };
const FACE_COLOR = { U:"#FFD600", D:"#EFEFEF", F:"#1565C0", B:"#2E7D32", R:"#C62828", L:"#E65100" };
const T3D = {
  F:"rotateY(0deg) translateZ(80px)",   B:"rotateY(180deg) translateZ(80px)",
  R:"rotateY(90deg) translateZ(80px)",  L:"rotateY(-90deg) translateZ(80px)",
  U:"rotateX(90deg) translateZ(80px)",  D:"rotateX(-90deg) translateZ(80px)",
};
const MOVE_DESC = {
  "U":"Top CW","U'":"Top CCW","U2":"Top 180°",
  "D":"Bot CW","D'":"Bot CCW","D2":"Bot 180°",
  "F":"Front CW","F'":"Front CCW","F2":"Front 180°",
  "B":"Back CW","B'":"Back CCW","B2":"Back 180°",
  "R":"Right CW","R'":"Right CCW","R2":"Right 180°",
  "L":"Left CW","L'":"Left CCW","L2":"Left 180°",
};

// ── Cube engine ──────────────────────────────────────────────────
function initCube() {
  return { U:Array(9).fill("Y"), D:Array(9).fill("W"), F:Array(9).fill("B"), B:Array(9).fill("G"), R:Array(9).fill("R"), L:Array(9).fill("O") };
}
function dc(c) { return { U:[...c.U], D:[...c.D], F:[...c.F], B:[...c.B], R:[...c.R], L:[...c.L] }; }
function rcw(f) { return [f[6],f[3],f[0],f[7],f[4],f[1],f[8],f[5],f[2]]; }

function applyU(cube) {
  const c=dc(cube); c.U=rcw(cube.U);
  [0,1,2].forEach(i=>{c.F[i]=cube.L[i];c.R[i]=cube.F[i];c.B[i]=cube.R[i];c.L[i]=cube.B[i];});
  return c;
}
function applyD(cube) {
  const c=dc(cube); c.D=rcw(cube.D);
  [6,7,8].forEach(i=>{c.F[i]=cube.R[i];c.L[i]=cube.F[i];c.B[i]=cube.L[i];c.R[i]=cube.B[i];});
  return c;
}
function applyF(cube) {
  const c=dc(cube); c.F=rcw(cube.F);
  c.U[6]=cube.L[8];c.U[7]=cube.L[5];c.U[8]=cube.L[2];
  c.R[0]=cube.U[6];c.R[3]=cube.U[7];c.R[6]=cube.U[8];
  c.D[0]=cube.R[6];c.D[1]=cube.R[3];c.D[2]=cube.R[0];
  c.L[2]=cube.D[0];c.L[5]=cube.D[1];c.L[8]=cube.D[2];
  return c;
}
function applyB(cube) {
  const c=dc(cube); c.B=rcw(cube.B);
  c.U[0]=cube.R[2];c.U[1]=cube.R[5];c.U[2]=cube.R[8];
  c.L[0]=cube.U[2];c.L[3]=cube.U[1];c.L[6]=cube.U[0];
  c.D[6]=cube.L[0];c.D[7]=cube.L[3];c.D[8]=cube.L[6];
  c.R[2]=cube.D[8];c.R[5]=cube.D[7];c.R[8]=cube.D[6];
  return c;
}
function applyR(cube) {
  const c=dc(cube); c.R=rcw(cube.R);
  c.F[2]=cube.U[2];c.F[5]=cube.U[5];c.F[8]=cube.U[8];
  c.D[2]=cube.F[2];c.D[5]=cube.F[5];c.D[8]=cube.F[8];
  c.B[0]=cube.D[8];c.B[3]=cube.D[5];c.B[6]=cube.D[2];
  c.U[2]=cube.B[6];c.U[5]=cube.B[3];c.U[8]=cube.B[0];
  return c;
}
function applyL(cube) {
  const c=dc(cube); c.L=rcw(cube.L);
  c.F[0]=cube.U[0];c.F[3]=cube.U[3];c.F[6]=cube.U[6];
  c.D[0]=cube.F[0];c.D[3]=cube.F[3];c.D[6]=cube.F[6];
  c.B[2]=cube.D[6];c.B[5]=cube.D[3];c.B[8]=cube.D[0];
  c.U[0]=cube.B[8];c.U[3]=cube.B[5];c.U[6]=cube.B[2];
  return c;
}
const MOVE_FN = {
  'U':c=>applyU(c),       "U'":c=>applyU(applyU(applyU(c))),  'U2':c=>applyU(applyU(c)),
  'D':c=>applyD(c),       "D'":c=>applyD(applyD(applyD(c))),  'D2':c=>applyD(applyD(c)),
  'F':c=>applyF(c),       "F'":c=>applyF(applyF(applyF(c))),  'F2':c=>applyF(applyF(c)),
  'B':c=>applyB(c),       "B'":c=>applyB(applyB(applyB(c))),  'B2':c=>applyB(applyB(c)),
  'R':c=>applyR(c),       "R'":c=>applyR(applyR(applyR(c))),  'R2':c=>applyR(applyR(c)),
  'L':c=>applyL(c),       "L'":c=>applyL(applyL(applyL(c))),  'L2':c=>applyL(applyL(c)),
};
const ALL_MOVES = Object.keys(MOVE_FN);

function generateScramble(n=20) {
  let cube=initCube(); const seq=[]; let last='';
  for(let i=0;i<n;i++){
    let m; do{m=ALL_MOVES[Math.floor(Math.random()*ALL_MOVES.length)];}while(m[0]===last);
    last=m[0]; seq.push(m); cube=MOVE_FN[m](cube);
  }
  return {cube,seq};
}

function applyMoveString(cube, moveStr) {
  if(!moveStr?.trim()) return cube;
  let c=cube; moveStr.trim().split(/\s+/).forEach(m=>{if(MOVE_FN[m])c=MOVE_FN[m](c);}); return c;
}
function replayToCube(startCube, steps, stepIndex) {
  let c=startCube;
  for(let i=0;i<=stepIndex;i++) if(steps[i]?.move) c=applyMoveString(c,steps[i].move);
  return c;
}

// ── Kociemba facelet string ──────────────────────────────────────
function cubeToKociemba(cube) {
  const map={Y:'U',R:'R',B:'F',W:'D',O:'L',G:'B'};
  return ['U','R','F','D','L','B'].flatMap(f=>cube[f]).map(c=>map[c]).join('');
}

// ── Validation ───────────────────────────────────────────────────
function validateCube(cube) {
  const errors=[];
  const counts={}; PAL.forEach(p=>counts[p]=0);
  Object.values(cube).flat().forEach(s=>{if(counts[s]!==undefined)counts[s]++;});
  PAL.forEach(col=>{if(counts[col]!==9)errors.push(`${NAMES[col]}: ${counts[col]}/9 stickers`);});
  const centers=Object.values(cube).map(f=>f[4]);
  if(new Set(centers).size<6) errors.push("Two faces share the same center color");
  const EDGE_PAIRS=[[['U',7],['F',1]],[['U',5],['R',1]],[['U',1],['B',1]],[['U',3],['L',1]],[['D',1],['F',7]],[['D',5],['R',7]],[['D',7],['B',7]],[['D',3],['L',7]],[['F',5],['R',3]],[['F',3],['L',5]],[['B',3],['R',5]],[['B',5],['L',3]]];
  EDGE_PAIRS.forEach(([[f1,i1],[f2,i2]])=>{if(cube[f1][i1]===cube[f2][i2])errors.push(`Illegal edge: ${f1}+${f2}`);});
  return errors;
}

// ── UI Components ────────────────────────────────────────────────
function Cell({color,size=36,onClick,onCycle,painting,cycleMode}) {
  const [hover,setHover]=useState(false);
  return <div onClick={cycleMode?onCycle:onClick} onMouseEnter={()=>{setHover(true);if(painting&&!cycleMode)onClick?.();}} onMouseLeave={()=>setHover(false)} style={{width:size,height:size,background:C[color]||"#1a1a1a",borderRadius:5,border:"2.5px solid rgba(0,0,0,0.5)",cursor:"pointer",transition:"transform .1s,box-shadow .1s",transform:hover?"scale(0.85)":"scale(1)",boxShadow:hover?`0 0 10px ${C[color]}99,inset 0 0 6px rgba(255,255,255,0.15)`:"inset 0 0 4px rgba(0,0,0,0.3)"}}/>;
}
function FlatFace({faceKey,stickers,onPaint,onCycle,painting,cycleMode}) {
  return <div><div style={{fontSize:7,color:FACE_COLOR[faceKey],textAlign:"center",marginBottom:3,letterSpacing:2,fontFamily:"monospace",fontWeight:900,opacity:.8}}>{FLABEL[faceKey]}</div><div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:3,padding:5,borderRadius:7,background:"#0d0d0d",border:`2px solid ${FACE_COLOR[faceKey]}33`}}>{stickers.map((col,i)=><Cell key={i} color={col} size={36} painting={painting} cycleMode={cycleMode} onClick={()=>onPaint(faceKey,i)} onCycle={()=>onCycle(faceKey,i)}/>)}</div></div>;
}
function Cube3D({cube,rotX,rotY,highlight}) {
  return <div style={{perspective:600}}><div style={{width:160,height:160,transformStyle:"preserve-3d",transform:`rotateX(${rotX}deg) rotateY(${rotY}deg)`,transition:"transform .08s linear",position:"relative"}}>{Object.entries(cube).map(([fk,stickers])=><div key={fk} style={{position:"absolute",width:160,height:160,transform:T3D[fk],display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:3,padding:6,background:"#111",border:`2px solid ${highlight===fk?"#FFD600":"#222"}`,backfaceVisibility:"visible",transition:"border-color .3s"}}>{stickers.map((col,i)=><div key={i} style={{background:C[col]||"#1a1a1a",borderRadius:4,border:"2px solid rgba(0,0,0,0.4)",boxShadow:"inset 0 0 4px rgba(0,0,0,0.3)",transition:"background .25s"}}/>)}</div>)}</div></div>;
}
function MoveBadge({move,idx}) {
  const [show,setShow]=useState(false);
  useEffect(()=>{setShow(false);const t=setTimeout(()=>setShow(true),40);return()=>clearTimeout(t);},[idx]);
  if(!move) return null;
  return <div style={{display:"flex",gap:8,flexWrap:"wrap",justifyContent:"center",marginBottom:12}}>{move.trim().split(/\s+/).map((m,i)=><div key={i} style={{background:"#0d0d18",border:`2px solid ${i===0?"#FFD600":"#222"}`,borderRadius:8,padding:"8px 18px",fontFamily:"'Courier New',monospace",fontWeight:900,fontSize:"1.6rem",color:"#FFD600",letterSpacing:4,opacity:show?1:0,transform:show?"translateY(0) scale(1)":"translateY(14px) scale(0.85)",transition:`all .4s cubic-bezier(.34,1.56,.64,1) ${i*70}ms`,boxShadow:"0 4px 24px rgba(255,214,0,.12)"}}>{m}</div>)}</div>;
}
function ScrambleBanner({seq}) {
  if(!seq?.length) return null;
  return <div style={{background:"#08080f",border:"1px solid #1a1a2e",borderRadius:10,padding:"12px 16px",marginBottom:14}}><div style={{fontSize:7,color:"#444",letterSpacing:3,marginBottom:8,textAlign:"center"}}>🎲 SCRAMBLE ({seq.length} MOVES)</div><div style={{display:"flex",flexWrap:"wrap",gap:4,justifyContent:"center"}}>{seq.map((m,i)=><span key={i} style={{fontFamily:"'Courier New',monospace",fontWeight:900,fontSize:"0.78rem",color:m.includes("'")?"#FF6D00":m.includes("2")?"#aaa":"#FFD600",background:"#0d0d18",border:"1px solid #1a1a2e",borderRadius:4,padding:"2px 7px"}}>{m}</span>)}</div></div>;
}

// ── Main App ──────────────────────────────────────────────────────
export default function App() {
  const [cube,setCube]               = useState(initCube);
  const [history,setHistory]         = useState([]);
  const [selColor,setSelColor]       = useState("R");
  const [cycleMode,setCycleMode]     = useState(false);
  const [painting,setPainting]       = useState(false);
  const [flatLayout,setFlatLayout]   = useState("cross");
  const [tab,setTab]                 = useState("paint");
  const [rotX,setRotX]               = useState(-28);
  const [rotY,setRotY]               = useState(-38);
  const dragRef                      = useRef(null);
  const kociembaRef                  = useRef(null);

  const [phase,setPhase]             = useState("input");
  const [solution,setSolution]       = useState(null);
  const [startCube,setStartCube]     = useState(null);
  const [step,setStep]               = useState(0);
  const [animIdx,setAnimIdx]         = useState(0);
  const [cubeFlash,setCubeFlash]     = useState(false);

  const [err,setErr]                 = useState("");
  const [scrambleSeq,setScrambleSeq] = useState(null);
  const [scrambling,setScrambling]   = useState(false);
  const [algoInput,setAlgoInput]     = useState("");
  const [algoErr,setAlgoErr]         = useState("");
  const [animatingAlgo,setAnimatingAlgo] = useState(false);
  const [validationErrs,setValidationErrs] = useState([]);

  // Kociemba state
  const [kStatus,setKStatus]         = useState("loading"); // loading | initializing | ready | error
  const [solveMode,setSolveMode]     = useState("optimal"); // optimal | ai

  // ── Load cubejs ────────────────────────────────────────────────
  useEffect(()=>{
    let mounted=true;
    (async()=>{
      try {
        setKStatus("loading");
        const [cubeText,solveText] = await Promise.all([
          fetch("https://unpkg.com/cubejs@0.9.0/lib/cube.js").then(r=>{if(!r.ok)throw new Error("fetch cube.js");return r.text();}),
          fetch("https://unpkg.com/cubejs@0.9.0/lib/solve.js").then(r=>{if(!r.ok)throw new Error("fetch solve.js");return r.text();})
        ]);
        if(!mounted) return;

        // Execute cube.js with fake module/exports
        const cubeModule={exports:{}};
        // eslint-disable-next-line no-new-func
        new Function("module","exports",cubeText)(cubeModule,cubeModule.exports);
        const CubeClass=cubeModule.exports;

        // Execute solve.js with fake module/require
        const solveModule={exports:{}};
        const fakeRequire=(n)=>n==="./cube"?CubeClass:{};
        // eslint-disable-next-line no-new-func
        new Function("module","exports","require",solveText)(solveModule,solveModule.exports,fakeRequire);

        if(!mounted) return;
        setKStatus("initializing");

        // Defer initSolver to let React paint the "initializing" state
        await new Promise(r=>setTimeout(r,80));
        if(!mounted) return;

        CubeClass.initSolver(); // synchronous, ~2-4 seconds
        kociembaRef.current=CubeClass;
        if(mounted) setKStatus("ready");
      } catch(e) {
        console.error("Kociemba load error:",e);
        if(mounted){ setKStatus("error"); setSolveMode("ai"); }
      }
    })();
    return()=>{mounted=false;};
  },[]);

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

  const onMD=e=>{dragRef.current={x:e.clientX,y:e.clientY,rx:rotX,ry:rotY};};
  const onMM=e=>{if(!dragRef.current)return;setRotY(dragRef.current.ry+(e.clientX-dragRef.current.x)*0.7);setRotX(dragRef.current.rx-(e.clientY-dragRef.current.y)*0.7);};
  const onMU=()=>{dragRef.current=null;};

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
  const solveKociemba=()=>{
    setPhase("solving");setErr("");
    try {
      const CubeClass=kociembaRef.current;
      const facelets=cubeToKociemba(cube);
      const c=CubeClass.fromString(facelets);
      const solution=c.solve(22);
      if(!solution||solution.startsWith("Error")){
        throw new Error(solution||"No solution found");
      }
      const moves=solution.trim().split(/\s+/).filter(Boolean);

      // Group moves into stage-like chunks of ~5 for readability
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
      setStartCube(dc(cube));
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
      setSolution(parsed);setStartCube(dc(cube));setStep(0);setAnimIdx(0);setPhase("solution");
    } catch(e) {
      setErr("Couldn't parse solution — verify all 54 stickers are correctly set.");setPhase("input");
    }
  };

  const solve=()=>{ solveMode==="optimal"&&kociembaRef.current ? solveKociemba() : solveAI(); };

  const goStep=n=>{setStep(n);setAnimIdx(a=>a+1);};
  const reset=()=>{setCube(initCube());setSolution(null);setStartCube(null);setPhase("input");setStep(0);setErr("");setScrambleSeq(null);setHistory([]);setAlgoInput("");setAlgoErr("");};

  const cur=solution?.steps?.[step];
  const total=solution?.steps?.length||0;
  const pct=total?Math.round(((step+1)/total)*100):0;
  const STAGE_C={"White Cross":"#eee","White Corners":"#aaa","Middle Layer":"#FFD600","Yellow Cross":"#FFD600","Orient Yellow Corners":"#FF6D00","Position Last Layer Corners":"#C62828","Cycle Last Layer Edges":"#2E7D32","Solved!":"#2E7D32"};
  const sc=STAGE_C[cur?.stage]||"#FF6D00";
  const busy=scrambling||animatingAlgo;
  const canSolve=!busy&&validationErrs.length===0;

  const tabBtn=(label,key)=><button onClick={()=>setTab(key)} style={{flex:1,padding:"9px 0",border:"none",cursor:"pointer",fontFamily:"'Courier New',monospace",fontSize:9,letterSpacing:3,background:tab===key?"#FFD600":"transparent",color:tab===key?"#000":"#444",borderRadius:tab===key?6:0,fontWeight:tab===key?900:400,transition:"all .2s"}}>{label}</button>;

  // Kociemba status badge
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
    <div onMouseUp={onMU} style={{minHeight:"100vh",background:"#07070f",backgroundImage:"radial-gradient(ellipse 80% 50% at 50% -10%, #0f0f2a, transparent)",color:"#fff",fontFamily:"'Courier New',monospace",display:"flex",flexDirection:"column",alignItems:"center",padding:"28px 16px 80px",userSelect:"none"}}>
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
              <div style={{cursor:"grab",marginBottom:20}} onMouseDown={onMD} onMouseMove={onMM} onMouseUp={onMU}>
                <Cube3D cube={cube} rotX={rotX} rotY={rotY}/>
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
            <div style={{cursor:"grab"}} onMouseDown={onMD} onMouseMove={onMM} onMouseUp={onMU}>
              <Cube3D cube={displayCube} rotX={rotX} rotY={rotY} highlight={highlightFace}/>
            </div>
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
            {[["⏮",()=>goStep(0),step===0,false],["← BACK",()=>goStep(Math.max(0,step-1)),step===0,false],["NEXT →",()=>goStep(Math.min(total-1,step+1)),step===total-1,true],["⏭",()=>goStep(total-1),step===total-1,false]].map(([label,fn,dis,hi])=>(
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