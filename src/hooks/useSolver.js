import { useState, useEffect, useCallback, useRef } from "react";
import { cubeToKociemba } from "../engine/kociemba.js";
import { copyCube, MOVE_DESC } from "../engine/cube.js";

// Persistent solver worker — created once, pruning tables built on first solve
const solverWorker = new Worker(
  new URL('../engine/solve.worker.js', import.meta.url),
  { type: 'module' }
);

// Extended move descriptions with richer text
const MOVE_EXPLAIN = {
  "U":  "Rotate the top (U) face 90° clockwise",
  "U'": "Rotate the top (U) face 90° counter-clockwise",
  "U2": "Rotate the top (U) face 180°",
  "D":  "Rotate the bottom (D) face 90° clockwise",
  "D'": "Rotate the bottom (D) face 90° counter-clockwise",
  "D2": "Rotate the bottom (D) face 180°",
  "F":  "Rotate the front (F) face 90° clockwise",
  "F'": "Rotate the front (F) face 90° counter-clockwise",
  "F2": "Rotate the front (F) face 180°",
  "B":  "Rotate the back (B) face 90° clockwise",
  "B'": "Rotate the back (B) face 90° counter-clockwise",
  "B2": "Rotate the back (B) face 180°",
  "R":  "Rotate the right (R) face 90° clockwise",
  "R'": "Rotate the right (R) face 90° counter-clockwise",
  "R2": "Rotate the right (R) face 180°",
  "L":  "Rotate the left (L) face 90° clockwise",
  "L'": "Rotate the left (L) face 90° counter-clockwise",
  "L2": "Rotate the left (L) face 180°",
};

// Phase 2 moves (G1 subgroup moves)
const PHASE2_MOVES = new Set(['U', "U'", 'U2', 'D', "D'", 'D2', 'R2', 'L2', 'F2', 'B2']);

function categorizeSteps(moves) {
  if (moves.length === 0) {
    return [{ n: 1, stage: "Solved!", move: "", explain: "Your cube is already solved!", tip: "" }];
  }

  // The Kociemba algorithm has two phases:
  // Phase 1: reduces cube to G1 subgroup (only U, D quarter turns + R2, L2, F2, B2)
  // Phase 2: solves within G1
  // We detect the phase boundary by finding where all subsequent moves are Phase 2 moves
  let phase2Start = moves.length; // default: all Phase 1
  for (let i = 0; i < moves.length; i++) {
    let allPhase2 = true;
    for (let j = i; j < moves.length; j++) {
      if (!PHASE2_MOVES.has(moves[j])) { allPhase2 = false; break; }
    }
    if (allPhase2) { phase2Start = i; break; }
  }

  return moves.map((m, i) => {
    const isPhase2 = i >= phase2Start;
    const phaseNum = isPhase2 ? 2 : 1;
    const phaseLabel = isPhase2 ? "Phase 2 — Solve" : "Phase 1 — Reduce";
    const stepInPhase = isPhase2 ? i - phase2Start + 1 : i + 1;

    let tip = "";
    if (i === 0) {
      tip = "Kociemba two-phase algorithm — searches multiple orientations for the shortest solution.";
    } else if (i === phase2Start && phase2Start > 0) {
      tip = "Phase 2 begins — the cube is now in the G1 subgroup. Only half-turns of R, L, F, B are needed.";
    }

    return {
      n: i + 1,
      stage: `${phaseLabel} (${stepInPhase})`,
      move: m,
      explain: MOVE_EXPLAIN[m] || MOVE_DESC[m] || m,
      tip,
      phase: phaseNum,
    };
  });
}

export default function useSolver() {
  const [kStatus, setKStatus] = useState("loading");
  const [initProgress, setInitProgress] = useState(null);
  const [solveProgress, setSolveProgress] = useState(null);
  const [solveStats, setSolveStats] = useState(null);
  const solvingRef = useRef(false);
  const solveStartRef = useRef(0);

  // Initialize solver via persistent worker
  useEffect(() => {
    let mounted = true;
    const handler = ({ data }) => {
      if (!mounted) return;
      if (data.type === 'ready') {
        setKStatus('ready');
        setInitProgress(null);
      } else if (data.type === 'initProgress') {
        setInitProgress({
          phase: data.phase,
          table: data.table,
          done: data.done,
          total: data.total,
        });
      } else if (data.type === 'error' && kStatus === 'loading') {
        setKStatus('error');
      }
    };
    solverWorker.addEventListener('message', handler);
    solverWorker.postMessage({ type: 'init' });
    setKStatus('initializing');
    return () => { mounted = false; solverWorker.removeEventListener('message', handler); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const solve = useCallback(async (cube) => {
    solvingRef.current = true;
    setSolveProgress(null);
    setSolveStats(null);
    solveStartRef.current = performance.now();

    const facelets = cubeToKociemba(cube);
    const result = await new Promise((resolve, reject) => {
      const handler = ({ data }) => {
        if (data.type === 'solveProgress') {
          setSolveProgress({
            iters: data.iters,
            maxIters: data.maxIters,
            orientation: data.orientation,
            totalOrientations: data.totalOrientations,
            bestLen: data.bestLen,
          });
          return; // Don't remove handler — keep listening
        }
        if (data.type === 'solution' || data.type === 'error' || data.type === 'cancelled') {
          solverWorker.removeEventListener('message', handler);
          solvingRef.current = false;
          setSolveProgress(null);
          if (data.type === 'solution') resolve(data);
          else if (data.type === 'cancelled') reject(new Error('cancelled'));
          else reject(new Error(data.message || 'Worker error'));
        }
      };
      solverWorker.addEventListener('message', handler);
      solverWorker.postMessage({ type: 'solve', facelets, multiOrientation: true });
    });

    const solveTime = performance.now() - solveStartRef.current;
    const moves = result.moves ? result.moves.trim().split(/\s+/).filter(Boolean) : [];
    const steps = categorizeSteps(moves);

    const stats = {
      solveTimeMs: Math.round(solveTime),
      moveCount: moves.length,
      orientationsSearched: result.moveCount ? 24 : 1,
    };
    setSolveStats(stats);

    return {
      solution: { totalMoves: moves.length, steps, stats },
      startCube: copyCube(cube),
    };
  }, []);

  const cancel = useCallback(() => {
    if (solvingRef.current) {
      solverWorker.postMessage({ type: 'cancel' });
    }
  }, []);

  return { kStatus, solve, cancel, initProgress, solveProgress, solveStats };
}
