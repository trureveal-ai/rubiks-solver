import { describe, it, expect } from 'vitest';
import { phaseReducer, PHASES, PHASE_ACTIONS, INITIAL_PHASE } from './phaseMachine.js';

describe('phaseReducer', () => {
  it('starts in the input phase', () => {
    expect(INITIAL_PHASE).toBe(PHASES.INPUT);
  });

  it('input -> solving on SOLVE_START', () => {
    expect(phaseReducer(PHASES.INPUT, PHASE_ACTIONS.SOLVE_START)).toBe(PHASES.SOLVING);
  });

  it('solving -> solution on SOLVE_SUCCESS', () => {
    expect(phaseReducer(PHASES.SOLVING, PHASE_ACTIONS.SOLVE_SUCCESS)).toBe(PHASES.SOLUTION);
  });

  it('solving -> input on SOLVE_CANCEL', () => {
    expect(phaseReducer(PHASES.SOLVING, PHASE_ACTIONS.SOLVE_CANCEL)).toBe(PHASES.INPUT);
  });

  it('solving -> input on SOLVE_ERROR', () => {
    expect(phaseReducer(PHASES.SOLVING, PHASE_ACTIONS.SOLVE_ERROR)).toBe(PHASES.INPUT);
  });

  it('solution -> input on RESET', () => {
    expect(phaseReducer(PHASES.SOLUTION, PHASE_ACTIONS.RESET)).toBe(PHASES.INPUT);
  });

  it('accepts an action object with a type field', () => {
    expect(phaseReducer(PHASES.INPUT, { type: PHASE_ACTIONS.SOLVE_START })).toBe(PHASES.SOLVING);
  });

  it('is a no-op for actions invalid in the current phase', () => {
    // RESET is only valid from solution.
    expect(phaseReducer(PHASES.INPUT, PHASE_ACTIONS.RESET)).toBe(PHASES.INPUT);
    // SOLVE_START is only valid from input.
    expect(phaseReducer(PHASES.SOLVING, PHASE_ACTIONS.SOLVE_START)).toBe(PHASES.SOLVING);
    expect(phaseReducer(PHASES.SOLUTION, PHASE_ACTIONS.SOLVE_SUCCESS)).toBe(PHASES.SOLUTION);
  });

  it('is a no-op for an unknown action', () => {
    expect(phaseReducer(PHASES.INPUT, 'NOPE')).toBe(PHASES.INPUT);
    expect(phaseReducer(PHASES.SOLVING, undefined)).toBe(PHASES.SOLVING);
  });
});
