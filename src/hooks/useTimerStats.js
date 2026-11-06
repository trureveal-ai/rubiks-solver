import { useState, useCallback, useMemo, useEffect } from "react";

// ── Session timer statistics ─────────────────────────────────────────────────
// Tracks solve times ACROSS solves (persisted to localStorage) and derives the
// usual speedcubing figures: best, session mean, count, and WCA-style ao5 / ao12
// (average of 5 / 12 with the single best & worst trimmed), plus a short recent
// trend. All localStorage access is wrapped in try/catch so private-mode or a
// disabled store never breaks the app — it just falls back to in-memory state.

const STORAGE_KEY = "rubiksology.sessionStats.v1";
const MAX_TIMES = 500; // keep the persisted history bounded

function loadTimes() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed?.times)) {
      return parsed.times.filter((t) => typeof t === "number" && isFinite(t) && t >= 0);
    }
    return [];
  } catch {
    return [];
  }
}

function saveTimes(times) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ v: 1, times }));
  } catch {
    /* quota exceeded / storage disabled — stay in-memory */
  }
}

// WCA average of `n`: take the most recent n solves, drop the single best and
// worst, mean the remainder. Returns null until there are at least n solves.
function wcaAverage(times, n) {
  if (times.length < n) return null;
  const windowTimes = times.slice(-n);
  const sorted = [...windowTimes].sort((a, b) => a - b);
  const trimmed = sorted.slice(1, -1);
  const sum = trimmed.reduce((a, b) => a + b, 0);
  return Math.round(sum / trimmed.length);
}

export default function useTimerStats() {
  const [times, setTimes] = useState(loadTimes);

  // Persist whenever the history changes.
  useEffect(() => {
    saveTimes(times);
  }, [times]);

  // Record one completed solve. Call exactly once per solve (from the solve
  // completion handler, NOT from render) to avoid double-counting on re-render.
  const recordSolve = useCallback((ms) => {
    if (typeof ms !== "number" || !isFinite(ms) || ms < 0) return;
    setTimes((prev) => {
      const next = [...prev, Math.round(ms)];
      return next.length > MAX_TIMES ? next.slice(-MAX_TIMES) : next;
    });
  }, []);

  const reset = useCallback(() => setTimes([]), []);

  const derived = useMemo(() => {
    const count = times.length;
    const best = count ? Math.min(...times) : null;
    const mean = count ? Math.round(times.reduce((a, b) => a + b, 0) / count) : null;
    const last = count ? times[count - 1] : null;
    const prev = count > 1 ? times[count - 2] : null;
    return {
      count,
      best,
      mean,
      last,
      prev,
      ao5: wcaAverage(times, 5),
      ao12: wcaAverage(times, 12),
      trend: times.slice(-10), // recent solves for a small sparkline
    };
  }, [times]);

  return { ...derived, times, recordSolve, reset };
}
