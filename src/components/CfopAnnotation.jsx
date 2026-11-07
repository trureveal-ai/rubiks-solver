import { MOVE_DESC } from "../engine/cube.js";

// Renders the CFOP-style annotation of the Kociemba solution.
// `data` is the object returned by cfopAnnotate():
//   { groups, totalMoves, phaseBoundary, isApproximate, disclaimer }

function MoveList({ moves, color }) {
  if (!moves.length) return null;
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

export default function CfopAnnotation({ data }) {
  if (!data || !data.groups) {
    return (
      <div style={{ background: "var(--err-bg)", border: "1px solid var(--err-border)", borderRadius: 12, padding: "14px 16px", color: "var(--err)", fontSize: "0.85rem" }}>
        No CFOP-style annotation available for this solution.
      </div>
    );
  }

  return (
    <div style={{ animation: "up .35s ease" }}>
      {/* Honest-framing banner */}
      <div style={{ background: "var(--ok-bg)", border: "1px solid var(--ok-border)", borderRadius: 12, padding: "12px 16px", marginBottom: 14 }}>
        <div style={{ fontSize: 11, color: "#555", letterSpacing: 1, marginBottom: 8 }}>◈ CFOP-STYLE BREAKDOWN</div>
        <div style={{ fontSize: 11, color: "var(--tip)", letterSpacing: 0.3, lineHeight: 1.65 }}>
          ⚠ {data.disclaimer}
        </div>
      </div>

      {/* Phase groups */}
      {data.groups.map((g, i) => (
        <div key={i} style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 12, padding: "14px 16px", marginBottom: 12 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8, marginBottom: 6 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
              {g.cfopPhases.map((p) => (
                <span key={p} style={{ padding: "4px 12px", borderRadius: 16, background: g.color + "1f", border: `1px solid ${g.color}55`, fontSize: 11, letterSpacing: 1, color: g.color, fontWeight: 700 }}>
                  {p.toUpperCase()}
                </span>
              ))}
            </div>
            <span style={{ fontSize: 11, color: "#555", letterSpacing: 1 }}>{g.moveCount} {g.moveCount === 1 ? "move" : "moves"}</span>
          </div>
          <div style={{ fontSize: 10, color: "#3a3a3a", letterSpacing: 0.5, marginBottom: 10 }}>{g.source}</div>
          <p style={{ color: "#999", lineHeight: 1.7, margin: "0 0 12px", fontSize: "0.82rem" }}>{g.explain}</p>
          <MoveList moves={g.moves} color={g.color} />
        </div>
      ))}
    </div>
  );
}
