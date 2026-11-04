import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { useMemo, useState, useRef, useEffect, useCallback, useImperativeHandle, forwardRef, Component } from "react";
import * as THREE from "three";
import { C } from "../engine/cube.js";

// ── WebGL error boundary ────────────────────────────────────────────────────
class WebGLErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { failed: false }; }
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(err) { console.warn('[ThreeCube] WebGL unavailable:', err.message); }
  render() {
    if (this.state.failed) return (
      <div style={{display:'flex',alignItems:'center',justifyContent:'center',
        width:'100%',height:'100%',color:'#888',fontFamily:"'Courier New',monospace",
        fontSize:11,textAlign:'center',padding:20}}>
        3D view unavailable<br/>(WebGL not supported)
      </div>
    );
    return this.props.children;
  }
}

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

// ── Camera presets ──────────────────────────────────────────────────────────
export const CAMERA_PRESETS = {
  default:    { pos: [3.5, 2.8, 6.5],  label: "⬡",  name: "Default" },
  front:      { pos: [0, 0, 8],        label: "F",   name: "Front" },
  top:        { pos: [0, 8, 0.01],     label: "T",   name: "Top" },
  right:      { pos: [8, 0, 0],        label: "R",   name: "Right" },
  back:       { pos: [0, 0, -8],       label: "B",   name: "Back" },
  isometric:  { pos: [5, 5, 5],        label: "◇",  name: "Isometric" },
};

// ── Smooth camera controller ────────────────────────────────────────────────
function CameraController({ targetPos, controlsRef }) {
  const { camera } = useThree();
  const animRef = useRef(null);

  useEffect(() => {
    if (!targetPos) return;
    const start = camera.position.clone();
    const end = new THREE.Vector3(...targetPos);
    if (start.distanceTo(end) < 0.01) return;
    animRef.current = { start, end, t: 0 };
  }, [targetPos]); // eslint-disable-line react-hooks/exhaustive-deps

  useFrame((_, delta) => {
    if (!animRef.current) return;
    animRef.current.t = Math.min(animRef.current.t + delta * 3, 1);
    const eased = 1 - Math.pow(1 - animRef.current.t, 3);
    camera.position.lerpVectors(animRef.current.start, animRef.current.end, eased);
    camera.lookAt(0, 0, 0);
    controlsRef.current?.update();
    if (animRef.current.t >= 1) animRef.current = null;
  });

  return null;
}

// ── CubeScene (must live inside <Canvas> to use useFrame) ───────────────────
function CubeScene({ stickerMap, animating, onDone, duration, cameraTarget }) {
  const controlsRef = useRef();
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
    if (elapsedRef.current >= duration) return; // already finished

    elapsedRef.current += delta;
    const t = Math.min(elapsedRef.current / duration, 1);
    const eased = 1 - Math.pow(1 - t, 3);  // cubic ease-out
    layerGroupRef.current.rotation[animating.axis] = eased * animating.angle;

    if (elapsedRef.current >= duration) onDone?.();
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

      <CameraController targetPos={cameraTarget} controlsRef={controlsRef} />
      <OrbitControls
        ref={controlsRef}
        enabled={!animating}
        enablePan={false}
        enableZoom={false}
        rotateSpeed={0.7}
      />
    </>
  );
}

// ── Public component ─────────────────────────────────────────────────────────
export default function ThreeCube({ cube, width = 340, height = 340, animTrigger, onAnimationDone, animDuration = 0.4, cameraPreset = "default" }) {
  const stickerMap = useMemo(() => buildStickerMap(cube), [cube]);
  const [animating, setAnimating] = useState(null);
  const cameraTarget = useMemo(() => CAMERA_PRESETS[cameraPreset]?.pos || CAMERA_PRESETS.default.pos, [cameraPreset]);

  // External trigger: parent sets animTrigger={move, key} to kick off an animation.
  // key must change each call (even for repeated moves) so the effect fires.
  useEffect(() => {
    if (!animTrigger) return;
    const anim = MOVE_ANIM[animTrigger.move];
    if (anim) {
      setAnimating(anim);
    } else {
      // Move not in MOVE_ANIM (multi-move chunk etc.) — notify immediately
      onAnimationDone?.();
    }
  }, [animTrigger]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleDone = () => {
    setAnimating(null);
    onAnimationDone?.();
  };

  return (
    <div style={{ width, height, background: "#07070f", borderRadius: 12 }}>
      <WebGLErrorBoundary>
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
            duration={animDuration}
            cameraTarget={cameraTarget}
          />
        </Canvas>
      </WebGLErrorBoundary>
    </div>
  );
}
