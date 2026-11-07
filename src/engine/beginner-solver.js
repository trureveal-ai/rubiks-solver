// ── Beginner (Layer-By-Layer) solver ──────────────────────────────────────
// Agent G, Wave 3 — item #23.
//
// Produces a human-readable Layer-By-Layer solution grouped into the six
// classic beginner stages:
//   1. White Cross        4. Yellow Cross
//   2. White Corners      5. Orient Last Layer
//   3. Middle-Layer Edges 6. Permute Last Layer
//
// Unlike the Kociemba two-phase engine (which returns a near-optimal 18–24
// move solution), this mirrors how a person learns to solve a cube by hand,
// so it is intentionally LONGER but easy to follow stage by stage.
//
// It is a FULLY GENERAL solver: it returns a valid, verified solution for any
// legal scramble. The move count is non-optimal by design (beginner
// algorithms), typically ~60–130 quarter/half turns.
//
// Correctness strategy: every F2L insertion algorithm below was derived by an
// offline breadth-first search from the solved cube (preserving the already-
// solved pieces), and every last-layer algorithm is a standard, verified
// sequence. The assembled solution is additionally re-verified against the
// cube engine before being returned (throws if it does not solve).

import { initCube, copyCube, MOVE_FN, ALL_MOVES } from "./cube.js";

// ── Cubie model, derived from the facelet engine so it always matches ──────
// Edge slots (fixed order) and their ordered facelet positions.
const EDGE_SLOTS = [
  ["UR", ["U", 5], ["R", 1]], ["UF", ["U", 7], ["F", 1]],
  ["UL", ["U", 3], ["L", 1]], ["UB", ["U", 1], ["B", 1]],
  ["DR", ["D", 5], ["R", 7]], ["DF", ["D", 1], ["F", 7]],
  ["DL", ["D", 3], ["L", 7]], ["DB", ["D", 7], ["B", 7]],
  ["FR", ["F", 5], ["R", 3]], ["FL", ["F", 3], ["L", 5]],
  ["BL", ["B", 5], ["L", 3]], ["BR", ["B", 3], ["R", 5]],
];
const CORNER_SLOTS = [
  ["URF", ["U", 8], ["R", 0], ["F", 2]], ["UFL", ["U", 6], ["F", 0], ["L", 2]],
  ["ULB", ["U", 0], ["L", 0], ["B", 2]], ["UBR", ["U", 2], ["B", 0], ["R", 2]],
  ["DFR", ["D", 2], ["F", 8], ["R", 6]], ["DLF", ["D", 0], ["L", 8], ["F", 6]],
  ["DBL", ["D", 6], ["B", 8], ["L", 6]], ["DRB", ["D", 8], ["R", 8], ["B", 6]],
];

const SOLVED_FACELET = initCube();
const EDGE_HOME = EDGE_SLOTS.map(([, a, b]) => [SOLVED_FACELET[a[0]][a[1]], SOLVED_FACELET[b[0]][b[1]]]);
const CORNER_HOME = CORNER_SLOTS.map(([, a, b, c]) => [SOLVED_FACELET[a[0]][a[1]], SOLVED_FACELET[b[0]][b[1]], SOLVED_FACELET[c[0]][c[1]]]);
const EDGE_PRIMARY = EDGE_HOME.map((h) => h[0]);
const CORNER_PRIMARY = CORNER_HOME.map((h) => h[0]);
const sortKey = (arr) => [...arr].sort().join("");
const EDGE_BY_COLORS = {}; EDGE_HOME.forEach((h, i) => { EDGE_BY_COLORS[sortKey(h)] = i; });
const CORNER_BY_COLORS = {}; CORNER_HOME.forEach((h, i) => { CORNER_BY_COLORS[sortKey(h)] = i; });

