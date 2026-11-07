import { useState, useEffect, useRef, useCallback } from "react";
import { formatTime } from "./ui.jsx";

// How fast the solver "executes" each move of its solution, in ms. The solver's
// finish time is therefore totalMoves × this cadence — a simple, deterministic
// target the human races against.
const SOLVER_MS_PER_MOVE = 260;

// ── Pure race logic (unit-tested) ──────────────────────────────────
// Returns "user" | "solver" | "tie" once both times are known, else null.
export function determineRaceResult(solverMs, userMs) {
  if (solverMs == null || userMs == null) return null;
  if (userMs < solverMs) return "user";
  if (solverMs < userMs) return "solver";
  return "tie";
}

export function solverTargetMs(totalMoves) {
  return Math.max(0, totalMoves) * SOLVER_MS_PER_MOVE;
}

// ── Component ───────────────────────────────────────────────────────
// A split-view "Race the Solver": the solver auto-plays its solution to
// completion against a clock on the left; the human runs a manual start/stop
// timer on the right and tries to beat it. Self-contained and tokenized.
export default function RaceMode({ solution, onClose }) {
  const totalMoves = solution?.totalMoves ?? solution?.steps?.length ?? 0;
  const target = solverTargetMs(totalMoves);

  // "idle" → "running" (both clocks live) → user stops → solver finishes → "done"
  const [raceState, setRaceState] = useState("idle");

  const [solverElapsed, setSolverElapsed] = useState(0);
  const [solverDone, setSolverDone] = useState(null); // ms when solver finished

  const [userElapsed, setUserElapsed] = useState(0);
  const [userRunning, setUserRunning] = useState(false);
  const [userDone, setUserDone] = useState(null); // ms when user stopped

  const rafRef = useRef(null);
  const startRef = useRef(0);
  const userStartRef = useRef(0);
  const userRunningRef = useRef(false);
  const solverFinishedRef = useRef(false);

  const tick = useCallback(() => {
    const now = performance.now();

    // Solver clock — stops the instant it reaches its target.
    if (!solverFinishedRef.current) {
      const e = now - startRef.current;
      if (e >= target) {
        solverFinishedRef.current = true;
        setSolverElapsed(target);
        setSolverDone(target);
      } else {
        setSolverElapsed(e);
      }
    }

    // User clock — runs only while the human hasn't stopped.
    if (userRunningRef.current) {
      setUserElapsed(now - userStartRef.current);
    }

    // Keep ticking until both sides have settled.
    if (!solverFinishedRef.current || userRunningRef.current) {
      rafRef.current = requestAnimationFrame(tick);
    } else {
      rafRef.current = null;
    }
  }, [target]);

  const startRace = useCallback(() => {
    const now = performance.now();
    startRef.current = now;
    userStartRef.current = now;
    solverFinishedRef.current = false;
    userRunningRef.current = true;
    setSolverElapsed(0);
    setSolverDone(null);
    setUserElapsed(0);
    setUserDone(null);
    setUserRunning(true);
    setRaceState("running");
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(tick);
  }, [tick]);

  const stopUser = useCallback(() => {
    if (!userRunningRef.current) return;
    const finalMs = performance.now() - userStartRef.current;
    userRunningRef.current = false;
    setUserRunning(false);
    setUserElapsed(finalMs);
    setUserDone(finalMs);
  }, []);

  const resetRace = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    solverFinishedRef.current = false;
    userRunningRef.current = false;
    setRaceState("idle");
    setSolverElapsed(0);
    setSolverDone(null);
    setUserElapsed(0);
    setUserRunning(false);
    setUserDone(null);
  }, []);

  // When both the solver has finished and the user has stopped, the race is done.
  useEffect(() => {
    if (raceState === "running" && solverDone != null && userDone != null) {
      setRaceState("done");
    }
  }, [raceState, solverDone, userDone]);

  // Cleanup any pending frame on unmount.
  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const result = determineRaceResult(solverDone, userDone);
  const solverMovesDone = Math.min(
    totalMoves,
    Math.floor((solverDone != null ? target : solverElapsed) / SOLVER_MS_PER_MOVE),
  );

  const resultText =
    result === "user"
      ? "🏆 YOU WIN!"
      : result === "solver"
        ? "🤖 SOLVER WINS"
        : result === "tie"
          ? "🤝 DEAD HEAT"
          : "";
  const resultColor =
    result === "user" ? "var(--green)" : result === "solver" ? "var(--red)" : "var(--accent)";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Race the Solver"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 2000,
        background: "rgba(3,3,9,0.92)",
        backdropFilter: "blur(4px)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px 16px",
        fontFamily: "var(--font-sans)",
      }}
    >
      <div style={{ width: "100%", maxWidth: 560, animation: "up .35s ease" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 18,
          }}
        >
          <div style={{ fontSize: 13, letterSpacing: 2, fontWeight: 900, color: "var(--accent)" }}>
            ⚡ RACE THE SOLVER
          </div>
          <button
            onClick={onClose}
            aria-label="Close race mode"
            style={{
              background: "transparent",
              border: "1px solid var(--border)",
              borderRadius: "var(--r-2)",
              color: "#888",
              padding: "6px 12px",
              fontFamily: "var(--font-sans)",
              fontSize: 12,
              letterSpacing: 1,
              cursor: "pointer",
            }}
          >
            ✕ CLOSE
          </button>
        </div>

        {/* Split view */}
        <div style={{ display: "flex", gap: 12, marginBottom: 18 }}>
          {/* Solver side */}
          <section
            aria-label="Solver"
            style={{
              flex: 1,
              background: "var(--surface)",
              border: `1px solid ${solverDone != null ? "var(--red)" : "var(--border)"}`,
              borderRadius: "var(--r-5)",
              padding: "18px 14px",
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: 11, letterSpacing: 1, color: "#777", marginBottom: 10 }}>
              🤖 SOLVER
            </div>
            <div
              data-testid="solver-clock"
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "1.8rem",
                fontWeight: 900,
                color: solverDone != null ? "var(--red)" : "#fff",
              }}
            >
              {formatTime(Math.round(solverElapsed))}
            </div>
            <div style={{ fontSize: 11, color: "#555", letterSpacing: 1, marginTop: 8 }}>
              {solverMovesDone} / {totalMoves} MOVES
            </div>
            <div
              data-testid="solver-status"
              style={{
                fontSize: 11,
                letterSpacing: 1,
                marginTop: 6,
                color: solverDone != null ? "var(--red)" : "#444",
              }}
            >
              {solverDone != null ? "FINISHED" : raceState === "running" ? "SOLVING…" : "READY"}
            </div>
          </section>

          {/* User side */}
          <section
            aria-label="You"
            style={{
              flex: 1,
              background: "var(--surface)",
              border: `1px solid ${userDone != null ? "var(--green)" : "var(--border)"}`,
              borderRadius: "var(--r-5)",
              padding: "18px 14px",
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: 11, letterSpacing: 1, color: "#777", marginBottom: 10 }}>
              🧑 YOU
            </div>
            <div
              data-testid="user-clock"
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "1.8rem",
                fontWeight: 900,
                color: userDone != null ? "var(--green)" : "#fff",
              }}
            >
              {formatTime(Math.round(userElapsed))}
            </div>
            <div
              data-testid="user-status"
              style={{
                fontSize: 11,
                letterSpacing: 1,
                marginTop: 8,
                color: userDone != null ? "var(--green)" : "#444",
              }}
            >
              {userDone != null ? "STOPPED" : userRunning ? "RUNNING…" : "READY"}
            </div>
          </section>
        </div>

        {/* Controls */}
        <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
          {raceState === "idle" && (
            <button
              onClick={startRace}
              style={{
                background: "linear-gradient(135deg,var(--accent-2),var(--accent))",
                border: "none",
                borderRadius: "var(--r-3)",
                color: "#000",
                fontFamily: "var(--font-sans)",
                fontWeight: 900,
                fontSize: 14,
                letterSpacing: 1,
                padding: "12px 28px",
                cursor: "pointer",
              }}
            >
              ▶ START RACE
            </button>
          )}

          {raceState === "running" && (
            <button
              onClick={stopUser}
              disabled={userDone != null}
              style={{
                background: userDone != null ? "var(--border)" : "var(--green)",
                border: "none",
                borderRadius: "var(--r-3)",
                color: "#fff",
                fontFamily: "var(--font-sans)",
                fontWeight: 900,
                fontSize: 14,
                letterSpacing: 1,
                padding: "12px 28px",
                cursor: userDone != null ? "default" : "pointer",
              }}
            >
              ⏹ STOP MY TIMER
            </button>
          )}

          {raceState === "done" && (
            <button
              onClick={resetRace}
              style={{
                background: "transparent",
                border: "1px solid var(--border)",
                borderRadius: "var(--r-3)",
                color: "#888",
                fontFamily: "var(--font-sans)",
                fontWeight: 700,
                fontSize: 13,
                letterSpacing: 1,
                padding: "12px 28px",
                cursor: "pointer",
              }}
            >
              ↻ RACE AGAIN
            </button>
          )}
        </div>

        {/* Result banner */}
        {raceState === "done" && (
          <div
            data-testid="race-result"
            role="status"
            style={{
              marginTop: 18,
              textAlign: "center",
              background: "var(--surface-2)",
              border: `1px solid ${resultColor}`,
              borderRadius: "var(--r-5)",
              padding: "16px",
              animation: "up .3s ease",
            }}
          >
            <div style={{ fontSize: "1.3rem", fontWeight: 900, color: resultColor, letterSpacing: 1 }}>
              {resultText}
            </div>
            <div style={{ fontSize: 12, color: "#888", letterSpacing: 1, marginTop: 8 }}>
              You {formatTime(Math.round(userDone))} · Solver {formatTime(Math.round(solverDone))}
            </div>
          </div>
        )}

        {raceState === "idle" && (
          <p
            style={{
              marginTop: 18,
              textAlign: "center",
              fontSize: 12,
              color: "#555",
              lineHeight: 1.7,
            }}
          >
            The solver will execute all {totalMoves} moves (~{formatTime(target)}). Start the race,
            solve your real cube, and hit stop the instant you finish to see if you beat it.
          </p>
        )}
      </div>
    </div>
  );
}
