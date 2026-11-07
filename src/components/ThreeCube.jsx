import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, RoundedBox, Environment, Lightformer } from "@react-three/drei";
import { useMemo, useState, useRef, useEffect, Component } from "react";
import * as THREE from "three";
import { C } from "../engine/cube.js";
import { loadStored, saveStored } from "../hooks/persist.js";

// ── WebGL error boundary ────────────────────────────────────────────────────
class WebGLErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { failed: false }; }
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(err) { console.warn('[ThreeCube] WebGL unavailable:', err.message); }
  render() {
    if (this.state.failed) return (
      <div style={{display:'flex',alignItems:'center',justifyContent:'center',
        width:'100%',height:'100%',color:'#888',fontFamily:"var(--font-sans)",
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

// Reusable rounded-rectangle sticker tile geometry (one instance shared by all
// sticker meshes). Real rounded corners via a Shape + a shallow bevelled extrude.
function makeStickerGeo(size = 0.76, radius = 0.12, depth = 0.03) {
  const s = new THREE.Shape();
  const w = size, r = radius, x = -w / 2, y = -w / 2;
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y);
  s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + w - r);
  s.quadraticCurveTo(x + w, y + w, x + w - r, y + w);
  s.lineTo(x + r, y + w);
  s.quadraticCurveTo(x, y + w, x, y + w - r);
  s.lineTo(x, y + r);
  s.quadraticCurveTo(x, y, x + r, y);
  const geo = new THREE.ExtrudeGeometry(s, {
    depth, bevelEnabled: true, bevelThickness: 0.012, bevelSize: 0.012, bevelSegments: 1, steps: 1,
  });
  geo.center();
  geo.computeVertexNormals();
  return geo;
}
const STICKER_GEO = makeStickerGeo();

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
        const letter = stickers[row * 3 + col];
        map[key] = { hex: C[letter] ?? "#1a1a1a", letter };
      }
    }
  }
  return map;
}

