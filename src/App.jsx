import { useState, useCallback, useReducer, useRef } from "react";
import InputPanel from "./components/InputPanel.jsx";
import SolvingPanel from "./components/SolvingPanel.jsx";
import SolutionPanel from "./components/SolutionPanel.jsx";
import { Toast } from "./components/ui.jsx";

import useCubeState from "./hooks/useCubeState.js";
import useSolver from "./hooks/useSolver.js";
import useAnimation from "./hooks/useAnimation.js";
import useKeyboardShortcuts from "./hooks/useKeyboardShortcuts.js";
import { phaseReducer, INITIAL_PHASE, PHASES, PHASE_ACTIONS } from "./state/phaseMachine.js";

export default function App() {
  const cs = useCubeState();
  const solver = useSolver();

  const [phase, dispatch] = useReducer(phaseReducer, INITIAL_PHASE);
  const [solution, setSolution] = useState(null);
  const [startCube, setStartCube] = useState(null);
  const [toast, setToast] = useState({ message: "", visible: false });
  const toastTimer = useRef(null);
  const [cameraPreset, setCameraPreset] = useState("default");
  const [highContrast, setHighContrast] = useState(false);

  const anim = useAnimation({ solution, startCube, cube: cs.cube, phase });

  useKeyboardShortcuts({ anim, solution, phase });

  const showToast = useCallback((message) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ message, visible: true });
    toastTimer.current = setTimeout(() => setToast(t => ({ ...t, visible: false })), 2000);
  }, []);

  const copySolution = useCallback(() => {
    if (!solution?.steps) return;
    const moves = solution.steps.map(s => s.move).filter(Boolean).join(" ");
    navigator.clipboard.writeText(moves).then(
      () => showToast("✓ SOLUTION COPIED"),
      () => showToast("⚠ COPY FAILED"),
    );
  }, [solution, showToast]);

  const handleSolve = async () => {
    dispatch(PHASE_ACTIONS.SOLVE_START); cs.setErr("");
    try {
      const result = await solver.solve(cs.cube);
      setSolution(result.solution);
      setStartCube(result.startCube);
      anim.resetAnimation();
      dispatch(PHASE_ACTIONS.SOLVE_SUCCESS);
    } catch (e) {
      if (e.message === 'cancelled') {
        dispatch(PHASE_ACTIONS.SOLVE_CANCEL);
      } else {
        cs.setErr("Kociemba error — cube state may be invalid. Try re-entering colors.");
        dispatch(PHASE_ACTIONS.SOLVE_ERROR);
      }
    }
  };

  const reset = () => {
    cs.resetCube();
    setSolution(null); setStartCube(null);
    anim.resetAnimation();
    dispatch(PHASE_ACTIONS.RESET);
  };

  const handleCancel = () => { solver.cancel(); dispatch(PHASE_ACTIONS.SOLVE_CANCEL); };

  return (
    <div role="application" aria-label="Rubiksology Rubik's Cube Solver" style={{
      minHeight:"100vh", background: highContrast ? "#000" : "#07070f",
      backgroundImage: highContrast ? "none" : "radial-gradient(ellipse 80% 50% at 50% -10%, #0f0f2a, transparent)",
      color:"#fff", fontFamily:"'Courier New',monospace",
      display:"flex", flexDirection:"column", alignItems:"center",
      padding:"28px 16px 80px", userSelect:"none",
    }}>
      <a href="#main-content" style={{position:"absolute",top:"-40px",left:0,background:"#FFD600",color:"#000",padding:"8px 16px",zIndex:9999,fontSize:12,transition:"top .2s"}} onFocus={e=>{e.target.style.top="0"}} onBlur={e=>{e.target.style.top="-40px"}}>Skip to content</a>
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
        button{-webkit-tap-highlight-color:transparent;touch-action:manipulation;}
        button:focus-visible,input:focus-visible{outline:2px solid #FFD600;outline-offset:2px;}
        ${highContrast ? `
          .hc-border{border-color:#fff !important;}
          .hc-text{color:#fff !important;}
        ` : ""}
      `}</style>

      {/* Header */}
      <header style={{textAlign:"center",marginBottom:22}} id="main-content">
        <div style={{fontSize:9,letterSpacing:8,color:"#333",marginBottom:5}}>◈ KOCIEMBA · AI-POWERED ◈</div>
        <h1 style={{
          fontSize:"clamp(1.6rem, 7vw, 2.4rem)", fontWeight:900, letterSpacing:"-1px", lineHeight:1, margin:0,
          background: highContrast ? "none" : "linear-gradient(100deg,#E65100 0%,#FFD600 30%,#2E7D32 60%,#1565C0 100%)",
          WebkitBackgroundClip: highContrast ? "unset" : "text",
          WebkitTextFillColor: highContrast ? "#fff" : "transparent",
        }}>RUBIKSOLOGY</h1>
        <button onClick={()=>setHighContrast(h=>!h)} aria-label={highContrast?"Disable high contrast mode":"Enable high contrast mode"} style={{
          marginTop:8, padding:"3px 10px", border:`1px solid ${highContrast?"#fff":"#1a1a2e"}`, borderRadius:4, background:"transparent",
          color:highContrast?"#fff":"#333", fontFamily:"'Courier New',monospace", fontSize:7, letterSpacing:2, cursor:"pointer",
        }}>{highContrast ? "◉ HIGH CONTRAST ON" : "◎ HIGH CONTRAST"}</button>
      </header>

      {phase===PHASES.INPUT && (
        <InputPanel cs={cs} solver={solver} onSolve={handleSolve} onReset={reset} />
      )}

      {phase===PHASES.SOLVING && (
        <SolvingPanel solver={solver} onCancel={handleCancel} />
      )}

      {phase===PHASES.SOLUTION && solution && (
        <SolutionPanel
          solution={solution} anim={anim}
          cameraPreset={cameraPreset} setCameraPreset={setCameraPreset}
          onCopy={copySolution} onReset={reset}
        />
      )}

      {/* Screen reader live region */}
      <div aria-live="polite" aria-atomic="true" style={{position:"absolute",width:1,height:1,overflow:"hidden",clip:"rect(0,0,0,0)"}}>
        {phase===PHASES.SOLUTION && solution && solution.steps?.[anim.step < anim.total ? anim.step : anim.total - 1] &&
          `Step ${anim.step} of ${anim.total}: ${solution.steps[anim.step < anim.total ? anim.step : anim.total - 1].move || "Start"} — ${solution.steps[anim.step < anim.total ? anim.step : anim.total - 1].explain}`}
        {phase===PHASES.SOLVING && "Solving cube, please wait."}
      </div>

      {/* Version */}
      <div style={{marginTop:40,fontSize:7,color:"#1a1a2e",letterSpacing:3,textAlign:"center"}}>
        RUBIKSOLOGY v{__APP_VERSION__}
      </div>

      {/* Toast */}
      <Toast message={toast.message} visible={toast.visible} />
    </div>
  );
}
