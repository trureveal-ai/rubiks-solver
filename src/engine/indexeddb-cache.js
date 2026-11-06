// IndexedDB cache for the Kociemba solver's move + pruning tables.
//
// Building these tables on worker init costs ~1.5s of pure CPU. They are
// deterministic for a given algorithm, so we persist them after the first build
// and hydrate straight from IndexedDB on every later load (and after a Cancel,
// which spawns a fresh worker that would otherwise rebuild from scratch).
//
// The tables are large nested/flat Arrays of numbers. IndexedDB uses the
// structured clone algorithm, which stores JS Arrays (and typed arrays /
// ArrayBuffers) natively, so the objects round-trip without any manual
// serialization.
//
// Every DB operation is wrapped so a failure (private mode, disabled storage,
// quota, corruption) rejects quietly — callers treat any failure as a cache miss
// and fall back to rebuilding, so the solver always still works.

const DB_NAME = "rubiksology-solver";
const DB_VERSION = 1;
const STORE = "tables";
const RECORD_KEY = "kociemba"; // single record holding both table sets

function openDB() {
  return new Promise((resolve, reject) => {
    let idb;
    try {
      // `indexedDB` is available on both window and worker global scopes.
      idb = typeof indexedDB !== "undefined" ? indexedDB : self.indexedDB;
    } catch {
      idb = undefined;
    }
    if (!idb) {
      reject(new Error("IndexedDB unavailable"));
      return;
    }
    let req;
    try {
      req = idb.open(DB_NAME, DB_VERSION);
    } catch (err) {
      reject(err);
      return;
    }
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error || new Error("IndexedDB open failed"));
    req.onblocked = () => reject(new Error("IndexedDB open blocked"));
  });
}

/**
 * Load cached tables matching `version`. Resolves with
 * { moveTables, pruningTables } on a hit, or null on any miss / error.
 */
export async function loadCachedTables(version) {
  let db;
  try {
    db = await openDB();
  } catch {
    return null;
  }
  try {
    const record = await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, "readonly");
      const req = tx.objectStore(STORE).get(RECORD_KEY);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error || new Error("IndexedDB get failed"));
    });
    if (
      !record ||
      record.version !== version ||
      !record.moveTables ||
      !record.pruningTables
    ) {
      return null;
    }
    return { moveTables: record.moveTables, pruningTables: record.pruningTables };
  } catch {
    return null;
  } finally {
    try { db.close(); } catch { /* ignore */ }
  }
}

/**
 * Persist `{ moveTables, pruningTables }` under `version`. Resolves true on
 * success, false on any error. Never throws.
 */
export async function saveCachedTables(version, { moveTables, pruningTables }) {
  let db;
  try {
    db = await openDB();
  } catch {
    return false;
  }
  try {
    await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error || new Error("IndexedDB write failed"));
      tx.onabort = () => reject(tx.error || new Error("IndexedDB write aborted"));
      tx.objectStore(STORE).put({ version, moveTables, pruningTables }, RECORD_KEY);
    });
    return true;
  } catch {
    return false;
  } finally {
    try { db.close(); } catch { /* ignore */ }
  }
}
