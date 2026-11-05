// Small presentational helpers shared across panels.

export function NoWebGL({ width, height }) {
  return (
    <div style={{width,height,background:"var(--bg)",borderRadius:12,display:"flex",
      alignItems:"center",justifyContent:"center",color:"#666",
      fontFamily:"var(--font-sans)",fontSize:11,textAlign:"center",padding:20,
      border:"1px solid var(--border)"}}>
      3D view requires WebGL<br/>Try Chrome or enable WebGL in your browser
    </div>
  );
}

// ── Toast notification ──────────────────────────────────────────
export function Toast({ message, visible }) {
  return (
    <div style={{
      position:"fixed", bottom:24, left:"50%", transform:`translateX(-50%) translateY(${visible?0:20}px)`,
      background:"var(--green)", color:"#fff", padding:"10px 24px", borderRadius:8,
      fontFamily:"var(--font-sans)", fontSize:11, letterSpacing:1,
      opacity:visible?1:0, transition:"all .3s ease", pointerEvents:"none",
      zIndex:1000, boxShadow:"0 4px 20px rgba(0,0,0,.5)",
    }}>
      {message}
    </div>
  );
}

// ── Circular progress ring ──────────────────────────────────────
export function ProgressRing({ pct, size=56, stroke=4, color="var(--accent)" }) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;
  return (
    <svg width={size} height={size} style={{transform:"rotate(-90deg)"}}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="var(--border)" strokeWidth={stroke}/>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={stroke}
        strokeDasharray={circ} strokeDashoffset={offset}
        strokeLinecap="round" style={{transition:"stroke-dashoffset .4s ease"}}/>
    </svg>
  );
}

// Format milliseconds to human-readable
export function formatTime(ms) {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.floor(ms / 60000)}m ${Math.round((ms % 60000) / 1000)}s`;
}

// Detect WebGL support once at startup
export const hasWebGL = (() => {
  try {
    const c = document.createElement("canvas");
    return !!(c.getContext("webgl2") || c.getContext("webgl") || c.getContext("experimental-webgl"));
  } catch { return false; }
})();
