import {
  initKociemba, solveFromFacelets, cancelSolve,
  SOLVER_TABLES_VERSION, getSolverTables, hydrateSolverTables,
} from './kociemba.js';
import { loadCachedTables, saveCachedTables } from './indexeddb-cache.js';

let ready = false;

async function ensureReady(onProgress) {
  if (ready) return;

  // Fast path: hydrate prebuilt tables from IndexedDB and skip the ~1.5s build.
  let cached = null;
  try {
    cached = await loadCachedTables(SOLVER_TABLES_VERSION);
  } catch {
    cached = null;
  }
  if (cached && hydrateSolverTables(cached)) {
    onProgress({ phase: 'cache', table: 'all', done: 1, total: 1 });
    ready = true;
    return;
  }

  // Cache miss: build the tables, then persist them for next time.
  await initKociemba(() => {}, onProgress);
  ready = true;
  try {
    await saveCachedTables(SOLVER_TABLES_VERSION, getSolverTables());
  } catch {
    /* non-fatal: solver already works, caching is best-effort */
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
