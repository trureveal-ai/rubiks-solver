import { useState, useCallback, useEffect, useRef } from "react";
import {
  PAL, initCube, MOVE_FN, ALL_MOVES,
  generateScramble,
} from "../engine/cube.js";
import { validateCube } from "../engine/validate.js";

export default function useCubeState() {
  const [cube, setCube]               = useState(initCube);
  const [history, setHistory]         = useState([]);
  const [selColor, setSelColor]       = useState("R");
  const [cycleMode, setCycleMode]     = useState(false);
  const [painting, setPainting]       = useState(false);
  const [flatLayout, setFlatLayout]   = useState("cross");
  const [tab, setTab]                 = useState("paint");
  const [err, setErr]                 = useState("");
  const [scrambleSeq, setScrambleSeq] = useState(null);
  const [scrambling, setScrambling]   = useState(false);
  const [algoInput, setAlgoInput]     = useState("");
  const [algoErr, setAlgoErr]         = useState("");
  const [animatingAlgo, setAnimatingAlgo] = useState(false);
  const [validationErrs, setValidationErrs] = useState([]);

  // Paint-screen 3D animation state
  const [paintAnimTrigger, setPaintAnimTrigger] = useState(null);
  const [paintPendingMove, setPaintPendingMove] = useState(null);
  const paintAnimKeyRef = useRef(0);

  // Validation
  useEffect(() => { setValidationErrs(validateCube(cube)); }, [cube]);

  // Mouse-up ends painting
  useEffect(() => {
    const up = () => setPainting(false);
    window.addEventListener("mouseup", up);
    return () => window.removeEventListener("mouseup", up);
  }, []);

  // ── Handlers ──────────────────────────────────────────────────
  const paint = useCallback((face, idx) => {
    setCube(prev => {
      setHistory(h => [...h.slice(-49), prev]);
      return { ...prev, [face]: prev[face].map((c, i) => i === idx ? selColor : c) };
    });
  }, [selColor]);

  const cycleSticker = useCallback((face, idx) => {
    setCube(prev => {
      setHistory(h => [...h.slice(-49), prev]);
      const next = PAL[(PAL.indexOf(prev[face][idx]) + 1) % PAL.length];
      return { ...prev, [face]: prev[face].map((c, i) => i === idx ? next : c) };
    });
  }, []);

  const undo = () => {
    if (!history.length) return;
    setCube(history[history.length - 1]);
    setHistory(h => h.slice(0, -1));
  };

  const doMove = useCallback((move) => {
    if (!MOVE_FN[move]) return;
    setCube(prev => {
      setHistory(h => [...h.slice(-49), prev]);
      return MOVE_FN[move](prev);
    });
  }, []);

  // Animated move for 3D interactive buttons on paint screen
  const doMoveAnimated = useCallback((move) => {
    if (!MOVE_FN[move] || paintPendingMove) return;
    setPaintPendingMove(move);
    paintAnimKeyRef.current += 1;
    setPaintAnimTrigger({ move, key: paintAnimKeyRef.current });
  }, [paintPendingMove]);

  const handlePaintAnimDone = useCallback(() => {
    setPaintAnimTrigger(null);
    setPaintPendingMove(prev => {
      if (prev && MOVE_FN[prev]) {
        setCube(c => { setHistory(h => [...h.slice(-49), c]); return MOVE_FN[prev](c); });
      }
      return null;
    });
  }, []);

  const applyAlgo = () => {
    const moves = algoInput.trim().split(/\s+/).filter(Boolean);
    const bad = moves.filter(m => !MOVE_FN[m]);
    if (bad.length) { setAlgoErr(`Unknown: ${bad.join(" ")}`); return; }
    setAlgoErr("");
    setCube(prev => {
      setHistory(h => [...h.slice(-49), prev]);
      let c = prev; moves.forEach(m => { c = MOVE_FN[m](c); }); return c;
    });
  };

  const animateAlgo = async () => {
    const moves = algoInput.trim().split(/\s+/).filter(Boolean);
    const bad = moves.filter(m => !MOVE_FN[m]);
    if (bad.length) { setAlgoErr(`Unknown: ${bad.join(" ")}`); return; }
    setAlgoErr(""); setAnimatingAlgo(true); setHistory(h => [...h.slice(-49), cube]);
    let c = cube;
    for (const m of moves) { await new Promise(r => setTimeout(r, 300)); c = MOVE_FN[m](c); setCube({ ...c }); }
    setAnimatingAlgo(false);
  };

  const handleScramble = async () => {
    setScrambling(true); setErr(""); setScrambleSeq(null); setHistory([]);
    const { seq } = generateScramble(20);
    let cur = initCube(); setCube({ ...cur });
    for (const m of seq) { await new Promise(r => setTimeout(r, 65)); cur = MOVE_FN[m](cur); setCube({ ...cur }); }
    setScrambleSeq(seq); setScrambling(false);
  };

  const resetCube = () => {
    setCube(initCube()); setHistory([]); setErr(""); setScrambleSeq(null);
    setAlgoInput(""); setAlgoErr("");
    setPaintAnimTrigger(null); setPaintPendingMove(null);
  };

  return {
    cube, setCube,
    history, selColor, setSelColor, cycleMode, setCycleMode,
    painting, setPainting, flatLayout, setFlatLayout, tab, setTab,
    err, setErr, scrambleSeq, scrambling, algoInput, setAlgoInput, algoErr,
    animatingAlgo, validationErrs,
    paintAnimTrigger, paintPendingMove,
    paint, cycleSticker, undo, doMove, doMoveAnimated, handlePaintAnimDone,
    applyAlgo, animateAlgo, handleScramble, resetCube,
    ALL_MOVES,
  };
}
