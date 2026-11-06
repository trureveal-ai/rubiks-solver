import { formatTime } from "./ui.jsx";

// Session statistics tracked across solves: best, mean, solve count, WCA-style
// ao5 / ao12, and a small recent-trend sparkline. Times use the sans UI font —
// monospace is reserved for move notation only.
function Stat({ label, value, color = "#fff", title }) {
  return (
    <div title={title}>
      <div style={{ fontSize: 11, color: "#555", letterSpacing: 1 }}>{label}</div>
      <div style={{ fontSize: "0.95rem", fontWeight: 900, color }}>{value}</div>
    </div>
  );
}

export default function TimerStats({ stats }) {
  const count = stats?.count ?? 0;

  const card = {
    background: "var(--surface)",
    border: "1px solid var(--border)",
    borderRadius: 12,
    padding: "12px 16px",
    marginBottom: 14,
  };

  if (!count) {
    return (
      <div style={card} role="region" aria-label="Session statistics">
        <div style={{ fontSize: 11, color: "#555", letterSpacing: 1, marginBottom: 8 }}>◈ SESSION STATS</div>
        <div style={{ fontSize: "0.82rem", color: "#444", lineHeight: 1.6 }}>
          Solve a cube to start tracking session stats.
        </div>
      </div>
    );
  }

  const { best, mean, ao5, ao12, last, prev, trend = [] } = stats;

  // Recent-trend direction: a faster (lower) time than the previous solve is an
  // improvement (green ▼); a slower time regresses (red ▲).
  let trendLabel = null;
  let trendColor = "#888";
  if (prev != null && last != null) {
    if (last < prev) { trendLabel = "▼ FASTER"; trendColor = "var(--green)"; }
    else if (last > prev) { trendLabel = "▲ SLOWER"; trendColor = "var(--red)"; }
    else { trendLabel = "— EVEN"; trendColor = "#888"; }
  }

  const trendMax = trend.length ? Math.max(...trend) : 1;

  return (
    <div style={card} role="region" aria-label="Session statistics">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <div style={{ fontSize: 11, color: "#555", letterSpacing: 1 }}>◈ SESSION STATS</div>
        {trendLabel && (
          <div style={{ fontSize: 10, letterSpacing: 1, color: trendColor }} title="Latest solve vs. the previous one">{trendLabel}</div>
        )}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "10px 16px" }}>
        <Stat label="BEST" value={formatTime(best)} color="var(--green)" title="Fastest solve this session" />
        <Stat label="MEAN" value={formatTime(mean)} color="var(--accent)" title="Average of all solves" />
        <Stat label="SOLVES" value={count} color="#fff" title="Total solves recorded" />
        <Stat label="Ao5" value={ao5 != null ? formatTime(ao5) : "—"} color={ao5 != null ? "#fff" : "#444"} title="Average of 5 (best & worst trimmed)" />
        <Stat label="Ao12" value={ao12 != null ? formatTime(ao12) : "—"} color={ao12 != null ? "#fff" : "#444"} title="Average of 12 (best & worst trimmed)" />
        <Stat label="LAST" value={formatTime(last)} color="#888" title="Most recent solve" />
      </div>

      {trend.length > 1 && (
        <div style={{ marginTop: 12 }}>
          <div style={{ fontSize: 11, color: "#555", letterSpacing: 1, marginBottom: 6 }}>RECENT</div>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 3, height: 26 }} aria-hidden="true">
            {trend.map((t, i) => (
              <div
                key={i}
                title={formatTime(t)}
                style={{
                  flex: 1,
                  minWidth: 4,
                  height: `${Math.max(12, Math.round((t / trendMax) * 100))}%`,
                  background: t === best ? "var(--green)" : i === trend.length - 1 ? "var(--accent)" : "var(--border-2)",
                  borderRadius: 2,
                  transition: "height .3s ease",
                }}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
