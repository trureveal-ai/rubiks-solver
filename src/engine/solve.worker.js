import { initKociemba, solveFromFacelets } from './kociemba.js';

let ready = false;

async function ensureReady() {
  if (!ready) {
    await initKociemba(() => {});
    ready = true;
  }
}

self.onmessage = async ({ data }) => {
  if (data.type === 'init') {
    try {
      await ensureReady();
      self.postMessage({ type: 'ready' });
    } catch (err) {
      self.postMessage({ type: 'error', message: err.message });
    }
    return;
  }
  if (data.type !== 'solve') return;
  try {
    await ensureReady();
    const result = solveFromFacelets(data.facelets);
    if (result.parityError) {
      self.postMessage({ type: 'error', message: result.parityError });
    } else {
      self.postMessage({ type: 'solution', moves: result.solution });
    }
  } catch (err) {
    self.postMessage({ type: 'error', message: err.message });
  }
};