// Read a facelet cube into cubie arrays {ep, eo, cp, co}.
function toCubie(cube) {
  const ep = Array(12), eo = Array(12), cp = Array(8), co = Array(8);
  EDGE_SLOTS.forEach(([, a, b], slot) => {
    const cols = [cube[a[0]][a[1]], cube[b[0]][b[1]]];
    const piece = EDGE_BY_COLORS[sortKey(cols)];
    ep[slot] = piece;
    eo[slot] = cols[0] === EDGE_PRIMARY[piece] ? 0 : 1;
  });
  CORNER_SLOTS.forEach(([, a, b, c], slot) => {
    const cols = [cube[a[0]][a[1]], cube[b[0]][b[1]], cube[c[0]][c[1]]];
    const piece = CORNER_BY_COLORS[sortKey(cols)];
    cp[slot] = piece;
    co[slot] = cols.indexOf(CORNER_PRIMARY[piece]);
  });
  return { ep, eo, cp, co };
}

// Per-move transition tables (permutation + orientation delta), derived once
// from the facelet engine. Orientation composes additively (standard cube
// theory; verified against the engine over random sequences).
const MOVE_TABLES = {};
for (const m of ALL_MOVES) {
  const after = toCubie(MOVE_FN[m](copyCube(SOLVED_FACELET)));
  MOVE_TABLES[m] = { esrc: after.ep, deo: after.eo, csrc: after.cp, dco: after.co };
}
function applyMove(st, m) {
  const t = MOVE_TABLES[m];
  const ep = Array(12), eo = Array(12), cp = Array(8), co = Array(8);
  for (let i = 0; i < 12; i++) { const s = t.esrc[i]; ep[i] = st.ep[s]; eo[i] = (st.eo[s] + t.deo[i]) & 1; }
  for (let i = 0; i < 8; i++) { const s = t.csrc[i]; cp[i] = st.cp[s]; co[i] = (st.co[s] + t.dco[i]) % 3; }
  return { ep, eo, cp, co };
}
const P = (s) => s.trim().split(/\s+/).filter(Boolean);
function applySeq(st, moves) { let s = st; for (const m of moves) s = applyMove(s, m); return s; }
const SOLVED_CUBIE = toCubie(SOLVED_FACELET);

const INV = {
  U: "U'", "U'": "U", U2: "U2", D: "D'", "D'": "D", D2: "D2",
  F: "F'", "F'": "F", F2: "F2", B: "B'", "B'": "B", B2: "B2",
  R: "R'", "R'": "R", R2: "R2", L: "L'", "L'": "L", L2: "L2",
};
export function invertMoves(moves) { return moves.slice().reverse().map((m) => INV[m]); }

// Rebuild the scrambled cube from the Kociemba solution: applying the solution
// to the scramble yields the solved cube, so scramble = solved · solution⁻¹.
export function scrambleFromSolutionMoves(moves) {
  return applySeqFacelet(copyCube(SOLVED_FACELET), invertMoves(moves));
}
function applySeqFacelet(cube, moves) { let c = cube; for (const m of moves) if (MOVE_FN[m]) c = MOVE_FN[m](c); return c; }

const eslot = (st, p) => st.ep.indexOf(p);
const cslot = (st, p) => st.cp.indexOf(p);

// ── Baked F2L insertion tables (generated offline via BFS from solved) ─────
// CROSS[edgePiece]["slot,eo"] → algorithm that places that white edge into its
// home, preserving the three other white-cross edges.
const CROSS = {
  4: { "8,0": "R'", "11,0": "R", "0,0": "R2", "1,0": "U' R2", "3,0": "U R2", "2,0": "U2 R2", "11,1": "D B' D'", "10,1": "D B D'", "9,1": "D' F' D", "8,1": "D' F D", "10,0": "D2 L' D2", "9,0": "D2 L D2", "1,1": "F R' F'", "3,1": "B' R B", "4,1": "R' D B' D'", "0,1": "R D B' D'", "2,1": "U' F R' F'" },
  5: { "9,1": "F'", "8,1": "F", "1,0": "F2", "2,0": "U' F2", "0,0": "U F2", "3,0": "U2 F2", "8,0": "D R' D'", "11,0": "D R D'", "10,0": "D' L' D", "9,0": "D' L D", "11,1": "D2 B' D2", "10,1": "D2 B D2", "0,1": "R' F R", "2,1": "L F' L'", "5,1": "F' D R' D'", "1,1": "F D R' D'", "3,1": "L' U' L F'" },
  6: { "10,0": "L'", "9,0": "L", "2,0": "L2", "3,0": "U' L2", "1,0": "U L2", "0,0": "U2 L2", "9,1": "D F' D'", "8,1": "D F D'", "11,1": "D' B' D", "10,1": "D' B D", "8,0": "D2 R' D2", "11,0": "D2 R D2", "1,1": "F' L F", "3,1": "B L' B'", "6,1": "L' D F' D'", "2,1": "L D F' D'", "0,1": "U F' L F" },
  7: { "11,1": "B'", "10,1": "B", "3,0": "B2", "0,0": "U' B2", "2,0": "U B2", "1,0": "U2 B2", "10,0": "D L' D'", "9,0": "D L D'", "8,0": "D' R' D", "11,0": "D' R D", "9,1": "D2 F' D2", "8,1": "D2 F D2", "0,1": "R B' R'", "2,1": "L' B L", "7,1": "B' D L' D'", "3,1": "B D L' D'", "1,1": "R' U' R B'" },
};
// Lift a white edge out of a wrong bottom slot (preserves the other cross edges).
const EXTRACT_CROSS = { 4: "R2", 5: "F2", 6: "L2", 7: "B2" };