// ── #27 Color-blind sticker glyphs ──────────────────────────────────────────
// Each sticker can carry its color's initial (W/Y/R/O/B/G) as an unlit overlay
// so the face is distinguishable without relying on hue. Textures are drawn once
// to an offscreen canvas and cached by letter; meshBasicMaterial keeps them at
// constant brightness as the cube rotates. One shared plane geometry per glyph.
const GLYPH_GEO = new THREE.PlaneGeometry(0.5, 0.5);
const glyphTexCache = {};
function glyphColor(letter) {
  // Dark ink on light stickers (white/yellow), white ink on the rest.
  return letter === "W" || letter === "Y" ? "#141414" : "#ffffff";
}
function getGlyphTexture(letter) {
  if (letter in glyphTexCache) return glyphTexCache[letter];
  let tex = null;
  try {
    const S = 128;
    const cv = document.createElement("canvas");
    cv.width = cv.height = S;
    const ctx = cv.getContext("2d");
    ctx.clearRect(0, 0, S, S);
    ctx.fillStyle = glyphColor(letter);
    ctx.font = `bold ${Math.round(S * 0.72)}px Inter, Arial, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(letter, S / 2, S / 2 + S * 0.05);
    tex = new THREE.CanvasTexture(cv);
    tex.anisotropy = 4;
    tex.needsUpdate = true;
  } catch {
    tex = null; // canvas unavailable (very old/headless env) — skip overlays
  }
  glyphTexCache[letter] = tex;
  return tex;
}

// ── Cubie ────────────────────────────────────────────────────────────────────
// Sticker tiles sit at the cubie's flat face (surface at 0.46): their base is
// embedded in the solid plastic body and only the rounded/bevelled top shows,
// so each sticker reads as recessed. The smaller size (0.76 vs 0.92) leaves a
// plastic rim border around every sticker.
const STICKER_OFFSET = 0.45;
const STICKER_FACES = [
  { fk: "R", pos: [ STICKER_OFFSET, 0, 0], rot: [0,  Math.PI / 2, 0] },
  { fk: "L", pos: [-STICKER_OFFSET, 0, 0], rot: [0, -Math.PI / 2, 0] },
  { fk: "U", pos: [0,  STICKER_OFFSET, 0], rot: [-Math.PI / 2, 0, 0] },
  { fk: "D", pos: [0, -STICKER_OFFSET, 0], rot: [ Math.PI / 2, 0, 0] },
  { fk: "F", pos: [0, 0,  STICKER_OFFSET], rot: [0, 0, 0]             },
  { fk: "B", pos: [0, 0, -STICKER_OFFSET], rot: [0, Math.PI, 0]       },
];

function Cubie({ cx, cy, cz, stickerMap, colorBlind }) {
  // Only render sticker tiles on the faces that lie on the cube's outer surface.
  const stickers = useMemo(() => {
    return STICKER_FACES.map(({ fk, pos, rot }) => {
      const normal = FACE_NORMAL[fk];
      const onSurface =
        (normal[0] !== 0 && Math.round(cx) === normal[0]) ||
        (normal[1] !== 0 && Math.round(cy) === normal[1]) ||
        (normal[2] !== 0 && Math.round(cz) === normal[2]);
      if (!onSurface) return null;
      const key = `${fk}|${Math.round(cx)}|${Math.round(cy)}|${Math.round(cz)}`;
      const entry = stickerMap[key] ?? { hex: "#1a1a1a", letter: "" };
      const color = hexToNum(entry.hex);
      // Glyph plane sits just proud of the sticker's beveled top surface (which
      // reaches ~0.477 along the face axis) so the opaque sticker never hides it.
      const gpos = [
        pos[0] === 0 ? 0 : pos[0] + Math.sign(pos[0]) * 0.05,
        pos[1] === 0 ? 0 : pos[1] + Math.sign(pos[1]) * 0.05,
        pos[2] === 0 ? 0 : pos[2] + Math.sign(pos[2]) * 0.05,
      ];
      return { pos, rot, color, letter: entry.letter, gpos };
    }).filter(Boolean);
  }, [cx, cy, cz, stickerMap]);

  return (
    <group position={[cx * GAP, cy * GAP, cz * GAP]}>
      {/* #12 beveled cubie body */}
      <RoundedBox args={[0.92, 0.92, 0.92]} radius={0.075} smoothness={4} creaseAngle={0.4}>
        <meshStandardMaterial color={PLASTIC} roughness={0.55} metalness={0.1} envMapIntensity={0.5} />
      </RoundedBox>
      {/* #14 inset, rounded sticker tiles (shared geometry) */}
      {stickers.map(({ pos, rot, color }, i) => (
        <mesh key={i} position={pos} rotation={rot} geometry={STICKER_GEO}>
          <meshStandardMaterial color={color} roughness={0.28} metalness={0.0} envMapIntensity={0.9} />
        </mesh>
      ))}
      {/* #27 color-blind letter overlays (toggled; track the sticker through moves) */}
      {colorBlind && stickers.map(({ gpos, rot, letter }, i) => {
        const tex = getGlyphTexture(letter);
        if (!tex) return null;
        return (
          <mesh key={`g${i}`} position={gpos} rotation={rot} geometry={GLYPH_GEO} renderOrder={2}>
            <meshBasicMaterial map={tex} transparent toneMapped={false} depthWrite={false} />
          </mesh>
        );
      })}
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
// Animates to a preset position whenever targetPos changes OR resetNonce bumps
// (the Reset button). Reset also recenters the orbit target at the origin,
// which restores the framing after the user has zoomed or orbited.
function CameraController({ targetPos, controlsRef, resetNonce }) {
  const { camera } = useThree();
  const animRef = useRef(null);

  useEffect(() => {
    if (!targetPos) return;
    if (controlsRef.current) controlsRef.current.target.set(0, 0, 0);
    const start = camera.position.clone();
    const end = new THREE.Vector3(...targetPos);
    if (start.distanceTo(end) < 0.01) {
      controlsRef.current?.update();
      return;
    }
    animRef.current = { start, end, t: 0 };
  }, [targetPos, resetNonce]); // eslint-disable-line react-hooks/exhaustive-deps

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

// ── Procedural studio environment ────────────────────────────────────────────
// A soft studio lighting rig built from Lightformers for gentle reflections on
// the cubie plastic and stickers. Baked once (frames={1}), low resolution, and
// fully local — no remote HDR fetch (keeps perf reasonable and works offline).
function StudioEnvironment() {
  return (
    <Environment resolution={64} frames={1}>
      {/* large soft key light overhead */}
      <Lightformer intensity={2.2} position={[0, 5, 1]} scale={[9, 9, 1]} />
      {/* side fills */}
      <Lightformer intensity={1.1} position={[-5, 1, 4]} scale={[4, 6, 1]} />
      <Lightformer intensity={1.1} position={[5, 1, 4]} scale={[4, 6, 1]} />
      {/* cool back rim */}
      <Lightformer intensity={0.7} color="#aab4ff" position={[0, -2, -5]} scale={[7, 5, 1]} />
      {/* subtle front bounce */}
      <Lightformer intensity={0.5} position={[0, -1, 6]} scale={[6, 4, 1]} />
    </Environment>
  );
}

// ── #15 Drag-to-turn helpers ────────────────────────────────────────────────
const PIX2RAD = Math.PI / 2 / 90; // ~90px of drag ≈ one quarter turn

// Reverse lookup: positive-axis rotation "(axis|layer)" → base (unprimed) face
// letter and the sign of its quarter-turn angle in MOVE_ANIM. Lets a live drag
// angle be classified back into a standard move string.
const DRAG_FACE = {};
for (const [mv, a] of Object.entries(MOVE_ANIM)) {
  if (mv.length === 1) DRAG_FACE[`${a.axis}|${a.layer}`] = { face: mv, sign: Math.sign(a.angle) };
}

function snapAxisVec(v) {
  const ax = Math.abs(v.x), ay = Math.abs(v.y), az = Math.abs(v.z);
  if (ax >= ay && ax >= az) return new THREE.Vector3(Math.sign(v.x) || 1, 0, 0);
  if (ay >= az) return new THREE.Vector3(0, Math.sign(v.y) || 1, 0);
  return new THREE.Vector3(0, 0, Math.sign(v.z) || 1);
}

// Classify a snapped quarter-turn count (q) on a positive axis/layer into a move.
function moveFromDrag(axis, layer, q) {
  const base = DRAG_FACE[`${axis}|${layer}`];
  if (!base) return null;
  const t = q * base.sign;              // convert to base (unprimed) quarter units
  const tm = ((t % 4) + 4) % 4;         // 0..3
  if (tm === 0) return null;
  if (tm === 1) return base.face;
  if (tm === 2) return base.face + "2";
  return base.face + "'";               // tm === 3
}

// ── CubeScene (must live inside <Canvas> to use useFrame) ───────────────────
function CubeScene({ stickerMap, animating, onDone, duration, cameraTarget, autoRotate, resetNonce, onMove, colorBlind }) {
  const { camera, gl } = useThree();
  const controlsRef   = useRef();
  const layerGroupRef = useRef();
  const cubeRootRef   = useRef();
  const elapsedRef    = useRef(0);
  const fromAngleRef  = useRef(null);   // start angle when an animation continues a drag

  // Drag state: `dragSplit` (which layer is grabbed) drives the render split and
  // disables orbit; `dragRef` holds live, per-frame values without re-rendering.
  const [dragSplit, setDragSplit] = useState(null);  // { axis, layer }
  const [grabbing, setGrabbing]   = useState(false);  // true from grab-down to release
  const dragRef       = useRef(null);
  const committedRef  = useRef(null);   // { phi } awaiting the commit animation
  const revertTimerRef = useRef(null);
  const animatingRef  = useRef(null);
  animatingRef.current = animating;
  const onMoveRef     = useRef(onMove);
  onMoveRef.current   = onMove;
  const rayRef        = useRef(null);
  if (!rayRef.current) rayRef.current = new THREE.Raycaster();

  // Active descriptor: a running animation takes precedence over a live drag,
  // but both describe the same (axis, layer) so the grabbed cubies never pop
  // between groups during the hand-off.
  const active = animating || dragSplit;
  const { layerPos, restPos } = useMemo(() => {
    if (!active) return { layerPos: [], restPos: POSITIONS };
    const ai = AXIS_IDX[active.axis];
    return {
      layerPos: POSITIONS.filter(p => p[ai] === active.layer),
      restPos:  POSITIONS.filter(p => p[ai] !== active.layer),
    };
  }, [active]);

  // When a new animation is queued: if it is continuing a committed drag, seed
  // the layer at the drag angle (fromAngleRef) so it eases to the snap instead
  // of jumping back to 0. Also hands the drag group off to the animation.
  useEffect(() => {
    if (animating && committedRef.current) {
      fromAngleRef.current = committedRef.current.phi;
      committedRef.current = null;
      if (revertTimerRef.current) { clearTimeout(revertTimerRef.current); revertTimerRef.current = null; }
      setDragSplit(null);
      dragRef.current = null;
    }
    elapsedRef.current = 0;
    if (layerGroupRef.current) {
      layerGroupRef.current.rotation.set(0, 0, 0);
      if (animating && fromAngleRef.current != null) {
        layerGroupRef.current.rotation[animating.axis] = fromAngleRef.current;
      }
    }
  }, [animating]);

  useFrame((_, delta) => {
    const lg = layerGroupRef.current;
    if (!lg) return;
    if (animating) {
      if (elapsedRef.current >= duration) return; // already finished
      elapsedRef.current += delta;
      const t = Math.min(elapsedRef.current / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);  // cubic ease-out
      const from = fromAngleRef.current ?? 0;
      lg.rotation[animating.axis] = from + (animating.angle - from) * eased;
      if (elapsedRef.current >= duration) { fromAngleRef.current = null; onDone?.(); }
    } else if (dragRef.current && dragRef.current.locked && !dragRef.current.invalid) {
      lg.rotation[dragRef.current.axis] = dragRef.current.phi;
    }
  });

  // ── Pointer-driven face dragging ──────────────────────────────────────────
  // Active only when an onMove callback is supplied (the paint/3D tab). A grab
  // that hits the cube disables OrbitControls for that gesture; a grab on the
  // background is left to OrbitControls to orbit. The down listener is on window
  // in the capture phase so it runs before OrbitControls' own pointerdown and
  // can veto the orbit by flipping controls.enabled.
  useEffect(() => {
    if (!onMove) return;
    const dom = gl.domElement;

    const endDrag = () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
    };

    const onPointerDown = (e) => {
      if (e.target !== dom) return;                 // only grabs that start on the canvas
      if (animatingRef.current || committedRef.current) return; // busy — let it be
      const rect = dom.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      const ndc = {
        x: ((e.clientX - rect.left) / rect.width) * 2 - 1,
        y: -((e.clientY - rect.top) / rect.height) * 2 + 1,
      };
      const root = cubeRootRef.current;
      if (!root) return;
      rayRef.current.setFromCamera(ndc, camera);
      const hits = rayRef.current.intersectObjects(root.children, true);
      if (!hits.length) return;                     // missed the cube → orbit instead
      const hit = hits[0];
      let n = new THREE.Vector3(0, 0, 1);
      if (hit.face) n.copy(hit.face.normal).transformDirection(hit.object.matrixWorld);
      n = snapAxisVec(n);
      const p = hit.point;
      const coord = [
        Math.max(-1, Math.min(1, Math.round(p.x / GAP))),
        Math.max(-1, Math.min(1, Math.round(p.y / GAP))),
        Math.max(-1, Math.min(1, Math.round(p.z / GAP))),
      ];
      // It's a face grab — stop OrbitControls from also acting on this pointer.
      e.stopPropagation();
      if (controlsRef.current) controlsRef.current.enabled = false;
      setGrabbing(true);
      dragRef.current = { n, coord, x0: e.clientX, y0: e.clientY, locked: false, invalid: false, axis: null, layer: 0, s: 1, dhx: 0, dhy: 0, phi: 0 };
      window.addEventListener("pointermove", onPointerMove);
      window.addEventListener("pointerup", onPointerUp);
    };

    const onPointerMove = (e) => {
      const d = dragRef.current;
      if (!d) return;
      const dx = e.clientX - d.x0;
      const dy = e.clientY - d.y0;
      if (!d.locked) {
        if (Math.hypot(dx, dy) < 6) return;          // wait for a clear intent
        const len = Math.hypot(dx, dy) || 1;
        const dhx = dx / len, dhy = dy / len;
        const camRight = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 0).normalize();
        const camUp    = new THREE.Vector3().setFromMatrixColumn(camera.matrixWorld, 1).normalize();
        const dWorld = new THREE.Vector3()
          .addScaledVector(camRight, dhx)
          .addScaledVector(camUp, -dhy)
          .normalize();
        const axisV = snapAxisVec(new THREE.Vector3().crossVectors(d.n, dWorld));
        const axis = axisV.x ? "x" : axisV.y ? "y" : "z";
        const s = axisV[axis];                       // ±1 (sign of snapped axis)
        const layer = d.coord[AXIS_IDX[axis]];
        d.dhx = dhx; d.dhy = dhy; d.axis = axis; d.s = s; d.locked = true;
        if (layer === 0) {
          d.invalid = true;                          // middle layer → slice move, unsupported
        } else {
          d.layer = layer;
          setDragSplit({ axis, layer });
        }
      }
      if (d.invalid) return;
      const proj = dx * d.dhx + dy * d.dhy;          // signed drag along the locked direction
      d.phi = d.s * proj * PIX2RAD;                  // rotation about the positive axis
    };

    const onPointerUp = () => {
      endDrag();
      const d = dragRef.current;
      setGrabbing(false);
      if (controlsRef.current) controlsRef.current.enabled = !animatingRef.current;
      if (!d || !d.locked || d.invalid || d.layer === 0) {
        dragRef.current = null;
        setDragSplit(null);
        return;
      }
      const q = Math.max(-2, Math.min(2, Math.round(d.phi / (Math.PI / 2))));
      const move = q === 0 ? null : moveFromDrag(d.axis, d.layer, q);
      if (!move) {                                   // below the snap threshold → spring back
        dragRef.current = null;
        setDragSplit(null);
        return;
      }
      // Hold the layer at its dragged angle; the committed animation (triggered
      // by onMove) will pick up from here via the hand-off effect above.
      committedRef.current = { phi: d.phi };
      revertTimerRef.current = setTimeout(() => {    // safety net if no animation arrives
        if (committedRef.current) {
          committedRef.current = null;
          dragRef.current = null;
          fromAngleRef.current = null;
          setDragSplit(null);
        }
      }, 600);
      onMoveRef.current?.(move);
    };

    window.addEventListener("pointerdown", onPointerDown, true); // capture phase
    return () => {
      window.removeEventListener("pointerdown", onPointerDown, true);
      endDrag();
      if (revertTimerRef.current) clearTimeout(revertTimerRef.current);
    };
  }, [onMove, camera, gl]);

  return (
    <>
      <group ref={cubeRootRef}>
        {restPos.map(([x, y, z]) => (
          <Cubie key={`${x}|${y}|${z}`} cx={x} cy={y} cz={z} stickerMap={stickerMap} colorBlind={colorBlind} />
        ))}
        <group ref={layerGroupRef}>
          {layerPos.map(([x, y, z]) => (
            <Cubie key={`${x}|${y}|${z}`} cx={x} cy={y} cz={z} stickerMap={stickerMap} colorBlind={colorBlind} />
          ))}
        </group>
      </group>

      <CameraController targetPos={cameraTarget} controlsRef={controlsRef} resetNonce={resetNonce} />
      <OrbitControls
        ref={controlsRef}
        enabled={!animating && !grabbing && !dragSplit}
        enablePan={false}
        enableZoom
        autoRotate={autoRotate}
        autoRotateSpeed={1.6}
        minDistance={4}
        maxDistance={14}
        rotateSpeed={0.7}
      />
    </>
  );
}

// ── Public component ─────────────────────────────────────────────────────────
export default function ThreeCube({ cube, width = 340, height = 340, animTrigger, onAnimationDone, animDuration = 0.4, cameraPreset = "default", onMove }) {
  const stickerMap = useMemo(() => buildStickerMap(cube), [cube]);
  const [animating, setAnimating] = useState(null);
  const [autoRotate, setAutoRotate] = useState(false);
  const [resetNonce, setResetNonce] = useState(0);
  const [colorBlind, setColorBlind] = useState(() => !!loadStored("colorBlind", false));
  const cameraTarget = useMemo(() => CAMERA_PRESETS[cameraPreset]?.pos || CAMERA_PRESETS.default.pos, [cameraPreset]);

  // Persist the color-blind overlay choice (best-effort, private-mode safe).
  useEffect(() => { saveStored("colorBlind", colorBlind); }, [colorBlind]);

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

  const btnStyle = (active) => ({
    width: 28, height: 24, display: "flex", alignItems: "center", justifyContent: "center",
    border: `1px solid ${active ? "var(--accent)" : "var(--border-2)"}`, borderRadius: 4,
    background: active ? "#FFD60018" : "#0d0d18cc", color: active ? "var(--accent)" : "#888",
    fontFamily: "var(--font-sans)", fontSize: 13, lineHeight: 1, cursor: "pointer",
    pointerEvents: "auto", padding: 0,
  });

  return (
    <div style={{ position: "relative", width, height, background: "#07070f", borderRadius: 12 }}>
      <WebGLErrorBoundary>
        <Canvas
          camera={{ position: [3.5, 2.8, 6.5], fov: 42 }}
          style={{ borderRadius: 12 }}
        >
          <ambientLight intensity={0.45} />
          <directionalLight position={[5, 8, 5]} intensity={0.8} />
          <directionalLight position={[-4, -4, -4]} intensity={0.2} />
          <StudioEnvironment />

          <CubeScene
            stickerMap={stickerMap}
            animating={animating}
            onDone={handleDone}
            duration={animDuration}
            cameraTarget={cameraTarget}
            autoRotate={autoRotate}
            resetNonce={resetNonce}
            onMove={onMove}
            colorBlind={colorBlind}
          />
        </Canvas>
      </WebGLErrorBoundary>

      {/* #16 camera controls — zoom is on the canvas (scroll/pinch); these toggle
          auto-rotate and reset the view back to the active preset. */}
      <div style={{
        position: "absolute", top: 8, right: 8, display: "flex", gap: 4,
        pointerEvents: "none",
      }} role="toolbar" aria-label="3D view controls">
        <button
          type="button"
          onClick={() => setColorBlind(v => !v)}
          aria-pressed={colorBlind}
          aria-label={colorBlind ? "Hide color-blind letters" : "Show color-blind letters"}
          title={colorBlind ? "Hide color labels" : "Color-blind labels"}
          style={{ ...btnStyle(colorBlind), fontWeight: 900 }}
        >A</button>
        <button
          type="button"
          onClick={() => setAutoRotate(r => !r)}
          aria-pressed={autoRotate}
          aria-label={autoRotate ? "Stop auto-rotate" : "Auto-rotate view"}
          title={autoRotate ? "Stop auto-rotate" : "Auto-rotate"}
          style={btnStyle(autoRotate)}
        >↻</button>
        <button
          type="button"
          onClick={() => setResetNonce(n => n + 1)}
          aria-label="Reset camera view"
          title="Reset view"
          style={btnStyle(false)}
        >⤢</button>
      </div>
    </div>
  );
}
