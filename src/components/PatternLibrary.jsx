import { useState, useMemo } from "react";
import { C, initCube, applyMoveString } from "../engine/cube.js";
import { loadStored, saveStored } from "../hooks/persist.js";
import { PATTERNS } from "../data/patterns.js";

// Tiny flat "unfolded net" thumbnail for one cube state. Pure DOM/CSS —
// deliberately NOT a WebGL canvas, so a whole grid of these costs nothing
// and never hits the browser's live-context limit. Cross layout matches
// the paint screen: U on top, L F R B across the middle, D on the bottom.
function MiniNet({ cube }) {
  const cell = (face, i) => (
    <div
      key={face + i}
      style={{ width: 5, height: 5, background: C[cube[face][i]], borderRadius: 1 }}
    />
  );
  const faceGrid = (face) => (
    <div
      style={{
        gridArea: face,
        display: "grid",
        gridTemplateColumns: "repeat(3,5px)",
        gridTemplateRows: "repeat(3,5px)",
        gap: 1,
      }}
    >
      {cube[face].map((_, i) => cell(face, i))}
    </div>
  );
  return (
    <div
      aria-hidden="true"
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(4,auto)",
        gridTemplateAreas: `". U . ." "L F R B" ". D . ."`,
        gap: 2,
        justifyContent: "center",
      }}
    >
      {["U", "L", "F", "R", "B", "D"].map((f) => faceGrid(f))}
    </div>
  );
}

// Pattern library: one-click apply of classic pretty patterns. Clicking a
// tile rebuilds the cube by applying the pattern's move sequence from a
// SOLVED cube and pushes it into the shared cube state, so the existing
// main 3D view (and the flat net) update immediately. The move sequence is
// also dropped into the algorithm input so it can be re-applied / animated.
export default function PatternLibrary({ cs }) {
  const [open, setOpen] = useState(() => loadStored("patternsOpen", false));
  const [active, setActive] = useState(null);

  // Precompute each pattern's facelets once (cheap, from a solved cube).
  const nets = useMemo(
    () => PATTERNS.map((p) => applyMoveString(initCube(), p.moves)),
    []
  );

  const toggle = () => {
    setOpen((o) => {
      const next = !o;
      saveStored("patternsOpen", next);
      return next;
    });
  };

  const apply = (pattern) => {
    if (cs.scrambling || cs.animatingAlgo) return;
    cs.setCube(applyMoveString(initCube(), pattern.moves));
    cs.setAlgoInput(pattern.moves);
    setActive(pattern.name);
  };

  const busy = cs.scrambling || cs.animatingAlgo;

  return (
    <div
      style={{
        marginTop: 12,
        background: "var(--surface-2)",
        border: "1px solid var(--border)",
        borderRadius: 10,
        overflow: "hidden",
      }}
    >
      <button
        onClick={toggle}
        aria-expanded={open}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "11px 14px",
          background: "transparent",
          border: "none",
          cursor: "pointer",
          color: "#555",
          fontFamily: "var(--font-sans)",
          fontSize: 11,
          letterSpacing: 1,
          textAlign: "left",
        }}
      >
        <span style={{ transition: "transform .2s", transform: open ? "rotate(90deg)" : "none" }}>▸</span>
        <span>◆  PATTERN LIBRARY</span>
        <span style={{ marginLeft: "auto", color: "#333" }}>{PATTERNS.length}</span>
      </button>

      {open && (
        <div style={{ padding: "0 14px 14px" }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(118px, 1fr))",
              gap: 8,
            }}
          >
            {PATTERNS.map((p, i) => {
              const isActive = active === p.name;
              return (
                <button
                  key={p.name}
                  onClick={() => apply(p)}
                  disabled={busy}
                  title={p.blurb}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 7,
                    padding: "10px 8px",
                    background: "var(--surface)",
                    border: `1px solid ${isActive ? "var(--accent)" : "var(--border)"}`,
                    borderRadius: 8,
                    cursor: busy ? "default" : "pointer",
                    opacity: busy ? 0.5 : 1,
                    transition: "border-color .15s, transform .15s",
                    transform: isActive ? "translateY(-1px)" : "none",
                    boxShadow: isActive ? "0 0 10px #FFD60033" : "none",
                  }}
                >
                  <MiniNet cube={nets[i]} />
                  <div
                    style={{
                      fontFamily: "var(--font-sans)",
                      fontSize: 11,
                      fontWeight: 900,
                      letterSpacing: 0.5,
                      color: isActive ? "var(--accent)" : "#aaa",
                      textAlign: "center",
                      lineHeight: 1.15,
                    }}
                  >
                    {p.name}
                  </div>
                  <div
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: 9,
                      letterSpacing: 0.5,
                      color: "#555",
                      textAlign: "center",
                      lineHeight: 1.5,
                      overflowWrap: "anywhere",
                    }}
                  >
                    {p.moves}
                  </div>
                </button>
              );
            })}
          </div>
          <div style={{ fontSize: 10, color: "#3a3a3a", letterSpacing: 0.5, marginTop: 10, textAlign: "center" }}>
            Tap a pattern to apply it from a solved cube — view it in 3D + MOVES.
          </div>
        </div>
      )}
    </div>
  );
}