// CORNER[cornerPiece]["slot,co"] → algorithm that seats that white corner into
// its home, preserving the white cross and the other white corners.
const CORNER = {
  4: { "0,2": "F' U' F", "3,1": "F' U F", "2,1": "F' U2 F", "1,2": "R U' R'", "0,1": "R U R'", "2,2": "R U2 R'", "3,2": "U F' U' F", "1,1": "U2 F' U F", "3,0": "F D2 B' D2 F'", "0,0": "F' R' F2 R F", "2,0": "F' L F' L' F2", "1,0": "R' D2 L D2 R", "4,1": "R U' R2 F R F'", "4,2": "F' R' F2 R U' F" },
  5: { "2,2": "F U' F'", "1,1": "F U F'", "3,2": "F U2 F'", "1,2": "L' U' L", "0,1": "L' U L", "3,1": "L' U2 L", "0,2": "U2 F U' F'", "2,1": "U' F U F'", "1,0": "F R U2 R' F'", "2,0": "F' D2 B D2 F", "3,0": "F R' F R F2", "0,0": "R F2 R' F2 R'", "5,2": "L' U L F U F'", "5,1": "F R U2 R' U F'" },
  6: { "2,2": "B' U' B", "1,1": "B' U B", "0,1": "B' U2 B", "3,2": "L U' L'", "2,1": "L U L'", "0,2": "L U2 L'", "1,2": "U B' U' B", "3,1": "U2 B' U B", "1,0": "F L2 F' L2 F'", "2,0": "B' R' U2 R B", "0,0": "B' R B' R' B2", "3,0": "R' B2 R B2 R", "6,1": "L U' L2 B L B'", "6,2": "B' R' U2 R U' B" },
  7: { "0,2": "B U' B'", "3,1": "B U B'", "1,2": "B U2 B'", "3,2": "R' U' R", "2,1": "R' U R", "1,1": "R' U2 R", "2,2": "U2 B U' B'", "0,1": "U' B U B'", "0,0": "F' R2 F R2 F", "3,0": "B R B2 R' B'", "1,0": "B L' B L B2", "2,0": "R D2 L' D2 R'", "7,2": "R' U R B U B'", "7,1": "B R B2 R' U B'" },
};
// Lift a white corner out of a wrong bottom slot: inverse of seating that
// slot's own corner from the pillar directly above it (preserves other corners).
const PILLAR = { 4: 0, 5: 1, 6: 2, 7: 3 };
const EXTRACT_CORNER = {};
for (const s of [4, 5, 6, 7]) EXTRACT_CORNER[s] = invertMoves(P(CORNER[s][PILLAR[s] + ",0"])).join(" ");

// Standard middle-layer edge insertions (one right + one left per side face).
const MIDDLE_ALGS = [
  "U R U' R' U' F' U F", "U' L' U L U F U' F'",
  "U B U' B' U' R' U R", "U' F' U F U R U' R'",
  "U L U' L' U' B' U B", "U' R' U R U B U' B'",
  "U F U' F' U' L' U L", "U' B' U B U L U' L'",
];

