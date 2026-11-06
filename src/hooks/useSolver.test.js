import { describe, it, expect } from 'vitest';
import { categorizeSteps } from './useSolver.js';

describe('categorizeSteps', () => {
  it('returns a single "Solved!" step for an empty solution', () => {
    const steps = categorizeSteps([]);
    expect(steps).toHaveLength(1);
    expect(steps[0].stage).toBe('Solved!');
    expect(steps[0].move).toBe('');
  });

  it('numbers steps sequentially and preserves the move', () => {
    const steps = categorizeSteps(['R', 'U', "R'", "U'"]);
    expect(steps).toHaveLength(4);
    expect(steps.map((s) => s.n)).toEqual([1, 2, 3, 4]);
    expect(steps.map((s) => s.move)).toEqual(['R', 'U', "R'", "U'"]);
  });

  it('gives every step a human-readable explanation', () => {
    const steps = categorizeSteps(['R', 'U2']);
    expect(steps[0].explain).toMatch(/right \(R\) face/i);
    expect(steps[1].explain).toMatch(/180/);
  });

  it('splits phase 1 (reduce) from phase 2 (solve)', () => {
    // R and R' are phase-1 moves; the trailing U/U' fall into phase 2.
    const steps = categorizeSteps(['R', 'U', "R'", "U'"]);
    expect(steps.map((s) => s.phase)).toEqual([1, 1, 1, 2]);
    expect(steps[0].stage).toMatch(/Phase 1 — Reduce/);
    expect(steps[3].stage).toMatch(/Phase 2 — Solve/);
  });

  it('treats an all-G1 sequence as entirely phase 2', () => {
    const steps = categorizeSteps(['U', 'D', 'R2', 'L2']);
    expect(steps.every((s) => s.phase === 2)).toBe(true);
    // Step numbering within the phase restarts at 1.
    expect(steps[0].stage).toMatch(/\(1\)/);
  });

  it('adds an intro tip on the first step', () => {
    const steps = categorizeSteps(['R', 'U']);
    expect(steps[0].tip).toMatch(/Kociemba/);
  });
});
