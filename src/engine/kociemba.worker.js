import Cube from 'cubejs';

console.log('[worker] script evaluated, Cube type:', typeof Cube, 'initSolver type:', typeof Cube?.initSolver);

self.onerror = (msg, src, line, col, err) => {
  console.error('[worker] UNCAUGHT ERROR:', msg, err);
  self.postMessage({ type: 'error', message: String(err || msg) });
};

self.onmessage = (e) => {
  console.log('[worker] onmessage fired, type:', e.data?.type);
  const { type, facelets } = e.data;

  if (type === 'init') {
    try {
      console.log('[worker] calling Cube.initSolver()...');
      Cube.initSolver();
      console.log('[worker] initSolver() DONE — posting ready');
      self.postMessage({ type: 'ready' });
    } catch (err) {
      console.error('[worker] initSolver threw:', err);
      self.postMessage({ type: 'error', message: err.message });
    }
  }

  if (type === 'solve') {
    try {
      console.log('[worker] running solve(), facelets:', facelets);
      const c = Cube.fromString(facelets);
      console.log('[worker] fromString ok, isSolved:', c.isSolved());
      const solution = c.isSolved() ? '' : c.solve();
      console.log('[worker] solve() done, solution:', solution);
      self.postMessage({ type: 'solution', solution });
    } catch (err) {
      console.error('[worker] solve threw:', err);
      self.postMessage({ type: 'error', message: err.message });
    }
  }
};

console.log('[worker] onmessage handler registered');