// Last-layer algorithms (all preserve the first two layers).
const OLL_EDGE = "F R U R' U' F'";              // orients last-layer edges
const SUNE = "R U R' U R U2 R'";                // orients last-layer corners
const ANTISUNE = "R U2 R' U' R U' R'";
const APERM = "R' F R' B2 R F' R' B2 R2";       // 3-cycle of LL corners
const UPERM = "R U' R U R U R U' R' U' R2";     // 3-cycle of LL edges
const TPERM = "R U R' U' R' F R2 U' R' U' R U R' F'"; // swaps 2 corners + 2 edges

// ── Goal / preservation predicates ─────────────────────────────────────────
const edgeSolved = (st, p) => st.ep[p] === p && st.eo[p] === 0;
const cornerSolved = (st, p) => st.cp[p] === p && st.co[p] === 0;
const allSolved = (st, edges, corners) =>
  edges.every((p) => edgeSolved(st, p)) && corners.every((p) => cornerSolved(st, p));
const firstLayerOk = (st) => allSolved(st, [4, 5, 6, 7], [4, 5, 6, 7]);

// ── Stage solvers ──────────────────────────────────────────────────────────
function solveCross(st) {
  const moves = [];
  for (const E of [4, 5, 6, 7]) {
    let guard = 0;
    while (!edgeSolved(st, E)) {
      if (guard++ > 10) throw new Error("beginner: cross stuck on edge " + E);
      const s = eslot(st, E), eo = st.eo[s];
      const alg = CROSS[E][s + "," + eo];
      if (alg) { const seq = P(alg); st = applySeq(st, seq); moves.push(...seq); }
      else { const seq = P(EXTRACT_CROSS[s]); st = applySeq(st, seq); moves.push(...seq); }
    }
  }
  return { st, moves };
}

function solveCorners(st) {
  const moves = [];
  for (const C of [4, 5, 6, 7]) {
    let guard = 0;
    while (!cornerSolved(st, C)) {
      if (guard++ > 12) throw new Error("beginner: corner stuck on " + C);
      const s = cslot(st, C), co = st.co[s];
      const alg = CORNER[C][s + "," + co];
      if (alg) { const seq = P(alg); st = applySeq(st, seq); moves.push(...seq); }
      else { const seq = P(EXTRACT_CORNER[s]); st = applySeq(st, seq); moves.push(...seq); }
    }
  }
  return { st, moves };
}

function solveMiddle(st) {
  const moves = [];
  const done = [];
  const preserved = (s2) => firstLayerOk(s2) && done.every((d) => edgeSolved(s2, d));
  for (const E of [8, 9, 10, 11]) {
    let guard = 0;
    while (!edgeSolved(st, E)) {
      if (guard++ > 16) throw new Error("beginner: middle stuck on edge " + E);
      const s = eslot(st, E);
      let applied = false;
      if (s < 4) {
        // Edge is in the top layer: find a U-alignment + insertion that seats it.
        outer:
        for (const u of [[], ["U"], ["U2"], ["U'"]]) {
          for (const a of MIDDLE_ALGS) {
            const seq = u.concat(P(a));
            const s2 = applySeq(st, seq);
            if (edgeSolved(s2, E) && preserved(s2)) { st = s2; moves.push(...seq); applied = true; break outer; }
          }
        }
      }
      if (applied) continue;
      // Edge is stuck in a middle slot (or no direct seat found): eject it to the top.
      let ejected = false;
      for (const a of MIDDLE_ALGS) {
        const seq = P(a);
        const s2 = applySeq(st, seq);
        if (eslot(s2, E) < 4 && firstLayerOk(s2) && done.every((d) => edgeSolved(s2, d))) {
          st = s2; moves.push(...seq); ejected = true; break;
        }
      }
      if (!ejected) throw new Error("beginner: cannot free middle edge " + E);
    }
    done.push(E);
  }
  return { st, moves };
}

