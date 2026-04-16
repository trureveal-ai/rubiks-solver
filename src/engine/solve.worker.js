console.log('[worker] module loading...');

import { initKociemba, solveFromFacelets } from './kociemba.js';

console.log('[worker] imports resolved, setting up onmessage');

self.onerror = (msg, src, line, col, err) => {
  console.error('[worker] uncaught error:', msg, src, line, col, err);
};

let ready = false;

self.onmessage = async ({ data }) => {
  console.log('[worker] received message:', data?.type);
  if (data.type !== 'solve') return;
  try {
    if (!ready) {
      console.log('[worker] initializing tables...');
      await initKociemba(() => {});
      console.log('[worker] tables ready');
      ready = true;
    }
    console.log('[worker] solving facelets:', data.facelets);
    const result = solveFromFacelets(data.facelets);
    if (result.parityError) {
      console.error('[worker] parity error:', result.parityError);
      self.postMessage({ type: 'error', message: result.parityError });
    } else {
      console.log('[worker] solution:', result.solution);
      self.postMessage({ type: 'solution', moves: result.solution });
    }
  } catch (err) {
    console.error('[worker] caught error:', err);
    self.postMessage({ type: 'error', message: err.message });
  }
};
