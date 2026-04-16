import { PAL, NAMES } from './cube.js';

export function validateCube(cube) {
  const errors=[];
  const counts={}; PAL.forEach(p=>counts[p]=0);
  Object.values(cube).flat().forEach(s=>{if(counts[s]!==undefined)counts[s]++;});
  PAL.forEach(col=>{if(counts[col]!==9)errors.push(`${NAMES[col]}: ${counts[col]}/9 stickers`);});
  const centers=Object.values(cube).map(f=>f[4]);
  if(new Set(centers).size<6) errors.push("Two faces share the same center color");

  // ── Corner validity ─────────────────────────────────────────────
  // Each corner must have exactly one Y (top) or W (bottom) sticker.
  const corners = [
    { name:'URF', s:[cube.U[8], cube.R[0], cube.F[2]] },
    { name:'UFL', s:[cube.U[6], cube.F[0], cube.L[2]] },
    { name:'ULB', s:[cube.U[0], cube.L[0], cube.B[2]] },
    { name:'UBR', s:[cube.U[2], cube.B[0], cube.R[2]] },
    { name:'DFR', s:[cube.D[2], cube.F[8], cube.R[6]] },
    { name:'DLF', s:[cube.D[0], cube.L[8], cube.F[6]] },
    { name:'DBL', s:[cube.D[6], cube.B[8], cube.L[6]] },
    { name:'DRB', s:[cube.D[8], cube.R[8], cube.B[6]] },
  ];
  for (const { name, s } of corners) {
    const udCount = s.filter(c=>c==='Y'||c==='W').length;
    if (udCount !== 1)
      errors.push(`Corner ${name} invalid: stickers [${s.join(',')}] — needs exactly one Y/W sticker`);
  }

  // ── Edge validity ───────────────────────────────────────────────
  // Each edge must have two different, non-opposite colors.
  // Opposite pairs (face colors that can never share an edge): Y/W, R/O, B/G
  const OPPOSITE = new Set(['YW','WY','RO','OR','BG','GB']);
  const edges = [
    { name:'UR',  s:[cube.U[5], cube.R[1]] },
    { name:'UF',  s:[cube.U[7], cube.F[1]] },
    { name:'UL',  s:[cube.U[3], cube.L[1]] },
    { name:'UB',  s:[cube.U[1], cube.B[1]] },
    { name:'DR',  s:[cube.D[5], cube.R[7]] },
    { name:'DF',  s:[cube.D[1], cube.F[7]] },
    { name:'DL',  s:[cube.D[3], cube.L[7]] },
    { name:'DB',  s:[cube.D[7], cube.B[7]] },
    { name:'FR',  s:[cube.F[5], cube.R[3]] },
    { name:'FL',  s:[cube.F[3], cube.L[5]] },
    { name:'BL',  s:[cube.B[5], cube.L[3]] },
    { name:'BR',  s:[cube.B[3], cube.R[5]] },
  ];
  for (const { name, s } of edges) {
    const [a, b] = s;
    if (a === b || OPPOSITE.has(a+b))
      errors.push(`Edge ${name} invalid: stickers [${s.join(',')}] — same or opposite colors`);
  }

  return errors;
}
