import { useState, useEffect, useMemo, useRef } from "react";
import { replayToCube } from "../engine/cube.js";
import { MOVE_ANIM } from "../components/ThreeCube.jsx";

const SPEEDS = {
  slow:   { anim: 0.8, delay: 500 },
  normal: { anim: 0.4, delay: 300 },
  fast:   { anim: 0.2, delay: 100 },
};

export default function useAnimation({ solution, startCube, cube }) {
  const [phase, setPhase]           = useState("input");
  const [step, setStep]             = useState(0);
  const [animIdx, setAnimIdx]       = useState(0);
  const [cubeFlash, setCubeFlash]   = useState(false);
  const [pendingStep, setPendingStep] = useState(null);
  const [animTrigger, setAnimTrigger] = useState(null);
  const [playing, setPlaying]       = useState(false);
  const [playSpeed, setPlaySpeed]   = useState("normal");
  const animKeyRef                  = useRef(0);
  const playingRef                  = useRef(false);

  const setPlayingSync = (val) => { playingRef.current = val; setPlaying(val); };

  // Computed values
  const highlightFace = useMemo(() => {
    const steps = solution?.steps;
    if (!steps) return null;
    const mv = steps[Math.min(step, steps.length - 1)]?.move;
    if (!mv) return null;
    return mv.trim().split(/\s+/)[0]?.[0] || null;
  }, [solution, step]);

  const displayCube = useMemo(() => {
    if (!solution || !startCube) return cube;
    if (step === 0) return startCube;
    return replayToCube(startCube, solution.steps, step - 1);
  }, [solution, startCube, step, cube]);

  // Cube flash on step change
  useEffect(() => {
    if (phase !== "solution") return;
    setCubeFlash(true);
    const t = setTimeout(() => setCubeFlash(false), 350);
    return () => clearTimeout(t);
  }, [step, phase]);

  // Auto-play
  useEffect(() => {
    if (!playingRef.current || phase !== "solution") return;
    const t = solution?.steps?.length ?? 0;
    if (step >= t) { setPlayingSync(false); return; }
    const id = setTimeout(() => goStep(step + 1), SPEEDS[playSpeed].delay);
    return () => clearTimeout(id);
  }, [step, playSpeed]); // eslint-disable-line react-hooks/exhaustive-deps

  const goStep = (n) => {
    if (n === step + 1 && solution) {
      const move = solution.steps[step]?.move?.trim() ?? "";
      const tokens = move.split(/\s+/).filter(Boolean);
      if (tokens.length === 1 && MOVE_ANIM[tokens[0]]) {
        animKeyRef.current += 1;
        setAnimTrigger({ move: tokens[0], key: animKeyRef.current });
        setPendingStep(n);
        return;
      }
    }
    setStep(n);
    setAnimIdx(a => a + 1);
  };

  const handleAnimDone = () => {
    if (pendingStep !== null) {
      setStep(pendingStep);
      setAnimIdx(a => a + 1);
      setPendingStep(null);
    }
    setAnimTrigger(null);
  };

  const resetAnimation = () => {
    setPhase("input"); setStep(0); setPendingStep(null);
    setAnimTrigger(null); setPlayingSync(false);
  };

  const total = solution?.steps?.length || 0;

  return {
    phase, setPhase,
    step, animIdx, cubeFlash, pendingStep,
    animTrigger, playing, playSpeed, setPlaySpeed,
    highlightFace, displayCube,
    setPlayingSync, goStep, handleAnimDone, resetAnimation,
    total, SPEEDS,
  };
}
