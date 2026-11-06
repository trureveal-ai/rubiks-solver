import { useEffect, useRef, useState } from "react";

// ── Solve celebration ─────────────────────────────────────────────────────────
// A lightweight, self-contained confetti burst that fires once on the rising
// edge of `active` (i.e. when the solve reaches 100%). Pure DOM + CSS keyframes
// so it never touches the WebGL canvas or the move-animation system. The overlay
// is pointer-transparent and auto-clears after the animation finishes.

const COLORS = ["#FFD600", "#FF6D00", "#2E7D32", "#1565C0", "#E65100", "#ffffff", "#C62828"];
const PIECES = 90;
const DURATION = 2600; // ms — must cover the longest piece fall + fade

function makePieces() {
  return Array.from({ length: PIECES }, (_, i) => {
    const left = Math.random() * 100;              // vw start
    const drift = (Math.random() - 0.5) * 220;     // horizontal drift px
    const delay = Math.random() * 350;             // staggered launch
    const dur = 1500 + Math.random() * 900;        // fall duration
    const rot = (Math.random() - 0.5) * 1080;      // spin
    const size = 6 + Math.random() * 8;
    const color = COLORS[i % COLORS.length];
    const round = Math.random() > 0.6;             // mix of squares + dots
    return { id: i, left, drift, delay, dur, rot, size, color, round };
  });
}

export default function Celebration({ active }) {
  const [burst, setBurst] = useState(null); // { key, pieces }
  const prevActive = useRef(false);
  const timerRef = useRef(null);
  const keyRef = useRef(0);

  useEffect(() => {
    if (active && !prevActive.current) {
      keyRef.current += 1;
      setBurst({ key: keyRef.current, pieces: makePieces() });
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setBurst(null), DURATION);
    }
    prevActive.current = active;
  }, [active]);

  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  if (!burst) return null;

  return (
    <div
      key={burst.key}
      aria-hidden="true"
      data-testid="celebration"
      style={{
        position: "fixed", inset: 0, overflow: "hidden",
        pointerEvents: "none", zIndex: 2000,
      }}
    >
      <style>{`
        @keyframes confetti-fall {
          0%   { transform: translate3d(0, -12vh, 0) rotate(0deg); opacity: 1; }
          85%  { opacity: 1; }
          100% { transform: translate3d(var(--cf-drift), 108vh, 0) rotate(var(--cf-rot)); opacity: 0; }
        }
      `}</style>
      {burst.pieces.map(p => (
        <span
          key={p.id}
          style={{
            position: "absolute",
            top: 0,
            left: `${p.left}vw`,
            width: p.size,
            height: p.round ? p.size : p.size * 0.45,
            background: p.color,
            borderRadius: p.round ? "50%" : 1,
            // custom props consumed by the keyframes
            "--cf-drift": `${p.drift}px`,
            "--cf-rot": `${p.rot}deg`,
            animation: `confetti-fall ${p.dur}ms cubic-bezier(.15,.6,.4,1) ${p.delay}ms forwards`,
            willChange: "transform, opacity",
          }}
        />
      ))}
    </div>
  );
}
