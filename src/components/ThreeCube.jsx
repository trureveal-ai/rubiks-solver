import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { useMemo, useState, useRef, useEffect } from "react";
import { C } from "../engine/cube.js";

// Axis / face mapping (matches cube.js orientation):
//   U = +Y,  D = -Y,  F = +Z,  B = -Z,  R = +X,  L = -X

const FACE_NORMAL = {
  U: [0,  1,  0],
  D: [0, -1,  0],
  F: [0,  0,  1],
  B: [0,  0, -1],
  R: [1,  0,  0],
  L: [-1, 0,  0],
};

const FACE_META = {
  U: { rt: [1,0,0], ut: [0,0,-1], fixed:  1 },
  D: { rt: [1,0,0], ut: [0,0, 1], fixed: -1 },
  F: { rt: [1,0,0], ut: [0,1, 0], fixed:  1 },
  B: { rt:[-1,0,0], ut: [0,1, 0], fixed: -1 },
  R: { rt:[0,0,-1], ut: [0,1, 0], fixed:  1 },
  L: { rt:[0,0, 1], ut: [0,1, 0], fixed: -1 },
};

// ── Move → rotation params ──────────────────────────────────────────────────
// Derived by tracing cube.js apply* functions against Three.js rotation axes.
// Positive-layer (y=1, x=1, z=1) CW moves rotate at -π/2 around their axis;
// negative-layer (y=-1, x=-1, z=-1) CW moves rotate at +π/2.
// Prime = negated angle. Double = same sign at π.
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

// ── Helpers ─────────────────────────────────────────────────────────────────
function hexToNum(hex) {
  return parseInt(hex.replace("#", ""), 16);
}

const PLASTIC  = 0x111111;
const GAP      = 1.04;
const DURATION = 0.4;
const AXIS_IDX = { x: 0, y: 1, z: 2 };

function buildStickerMap(cube) {
  const map = {};
  for (const [fk, stickers] of Object.entries(cube)) {
    const { rt, ut, fixed } = FACE_META[fk];
    const normal = FACE_NORMAL[fk];
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 3; col++) {
        const tc = col - 1;
        const tr = 1 - row;
        const x = normal[0] !== 0 ? fixed : rt[0] * tc + ut[0] * tr;
        const y = normal[1] !== 0 ? fixed : rt[1] * tc + ut[1] * tr;
        const z = normal[2] !== 0 ? fixed : rt[2] * tc + ut[2] * tr;
        const key = `${fk}|${Math.round(x)}|${Math.round(y)}|${Math.round(z)}`;
        map[key] = C[stickers[row * 3 + col]] ?? "#1a1a1a";
      }
    }
  }
  return map;
}

// ── Cubie ────────────────────────────────────────────────────────────────────
function Cubie({ cx, cy, cz, stickerMap }) {
  const faces = useMemo(() => {
    const FACES = [
      { fk: "R", pos: [ 0.5, 0, 0], rot: [0,  Math.PI / 2, 0] },
      { fk: "L", pos: [-0.5, 0, 0], rot: [0, -Math.PI / 2, 0] },
      { fk: "U", pos: [0,  0.5, 0], rot: [-Math.PI / 2, 0, 0] },
      { fk: "D", pos: [0, -0.5, 0], rot: [ Math.PI / 2, 0, 0] },
      { fk: "F", pos: [0, 0,  0.5], rot: [0, 0, 0]             },
      { fk: "B", pos: [0, 0, -0.5], rot: [0, Math.PI, 0]       },
    ];
    return FACES.map(({ fk, pos, rot }) => {
      const normal = FACE_NORMAL[fk];
      const onSurface =
        (normal[0] !== 0 && Math.round(cx) === normal[0]) ||
        (normal[1] !== 0 && Math.round(cy) === normal[1]) ||
        (normal[2] !== 0 && Math.round(cz) === normal[2]);
      const key = `${fk}|${Math.round(cx)}|${Math.round(cy)}|${Math.round(cz)}`;
      const color = onSurface ? hexToNum(stickerMap[key] ?? "#1a1a1a") : PLASTIC;
      return { pos, rot, color };
    });
  }, [cx, cy, cz, stickerMap]);

  return (
    <group position={[cx * GAP, cy * GAP, cz * GAP]}>
      <mesh>
        <boxGeometry args={[0.92, 0.92, 0.92]} />
        <meshStandardMaterial color={PLASTIC} />
      </mesh>
      {faces.map(({ pos, rot, color }, i) => (
        <mesh key={i} position={pos} rotation={rot}>
          <planeGeometry args={[0.82, 0.82]} />
          <meshStandardMaterial color={color} roughness={0.35} metalness={0.05} />
        </mesh>
      ))}
    </group>
  );
}

