// ── Display constants ─────────────────────────────────────────────
export const C = { W:"#EFEFEF", Y:"#FFD600", B:"#1565C0", G:"#2E7D32", R:"#C62828", O:"#E65100" };
export const NAMES = { W:"White", Y:"Yellow", B:"Blue", G:"Green", R:"Red", O:"Orange" };
export const PAL = ["W","Y","R","O","B","G"];
export const FLABEL = { U:"TOP", D:"BOTTOM", F:"FRONT", B:"BACK", R:"RIGHT", L:"LEFT" };
export const FACE_COLOR = { U:"#FFD600", D:"#EFEFEF", F:"#1565C0", B:"#2E7D32", R:"#C62828", L:"#E65100" };
export const MOVE_DESC = {
  "U":"Top CW","U'":"Top CCW","U2":"Top 180°",
  "D":"Bot CW","D'":"Bot CCW","D2":"Bot 180°",
  "F":"Front CW","F'":"Front CCW","F2":"Front 180°",
  "B":"Back CW","B'":"Back CCW","B2":"Back 180°",
  "R":"Right CW","R'":"Right CCW","R2":"Right 180°",
  "L":"Left CW","L'":"Left CCW","L2":"Left 180°",
};

// ── Cube engine ───────────────────────────────────────────────────
export function initCube() {
  return { U:Array(9).fill("Y"), D:Array(9).fill("W"), F:Array(9).fill("B"), B:Array(9).fill("G"), R:Array(9).fill("R"), L:Array(9).fill("O") };
}

// Deep-copy a cube state
export function copyCube(c) {
  return { U:[...c.U], D:[...c.D], F:[...c.F], B:[...c.B], R:[...c.R], L:[...c.L] };
}

function rcw(f) { return [f[6],f[3],f[0],f[7],f[4],f[1],f[8],f[5],f[2]]; }

function applyU(cube) {
  const c=copyCube(cube); c.U=rcw(cube.U);
  [0,1,2].forEach(i=>{c.L[i]=cube.F[i];c.B[i]=cube.L[i];c.R[i]=cube.B[i];c.F[i]=cube.R[i];});
  return c;
}
function applyD(cube) {
  const c=copyCube(cube); c.D=rcw(cube.D);
  [6,7,8].forEach(i=>{c.F[i]=cube.L[i];c.R[i]=cube.F[i];c.B[i]=cube.R[i];c.L[i]=cube.B[i];});
  return c;
}
function applyF(cube) {
  const c=copyCube(cube); c.F=rcw(cube.F);
  c.U[6]=cube.L[8];c.U[7]=cube.L[5];c.U[8]=cube.L[2];
  c.R[0]=cube.U[6];c.R[3]=cube.U[7];c.R[6]=cube.U[8];
  c.D[0]=cube.R[6];c.D[1]=cube.R[3];c.D[2]=cube.R[0];
  c.L[2]=cube.D[0];c.L[5]=cube.D[1];c.L[8]=cube.D[2];
  return c;
}
function applyB(cube) {
  const c=copyCube(cube); c.B=rcw(cube.B);
  c.U[0]=cube.R[2];c.U[1]=cube.R[5];c.U[2]=cube.R[8];
  c.L[0]=cube.U[2];c.L[3]=cube.U[1];c.L[6]=cube.U[0];
  c.D[6]=cube.L[0];c.D[7]=cube.L[3];c.D[8]=cube.L[6];
  c.R[2]=cube.D[8];c.R[5]=cube.D[7];c.R[8]=cube.D[6];
  return c;
}
function applyR(cube) {
  const c=copyCube(cube); c.R=rcw(cube.R);
  c.U[2]=cube.F[2];c.U[5]=cube.F[5];c.U[8]=cube.F[8];
  c.B[0]=cube.U[8];c.B[3]=cube.U[5];c.B[6]=cube.U[2];
  c.D[8]=cube.B[0];c.D[5]=cube.B[3];c.D[2]=cube.B[6];
  c.F[2]=cube.D[2];c.F[5]=cube.D[5];c.F[8]=cube.D[8];
  return c;
}
function applyL(cube) {
  const c=copyCube(cube); c.L=rcw(cube.L);
  c.F[0]=cube.U[0];c.F[3]=cube.U[3];c.F[6]=cube.U[6];
  c.D[0]=cube.F[0];c.D[3]=cube.F[3];c.D[6]=cube.F[6];
  c.B[2]=cube.D[6];c.B[5]=cube.D[3];c.B[8]=cube.D[0];
  c.U[0]=cube.B[8];c.U[3]=cube.B[5];c.U[6]=cube.B[2];
  return c;
}

export const MOVE_FN = {
  'U':c=>applyU(c),       "U'":c=>applyU(applyU(applyU(c))),  'U2':c=>applyU(applyU(c)),
  'D':c=>applyD(c),       "D'":c=>applyD(applyD(applyD(c))),  'D2':c=>applyD(applyD(c)),
  'F':c=>applyF(c),       "F'":c=>applyF(applyF(applyF(c))),  'F2':c=>applyF(applyF(c)),
  'B':c=>applyB(c),       "B'":c=>applyB(applyB(applyB(c))),  'B2':c=>applyB(applyB(c)),
  'R':c=>applyR(c),       "R'":c=>applyR(applyR(applyR(c))),  'R2':c=>applyR(applyR(c)),
  'L':c=>applyL(c),       "L'":c=>applyL(applyL(applyL(c))),  'L2':c=>applyL(applyL(c)),
};

export const ALL_MOVES = Object.keys(MOVE_FN);

export function generateScramble(n=20) {
  let cube=initCube(); const seq=[]; let last='';
  for(let i=0;i<n;i++){
    let m; do{m=ALL_MOVES[Math.floor(Math.random()*ALL_MOVES.length)];}while(m[0]===last);
    last=m[0]; seq.push(m); cube=MOVE_FN[m](cube);
  }
  return {cube,seq};
}

export function applyMoveString(cube, moveStr) {
  if(!moveStr?.trim()) return cube;
  let c=cube; moveStr.trim().split(/\s+/).forEach(m=>{if(MOVE_FN[m])c=MOVE_FN[m](c);}); return c;
}

export function replayToCube(startCube, steps, stepIndex) {
  let c=startCube;
  for(let i=0;i<=stepIndex;i++) if(steps[i]?.move) c=applyMoveString(c,steps[i].move);
  return c;
}
