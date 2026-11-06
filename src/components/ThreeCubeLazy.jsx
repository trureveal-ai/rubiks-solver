import React, { Suspense } from "react";

// ── Lazy-loaded 3D cube ───────────────────────────────────────────────────────
// Three.js (three + @react-three/fiber + drei) is ~1MB and only needed for the
// WebGL view. React.lazy + a dynamic import() keep it OUT of the main bundle:
// the browser fetches the Three chunk on demand the first time a cube is shown.
//
// IMPORTANT: this module must NOT statically import ThreeCube.jsx (doing so would
// pull three back into the main chunk and defeat the split). Everything from
// ThreeCube.jsx is reached through the dynamic import() below only.
const ThreeCube = React.lazy(() => import("./ThreeCube.jsx"));

// Lightweight placeholder shown while the Three chunk downloads. Mirrors the
// NoWebGL box style from ui.jsx (design tokens, Inter) so it sits cleanly in the
// same slot without importing three.
function ThreeCubeFallback({ width, height }) {
  return (
    <div style={{width,height,background:"var(--bg)",borderRadius:12,display:"flex",
      alignItems:"center",justifyContent:"center",color:"#666",
      fontFamily:"var(--font-sans)",fontSize:11,letterSpacing:1,textAlign:"center",padding:20,
      border:"1px solid var(--border)"}}>
      Loading 3D view…
    </div>
  );
}

export default function ThreeCubeLazy(props) {
  return (
    <Suspense fallback={<ThreeCubeFallback width={props.width} height={props.height} />}>
      <ThreeCube {...props} />
    </Suspense>
  );
}

// ── Three-free constant mirrors ───────────────────────────────────────────────
// CAMERA_PRESETS and MOVE_ANIM are plain data (no three dependency) but they live
// in ThreeCube.jsx, which statically imports three. Non-lazy consumers
// (useAnimation.js, SolutionPanel.jsx) need them synchronously, so they import
// from HERE instead of ThreeCube.jsx — keeping three fully inside the lazy chunk.
//
// KEEP IN SYNC with the exports of the same names in ThreeCube.jsx. These are the
// authoritative copies for everything outside the lazy 3D component; ThreeCube.jsx
// keeps its own copies for its internal rendering/animation.
const H = Math.PI / 2;
export const MOVE_ANIM = {
  "U":  { axis: "y", layer:  1, angle: -H          },
  "U'": { axis: "y", layer:  1, angle:  H          },
  "U2": { axis: "y", layer:  1, angle: -Math.PI    },
  "D":  { axis: "y", layer: -1, angle:  H          },
  "D'": { axis: "y", layer: -1, angle: -H          },
  "D2": { axis: "y", layer: -1, angle:  Math.PI    },
  "R":  { axis: "x", layer:  1, angle: -H          },
  "R'": { axis: "x", layer:  1, angle:  H          },
  "R2": { axis: "x", layer:  1, angle: -Math.PI    },
  "L":  { axis: "x", layer: -1, angle:  H          },
  "L'": { axis: "x", layer: -1, angle: -H          },
  "L2": { axis: "x", layer: -1, angle:  Math.PI    },
  "F":  { axis: "z", layer:  1, angle: -H          },
  "F'": { axis: "z", layer:  1, angle:  H          },
  "F2": { axis: "z", layer:  1, angle: -Math.PI    },
  "B":  { axis: "z", layer: -1, angle:  H          },
  "B'": { axis: "z", layer: -1, angle: -H          },
  "B2": { axis: "z", layer: -1, angle:  Math.PI    },
};

export const CAMERA_PRESETS = {
  default:    { pos: [3.5, 2.8, 6.5],  label: "⬡",  name: "Default" },
  front:      { pos: [0, 0, 8],        label: "F",   name: "Front" },
  top:        { pos: [0, 8, 0.01],     label: "T",   name: "Top" },
  right:      { pos: [8, 0, 0],        label: "R",   name: "Right" },
  back:       { pos: [0, 0, -8],       label: "B",   name: "Back" },
  isometric:  { pos: [5, 5, 5],        label: "◇",  name: "Isometric" },
};
