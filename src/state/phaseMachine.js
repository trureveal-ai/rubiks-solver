// Phase state machine for the solver flow.
//
//   input ──SOLVE_START──▶ solving ──SOLVE_SUCCESS──▶ solution
//     ▲                       │                          │
//     └──────── SOLVE_CANCEL / SOLVE_ERROR ◀────────────┘ (RESET)
//
// Any action that isn't valid for the current phase is a no-op (returns the
// current state), which keeps stray dispatches from corrupting the UI.

export const PHASES = Object.freeze({
  INPUT: "input",
  SOLVING: "solving",
  SOLUTION: "solution",
});

export const PHASE_ACTIONS = Object.freeze({
  SOLVE_START: "SOLVE_START",
  SOLVE_SUCCESS: "SOLVE_SUCCESS",
  SOLVE_CANCEL: "SOLVE_CANCEL",
  SOLVE_ERROR: "SOLVE_ERROR",
  RESET: "RESET",
});

const TRANSITIONS = {
  [PHASES.INPUT]: {
    [PHASE_ACTIONS.SOLVE_START]: PHASES.SOLVING,
  },
  [PHASES.SOLVING]: {
    [PHASE_ACTIONS.SOLVE_SUCCESS]: PHASES.SOLUTION,
    [PHASE_ACTIONS.SOLVE_CANCEL]: PHASES.INPUT,
    [PHASE_ACTIONS.SOLVE_ERROR]: PHASES.INPUT,
  },
  [PHASES.SOLUTION]: {
    [PHASE_ACTIONS.RESET]: PHASES.INPUT,
  },
};

export function phaseReducer(phase, action) {
  const type = typeof action === "string" ? action : action?.type;
  return TRANSITIONS[phase]?.[type] ?? phase;
}

export const INITIAL_PHASE = PHASES.INPUT;