// Generic last-layer stage: iterative-deepening search over (algorithm | U turn)
// steps that reaches `goal`. All algorithms preserve the layers below, so any
// sequence found is valid. Returns the move list.
function solveLLStage(st, algSet, goal, maxSteps) {
  if (goal(st)) return { st, moves: [] };
  const units = [...algSet.map(P), ["U"], ["U2"], ["U'"]];
  for (let depth = 1; depth <= maxSteps; depth++) {
    const res = dfs(st, depth, []);
    if (res) return { st: applySeq(st, res), moves: res };
  }
  throw new Error("beginner: last-layer stage did not converge");
  function dfs(state, depth, path) {
    for (const unit of units) {
      const ns = applySeq(state, unit);
      const np = path.concat(unit);
      if (goal(ns)) return np;
      if (depth > 1) { const r = dfs(ns, depth - 1, np); if (r) return r; }
    }
    return null;
  }
}

const yellowCrossDone = (st) => st.eo[0] === 0 && st.eo[1] === 0 && st.eo[2] === 0 && st.eo[3] === 0;
const ollDone = (st) => st.co[0] === 0 && st.co[1] === 0 && st.co[2] === 0 && st.co[3] === 0 && yellowCrossDone(st);
const fullySolved = (st) => {
  for (let i = 0; i < 12; i++) if (st.ep[i] !== i || st.eo[i] !== 0) return false;
  for (let i = 0; i < 8; i++) if (st.cp[i] !== i || st.co[i] !== 0) return false;
  return true;
};

// ── Stage metadata (names + explanations shown in the UI) ──────────────────
const STAGE_INFO = [
  { name: "White Cross", blurb: "Place the four white edges around the white (bottom) center, each matching its side color — forming a plus on the bottom." },
  { name: "White Corners", blurb: "Seat the four white corners to complete the entire first (white) layer." },
  { name: "Middle-Layer Edges", blurb: "Insert the four edges of the middle layer, finishing the first two layers (F2L)." },
  { name: "Yellow Cross", blurb: "Orient the last-layer edges so a yellow plus appears on top (F R U R' U' F')." },
  { name: "Orient Last Layer", blurb: "Twist the last-layer corners until the whole top face is yellow (Sune / Anti-Sune)." },
  { name: "Permute Last Layer", blurb: "Cycle the last-layer corners and edges into their final spots to finish the cube." },
];

/**
 * Solve a (legal) scrambled cube using the beginner Layer-By-Layer method.
 * @param {object} cube  facelet cube {U,R,F,D,L,B} of 9 color letters each
 * @returns {{ stages, totalMoves, moves, optimal:false, note }}
 * @throws if the cube is unsolvable or an internal step fails.
 */
export function solveBeginner(cube) {
  let st = toCubie(cube);
  const stageMoves = [];

  let r;
  r = solveCross(st); st = r.st; stageMoves.push(r.moves);
  r = solveCorners(st); st = r.st; stageMoves.push(r.moves);
  r = solveMiddle(st); st = r.st; stageMoves.push(r.moves);
  r = solveLLStage(st, [OLL_EDGE], yellowCrossDone, 8); st = r.st; stageMoves.push(r.moves);
  r = solveLLStage(st, [SUNE, ANTISUNE], ollDone, 10); st = r.st; stageMoves.push(r.moves);
  r = solveLLStage(st, [APERM, UPERM, TPERM], fullySolved, 9); st = r.st; stageMoves.push(r.moves);

  // Re-verify end-to-end against the facelet engine (defensive).
  const all = stageMoves.flat();
  const check = applySeqFacelet(copyCube(cube), all);
  if (!faceletSolved(check)) throw new Error("beginner: assembled solution does not solve the cube");

  const stages = STAGE_INFO.map((info, i) => ({
    name: info.name,
    explain: info.blurb,
    moves: stageMoves[i],
    moveCount: stageMoves[i].length,
  }));

  return {
    stages,
    totalMoves: all.length,
    moves: all,
    optimal: false,
    note: "Beginner (Layer-By-Layer) method — easy to follow by hand, but far from the shortest possible solution.",
  };
}

function faceletSolved(cube) {
  const s = initCube();
  for (const f of ["U", "D", "F", "B", "R", "L"]) for (let i = 0; i < 9; i++) if (cube[f][i] !== s[f][i]) return false;
  return true;
}

// Exposed for tests.
export const __test = { toCubie, applySeq, SOLVED_CUBIE, fullySolved, applySeqFacelet, faceletSolved };
