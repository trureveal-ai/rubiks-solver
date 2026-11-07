import { describe, it, expect } from 'vitest';
import { solveBeginner, scrambleFromSolutionMoves, invertMoves } from './beginner-solver.js';
import { initCube, generateScramble, applyMoveString } from './cube.js';

const STAGE_NAMES = [
  'White Cross', 'White Corners', 'Middle-Layer Edges',
  'Yellow Cross', 'Orient Last Layer', 'Permute Last Layer',
];

function isSolved(cube) {
  const s = initCube();
  return ['U', 'D', 'F', 'B', 'R', 'L'].every((f) => cube[f].every((c, i) => c === s[f][i]));
}

// Apply a flat move list to a cube.
function applyMoves(cube, moves) {
  return applyMoveString(cube, moves.join(' '));
}

describe('beginner-solver', () => {
  it('returns an empty solution for an already-solved cube', () => {
    const r = solveBeginner(initCube());
    expect(r.totalMoves).toBe(0);
    expect(r.moves).toEqual([]);
    expect(r.stages).toHaveLength(6);
  });

  it('exposes the six named beginner stages in order', () => {
    const { cube } = generateScramble(25);
    const r = solveBeginner(cube);
    expect(r.stages.map((s) => s.name)).toEqual(STAGE_NAMES);
    // Stage moves concatenate exactly to the full move list.
    expect(r.stages.flatMap((s) => s.moves)).toEqual(r.moves);
    r.stages.forEach((s) => expect(s.moveCount).toBe(s.moves.length));
  });

  it('solves many random scrambles (concatenated moves return the cube to solved)', () => {
    for (let i = 0; i < 400; i++) {
      const { cube, seq } = generateScramble(25);
      const r = solveBeginner(cube);
      const solved = applyMoves(cube, r.moves);
      expect(isSolved(solved), `failed scramble: ${seq.join(' ')}`).toBe(true);
      // Flags itself as a non-optimal beginner solution.
      expect(r.optimal).toBe(false);
    }
  });

  it('solves deep and short scrambles alike', () => {
    for (const len of [1, 2, 3, 5, 10, 40, 60]) {
      for (let i = 0; i < 20; i++) {
        const { cube, seq } = generateScramble(len);
        const r = solveBeginner(cube);
        expect(isSolved(applyMoves(cube, r.moves)), `len ${len}: ${seq.join(' ')}`).toBe(true);
      }
    }
  });

  it('derives the scramble from a solution via the inverse (roundtrip)', () => {
    const { seq } = generateScramble(20);
    // If `seq` were a solution, the scramble is solved·seq⁻¹; applying seq then re-solves it.
    const scramble = scrambleFromSolutionMoves(seq);
    const back = applyMoveString(scramble, seq.join(' '));
    expect(isSolved(back)).toBe(true);
  });

  it('invertMoves reverses and inverts a sequence', () => {
    expect(invertMoves(['R', 'U2', "F'"])).toEqual(['F', 'U2', "R'"]);
  });
});
