import { initKociemba, solveFromFacelets, cancelSolve } from './kociemba.js';

let ready = false;

async function ensureReady(onProgress) {
  if (!ready) {
    await initKociemba(() => {}, onProgress);
    ready = true;
  }
}

self.onmessage = async ({ data }) => {
  if (data.type === 'init') {
    try {
      await ensureReady((progress) => {
        self.postMessage({ type: 'initProgress', ...progress });
      });
      self.postMessage({ type: 'ready' });
    } catch (err) {
      self.postMessage({ type: 'error', message: err.message });
    }
    return;
  }

  if (data.type === 'cancel') {
    cancelSolve();
    return;
  }

  if (data.type !== 'solve') return;

  try {
    await ensureReady(() => {});

    const result = solveFromFacelets(data.facelets, {
      multiOrientation: data.multiOrientation !== false,
      onProgress: (progress) => {
        self.postMessage({ type: 'solveProgress', ...progress });
      },
    });

    if (result.cancelled) {
      self.postMessage({ type: 'cancelled' });
    } else if (result.parityError) {
      self.postMessage({ type: 'error', message: result.parityError });
    } else {
      self.postMessage({
        type: 'solution',
        moves: result.solution,
        moveCount: result.moveCount,
      });
    }
  } catch (err) {
    self.postMessage({ type: 'error', message: err.message });
  }
};
