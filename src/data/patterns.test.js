import { describe, it, expect } from 'vitest';
import { PATTERNS } from './patterns.js';
import { initCube, MOVE_FN, applyMoveString } from '../engine/cube.js';
import { validateCube } from '../engine/validate.js';

const SOLVED = JSON.stringify(initCube());

describe('pattern library', () => {
  it('ships a reasonable number of patterns', () => {
    expect(PATTERNS.length).toBeGreaterThanOrEqual(10);
    expect(PATTERNS.length).toBeLessThanOrEqual(15);
  });

  it('every pattern has a unique name and a move string', () => {
    const names = PATTERNS.map((p) => p.name);
    expect(new Set(names).size).toBe(names.length);
    for (const p of PATTERNS) {
      expect(typeof p.name).toBe('string');
      expect(p.name.length).toBeGreaterThan(0);
      expect(typeof p.moves).toBe('string');
      expect(p.moves.trim().length).toBeGreaterThan(0);
    }
  });

  for (const p of PATTERNS) {
    describe(p.name, () => {
      const tokens = p.moves.trim().split(/\s+/);

      it('uses only engine-supported face turns', () => {
        const bad = tokens.filter((m) => !MOVE_FN[m]);
        expect(bad).toEqual([]);
      });

      it('applies from a solved cube to a physically valid cube', () => {
        const cube = applyMoveString(initCube(), p.moves);
        expect(validateCube(cube)).toEqual([]);
      });

      it('produces a non-solved pattern', () => {
        const cube = applyMoveString(initCube(), p.moves);
        expect(JSON.stringify(cube)).not.toBe(SOLVED);
      });
    });
  }
});
