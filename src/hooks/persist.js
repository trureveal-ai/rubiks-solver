// Tiny localStorage helpers that never throw.
//
// Reads/writes are wrapped in try/catch so private-browsing mode, disabled
// storage, quota errors, or malformed JSON all degrade gracefully to "no
// persisted value" instead of crashing a render or a state update.

const PREFIX = "rubiksology:";

export function loadStored(key, fallback) {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    if (raw == null) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

export function saveStored(key, value) {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    /* ignore: persistence is best-effort */
  }
}
