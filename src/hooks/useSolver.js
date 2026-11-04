import { useState, useEffect } from "react";
import { cubeToKociemba } from "../engine/kociemba.js";
import { copyCube, MOVE_DESC } from "../engine/cube.js";

// Persistent solver worker — created once, pruning tables built on first solve
const solverWorker = new Worker(
  new URL('../engine/solve.worker.js', import.meta.url),
  { type: 'module' }
);

export default function useSolver() {
  const [kStatus, setKStatus] = useState("loading");

  // Initialize solver via persistent worker
  useEffect(() => {
    let mounted = true;
    const handler = ({ data }) => {
      if (!mounted) return;
      if (data.type === 'ready') setKStatus('ready');
      else if (data.type === 'error' && kStatus === 'loading') setKStatus('error');
    };
    solverWorker.addEventListener('message', handler);
    solverWorker.postMessage({ type: 'init' });
    setKStatus('initializing');
    return () => { mounted = false; solverWorker.removeEventListener('message', handler); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const solve = async (cube) => {
    const facelets = cubeToKociemba(cube);
    const solutionStr = await new Promise((resolve, reject) => {
      const handler = ({ data }) => {
        solverWorker.removeEventListener('message', handler);
        if (data.type === 'solution') resolve(data.moves);
        else reject(new Error(data.message || 'Worker error'));
      };
      solverWorker.addEventListener('message', handler);
      solverWorker.postMessage({ type: 'solve', facelets });
    });

    const moves = solutionStr ? solutionStr.trim().split(/\s+/).filter(Boolean) : [];

    if (moves.length === 0) {
      return {
        solution: { totalMoves: 0, steps: [{ n: 1, stage: "Solved!", move: "", explain: "Your cube is already solved!", tip: "" }] },
        startCube: copyCube(cube),
      };
    }

    const steps = moves.map((m, i) => ({
      n: i + 1,
      stage: `Move ${i + 1}`,
      move: m,
      explain: MOVE_DESC[m] || m,
      tip: i === 0 ? "Kociemba optimal solution — typically 20 moves or fewer." : "",
    }));

    return {
      solution: { totalMoves: moves.length, steps },
      startCube: copyCube(cube),
    };
  };

  return { kStatus, solve };
}
