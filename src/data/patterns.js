// ── Classic Rubik's Cube patterns ─────────────────────────────────
//
// Each pattern is a well-known "pretty pattern" expressed as a standard
// face-turn sequence (U D F B L R with ' and 2 modifiers) that produces
// the pattern FROM A SOLVED CUBE. The engine (engine/cube.js) supports
// only the 18 face turns — no wide or slice moves — so every sequence
// here is written in pure face-turn notation. Classic patterns whose
// canonical form needs slice moves (e.g. the M2 E2 S2 checkerboard) are
// given here via their face-turn equivalents, or omitted.
//
// All sequences are verified against the engine: each parses, applies
// without error, and yields a physically valid, non-solved cube (see
// patterns.test.js).

export const PATTERNS = [
  {
    name: "Checkerboard",
    moves: "U2 D2 F2 B2 L2 R2",
    blurb: "Every face a two-color checker (Pons Asinorum).",
  },
  {
    name: "Plus Minus",
    moves: "U2 R2 L2 U2 R2 L2",
    blurb: "Alternating bars down the side faces.",
  },
  {
    name: "Four Spot",
    moves: "F2 B2 U D' R2 L2 U D'",
    blurb: "Four faces show a single center spot swapped.",
  },
  {
    name: "Six Spot",
    moves: "U D' R L' F B' U D'",
    blurb: "All six centers recolored — spots on every face.",
  },
  {
    name: "Cross",
    moves: "R2 L' D F2 R' D' R' L U' D R D B2 R' U D2",
    blurb: "A plus/cross of the center color on each face.",
  },
  {
    name: "Tetris",
    moves: "L R F B U' D' L' R'",
    blurb: "Interlocking tetromino-style blocks.",
  },
  {
    name: "Cube in a Cube",
    moves: "F L F U' R U F2 L2 U' L' B D' B' L2 U",
    blurb: "A smaller cube nested in one corner.",
  },
  {
    name: "Cube in a Cube in a Cube",
    moves: "U' L' U' F' R2 B' R F U B2 U B' L U' F U R F'",
    blurb: "Three nested cubes spiraling into a corner.",
  },
  {
    name: "Python",
    moves: "F2 R' B' U R' L F' L F' B D' R B L2",
    blurb: "A snaking band of color wrapping the cube.",
  },
  {
    name: "Anaconda",
    moves: "L U B' U' R L' B R' F B' D R D' F'",
    blurb: "A coiling diagonal stripe around the cube.",
  },
  {
    name: "Green Mamba",
    moves: "R D R F R' F' B D R' U' B' U D2",
    blurb: "Serpentine stripes winding across the faces.",
  },
  {
    name: "Gift Box",
    moves: "U B2 R2 B2 L2 F2 R2 D' F2 L2 B F' L F2 B' U B2 U B2 F",
    blurb: "A wrapped present with a lid and ribbon.",
  },
  {
    name: "Twister",
    moves: "F R' U L F' L' F U' R U L' U' L F'",
    blurb: "Faces that look twisted off their axis.",
  },
  {
    name: "Superflip",
    moves: "U R2 F B R B2 R U2 L B2 R U' D' R2 F R' L B2 U2 F2",
    blurb: "Every edge flipped in place — a 20-move classic.",
  },
];
