import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { useMemo } from "react";
import { C } from "../engine/cube.js";

// Face index order within each face array: row-major, left→right, top→bottom
// Cubie positions: x ∈ {-1,0,1}, y ∈ {-1,0,1}, z ∈ {-1,0,1}
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

// For each face, map (col, row) within the 3×3 grid → sticker index in the
// face array.  col/row both run 0..2 from the perspective of looking straight
// at that face (left-to-right, top-to-bottom).
//
// We derive cubie [x,y,z] from the face normal and the two tangent axes below,
// then col/row select which of the 9 stickers belongs to that cubie.
const FACE_META = {
  //         right-tangent  up-tangent   fixed axis value
  U: { rt: [1,0,0], ut: [0,0,-1], fixed: 1  },  // looking down: +X right, -Z up
  D: { rt: [1,0,0], ut: [0,0, 1], fixed: -1 },  // looking up  : +X right, +Z up
  F: { rt: [1,0,0], ut: [0,1, 0], fixed:  1 },  // looking from front: +X right, +Y up
  B: { rt:[-1,0,0], ut: [0,1, 0], fixed: -1 },  // looking from back (mirrored X)
  R: { rt:[0,0,-1], ut: [0,1, 0], fixed:  1 },
  L: { rt:[0,0, 1], ut: [0,1, 0], fixed: -1 },
};

// Convert hex color string to a number Three.js can use
function hexToNum(hex) {
  return parseInt(hex.replace("#", ""), 16);
}

// Black plastic color for cubie body / hidden faces
const PLASTIC = 0x111111;

// Build a lookup: "faceKey-x-y-z" → hex color string
function buildStickerMap(cube) {
  const map = {};
  for (const [fk, stickers] of Object.entries(cube)) {
    const { rt, ut, fixed } = FACE_META[fk];
    const normal = FACE_NORMAL[fk];
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 3; col++) {
        // col 0,1,2 → tangent offset -1,0,1
        const tc = col - 1;
        const tr = 1 - row; // row 0 is top → +1

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

// A single cubie at grid position [cx, cy, cz].
// Renders 6 planes — one per face — colored from the sticker map or black.
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
      // Only show a sticker on faces that are on the outer surface
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

  const GAP = 1.04; // slight gap between cubies

  return (
    <group position={[cx * GAP, cy * GAP, cz * GAP]}>
      {/* Black cubie body */}
      <mesh>
        <boxGeometry args={[0.92, 0.92, 0.92]} />
        <meshStandardMaterial color={PLASTIC} />
      </mesh>

      {/* Sticker planes, sitting just above each face */}
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

export default function ThreeCube({ cube, width = 340, height = 340 }) {
  const stickerMap = useMemo(() => buildStickerMap(cube), [cube]);

  return (
    <div style={{ width, height, background: "#07070f", borderRadius: 12 }}>
      <Canvas
        camera={{ position: [3.5, 2.8, 6.5], fov: 42 }}
        style={{ borderRadius: 12 }}
      >
        {/* Dark-theme lighting */}
        <ambientLight intensity={0.55} />
        <directionalLight position={[5, 8, 5]} intensity={0.9} />
        <directionalLight position={[-4, -4, -4]} intensity={0.2} />

        {POSITIONS.map(([x, y, z]) => (
          <Cubie
            key={`${x}|${y}|${z}`}
            cx={x}
            cy={y}
            cz={z}
            stickerMap={stickerMap}
          />
        ))}

        <OrbitControls
          enablePan={false}
          enableZoom={false}
          rotateSpeed={0.7}
        />
      </Canvas>
    </div>
  );
}