// All 26 outer cubies (skip center [0,0,0])
const POSITIONS = [];
for (let x = -1; x <= 1; x++)
  for (let y = -1; y <= 1; y++)
    for (let z = -1; z <= 1; z++)
      if (x !== 0 || y !== 0 || z !== 0)
        POSITIONS.push([x, y, z]);

// ── CubeScene (must live inside <Canvas> to use useFrame) ───────────────────
function CubeScene({ stickerMap, animating, onDone }) {
  const layerGroupRef = useRef();
  const elapsedRef    = useRef(0);

  const { layerPos, restPos } = useMemo(() => {
    if (!animating) return { layerPos: [], restPos: POSITIONS };
    const ai = AXIS_IDX[animating.axis];
    return {
      layerPos: POSITIONS.filter(p => p[ai] === animating.layer),
      restPos:  POSITIONS.filter(p => p[ai] !== animating.layer),
    };
  }, [animating]);

  // Reset group rotation and elapsed whenever a new animation is queued
  useEffect(() => {
    elapsedRef.current = 0;
    if (layerGroupRef.current) layerGroupRef.current.rotation.set(0, 0, 0);
  }, [animating]);

  useFrame((_, delta) => {
    if (!animating || !layerGroupRef.current) return;
    if (elapsedRef.current >= DURATION) return; // already finished

    elapsedRef.current += delta;
    const t = Math.min(elapsedRef.current / DURATION, 1);
    layerGroupRef.current.rotation[animating.axis] = t * animating.angle;

    if (elapsedRef.current >= DURATION) onDone?.();
  });

  return (
    <>
      {restPos.map(([x, y, z]) => (
        <Cubie key={`${x}|${y}|${z}`} cx={x} cy={y} cz={z} stickerMap={stickerMap} />
      ))}
      <group ref={layerGroupRef}>
        {layerPos.map(([x, y, z]) => (
          <Cubie key={`${x}|${y}|${z}`} cx={x} cy={y} cz={z} stickerMap={stickerMap} />
        ))}
      </group>

      <OrbitControls
        enabled={!animating}
        enablePan={false}
        enableZoom={false}
        rotateSpeed={0.7}
      />
    </>
  );
}

// ── Public component ─────────────────────────────────────────────────────────
const TEST_MOVES = ["U", "R", "F", "D", "L", "B"];

export default function ThreeCube({ cube, width = 340, height = 340, onAnimationDone }) {
  const stickerMap = useMemo(() => buildStickerMap(cube), [cube]);
  const [animating, setAnimating] = useState(null);

  const handleDone = () => {
    setAnimating(null);
    onAnimationDone?.();
  };

  return (
    <div style={{ width, height, background: "#07070f", borderRadius: 12 }}>
      <Canvas
        camera={{ position: [3.5, 2.8, 6.5], fov: 42 }}
        style={{ borderRadius: 12 }}
      >
        <ambientLight intensity={0.55} />
        <directionalLight position={[5, 8, 5]} intensity={0.9} />
        <directionalLight position={[-4, -4, -4]} intensity={0.2} />

        <CubeScene
          stickerMap={stickerMap}
          animating={animating}
          onDone={handleDone}
        />
      </Canvas>

      {/* Test buttons — one per face */}
      <div style={{ display: "flex", gap: 4, justifyContent: "center", marginTop: 8 }}>
        {TEST_MOVES.map(move => (
          <button
            key={move}
            disabled={!!animating}
            onClick={() => setAnimating(MOVE_ANIM[move])}
            style={{
              padding: "4px 10px",
              background: "#1a1a2e",
              border: "1px solid #FFD60044",
              borderRadius: 5,
              color: animating ? "#333" : "#FFD600",
              fontFamily: "'Courier New',monospace",
              fontSize: 11,
              cursor: animating ? "default" : "pointer",
            }}
          >
            {move}
          </button>
        ))}
      </div>
    </div>
  );
}
