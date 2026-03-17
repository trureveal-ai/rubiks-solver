import KociembaWorker from './kociemba.worker.js?worker&inline';

let worker = null;

function getWorker() {
  if (!worker) {
    console.log('[kociemba] creating new Worker instance');
    worker = new KociembaWorker();
    console.log('[kociemba] Worker created:', worker);
  }
  return worker;
}

export function terminateKociemba() {
  if (worker) {
    console.log('[kociemba] terminating worker');
    worker.terminate();
    worker = null;
  }
}

export function cubeToKociemba(cube) {
  const map={Y:'U',R:'R',B:'F',W:'D',O:'L',G:'B'};
  return ['U','R','F','D','L','B'].flatMap(f=>cube[f]).map(c=>map[c]).join('');
}

export function initKociemba(setStatus) {
  console.log('[kociemba] initKociemba() called');
  setStatus('initializing');
  return new Promise((resolve, reject) => {
    const w = getWorker();

    w.onerror = (e) => {
      console.error('[kociemba] worker onerror:', e);
      setStatus('error');
      reject(new Error(e.message || 'Worker failed to load'));
    };

    const handler = (e) => {
      console.log('[kociemba] init handler received message:', e.data);
      if (e.data.type === 'ready') {
        w.removeEventListener('message', handler);
        console.log('[kociemba] got ready — setting status ready');
        setStatus('ready');
        resolve();
      } else if (e.data.type === 'error') {
        w.removeEventListener('message', handler);
        console.error('[kociemba] got error from worker:', e.data.message);
        setStatus('error');
        reject(new Error(e.data.message));
      }
    };
    w.addEventListener('message', handler);
    console.log('[kociemba] posting init to worker');
    w.postMessage({ type: 'init' });
  });
}

export function solveKociemba(cube) {
  const facelets = cubeToKociemba(cube);
  console.log('[kociemba] solveKociemba() called, facelets length:', facelets.length, 'facelets:', facelets);
  return new Promise((resolve, reject) => {
    const w = getWorker();
    console.log('[kociemba] worker for solve is same instance?', w === worker);
    const handler = (e) => {
      console.log('[kociemba] solve handler received message:', e.data);
      if (e.data.type === 'solution') {
        w.removeEventListener('message', handler);
        console.log('[kociemba] resolving with solution:', e.data.solution);
        resolve(e.data.solution);
      } else if (e.data.type === 'error') {
        w.removeEventListener('message', handler);
        console.error('[kociemba] solve error from worker:', e.data.message);
        reject(new Error(e.data.message));
      }
    };
    w.addEventListener('message', handler);
    console.log('[kociemba] posting solve to worker');
    w.postMessage({ type: 'solve', facelets });
  });
}
