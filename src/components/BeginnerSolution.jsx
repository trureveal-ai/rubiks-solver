import { MOVE_DESC } from "../engine/cube.js";

// Renders the beginner Layer-By-Layer solution as named human stages.
// `data` is the object returned by solveBeginner(): { stages, totalMoves, moves, note }
// or { error } if the solve could not be produced.

const STAGE_COLORS = [
  "var(--green)",   // White Cross
  "#8ec07c",        // White Corners
  "var(--blue)",    // Middle-Layer Edges
  "var(--accent)",  // Yellow Cross
  "var(--orange)",  // Orient Last Layer
  "var(--accent-2)",// Permute Last Layer
];

function MoveList({ moves, color }) {
  if (!moves.length) {
    return <div style={{ fontSize: "0.82rem", color: "#444", fontStyle: "italic" }}>Already solved — no moves needed.</div>;
  }
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
      {moves.map((m, i) => (
        <span key={i} title={MOVE_DESC[m] || m} style={{
          fontFamily: "var(--font-mono)", fontWeight: 900, fontSize: "0.82rem", letterSpacing: 1,
          color, background: "var(--surface-2)", border: "1px solid var(--border)", borderRadius: 4,
          padding: "3px 7px", minWidth: 26, textAlign: "center",
        }}>{m}</span>
      ))}
    </div>
  );
}

export default function BeginnerSolution({ data }) {
  if (!data || data.error) {
    return (
      <div style={{ background: "var(--err-bg)", border: "1px solid var(--err-border)", borderRadius: 12, padding: "14px 16px", color: "var(--err)", fontSize: "0.85rem", lineHeight: 1.6 }}>
        Could not build a beginner solution for this cube{data?.error ? ` (${data.error})` : ""}.
      </div>
    );
  }

  return (
    <div style={{ animation: "up .35s ease" }}>
      {/* Summary */}
      <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: "12px 16px", marginBottom: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: 8 }}>
          <div style={{ fontSize: 11, color: "#555", letterSpacing: 1 }}>◈ BEGINNER · LAYER-BY-LAYER</div>
          <div style={{ fontSize: "0.9rem", fontWeight: 900, color: "var(--accent)" }}>{data.totalMoves} moves</div>
        </div>
        <div style={{ fontSize: 11, color: "#2a2a2a", letterSpacing: 0.5, marginTop: 8, lineHeight: 1.6 }}>
          The way a person learns to solve by hand — six named stages. Longer than the optimal Kociemba
          solution above, but every step is easy to follow.
        </div>
      </div>

      {/* Stages */}
      {data.stages.map((stage, i) => {
        const color = STAGE_COLORS[i] || "var(--accent)";
        return (
          <div key={i} style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: "14px 16px", marginBottom: 12 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 11, fontWeight: 900, color, letterSpacing: 1, width: 18, textAlign: "center" }}>{i + 1}</span>
                <span style={{ padding: "4px 12px", borderRadius: 16, background: color + "18", border: `1px solid ${color}44`, fontSize: 11, letterSpacing: 1, color, fontWeight: 700 }}>
                  {stage.name.toUpperCase()}
                </span>
              </div>
              <span style={{ fontSize: 11, color: "#555", letterSpacing: 1 }}>{stage.moveCount} {stage.moveCount === 1 ? "move" : "moves"}</span>
            </div>
            <p style={{ color: "#999", lineHeight: 1.7, margin: "0 0 12px", fontSize: "0.82rem" }}>{stage.explain}</p>
            <MoveList moves={stage.moves} color={color} />
          </div>
        );
      })}

      {data.note && (
        <div style={{ fontSize: 11, color: "#2a2a2a", letterSpacing: 0.5, lineHeight: 1.6, padding: "2px 4px 4px" }}>
          💡 {data.note}
        </div>
      )}
    </div>
  );
}
