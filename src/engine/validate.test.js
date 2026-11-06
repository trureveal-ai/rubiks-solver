import { describe, it, expect } from 'vitest';
import { validateCube } from './validate.js';
import { initCube, copyCube } from './cube.js';

describe('validateCube', () => {
  it('reports no errors for a solved cube', () => {
    expect(validateCube(initCube())).toEqual([]);
  });

  it('flags a wrong sticker count', () => {
    const cube = copyCube(initCube());
    cube.U[0] = 'W'; // now 8 Y and 10 W
    const errors = validateCube(cube);
    expect(errors.some((e) => e.includes('Yellow') && e.includes('8/9'))).toBe(true);
    expect(errors.some((e) => e.includes('White') && e.includes('10/9'))).toBe(true);
  });

  it('flags two faces sharing the same center color', () => {
    const cube = copyCube(initCube());
    cube.F[4] = 'Y'; // F center now matches U center
    const errors = validateCube(cube);
    expect(errors).toContain('Two faces share the same center color');
  });

  it('flags an invalid corner (no up/down sticker)', () => {
    const cube = copyCube(initCube());
    // URF corner = [U[8], R[0], F[2]]. Make none of them Y/W.
    cube.U[8] = 'R';
    const errors = validateCube(cube);
    expect(errors.some((e) => e.startsWith('Corner URF invalid'))).toBe(true);
  });

  it('flags an invalid edge (opposite colors)', () => {
    const cube = copyCube(initCube());
    // UR edge = [U[5], R[1]] = [Y, R]. Make it Y/W (opposite pair).
    cube.R[1] = 'W';
    const errors = validateCube(cube);
    expect(errors.some((e) => e.startsWith('Edge UR invalid'))).toBe(true);
  });

  it('returns an array of strings', () => {
    const errors = validateCube(initCube());
    expect(Array.isArray(errors)).toBe(true);
  });
});
