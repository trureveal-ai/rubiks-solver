# Changelog

All notable changes to Rubiksology are documented in this file.

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
This project uses [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.2.0] — 2026-11-04

### Added
- **Multi-orientation search** — solver tries all 24 cube orientations and returns the shortest solution found, with early termination at ≤18 moves
- **Solver progress reporting** — live feedback during table initialization (move tables / pruning tables with percentage) and during solve (orientation count, best solution found so far, iteration count)
- **Cancel button** — users can abort an in-progress solve and return to the input screen
- **Phase-aware step descriptions** — solution steps are labeled as "Phase 1 — Reduce" or "Phase 2 — Solve" with numbered sub-steps within each phase
- **Rich move explanations** — each step now shows full descriptions like "Rotate the right (R) face 90° clockwise" instead of generic "Move N" labels
- Phase transition tips explaining G1 subgroup reduction and Phase 2 constraints
- Solver cancel mechanism via `cancelSolve()` export from kociemba.js

### Changed
- Solver badge now shows "MULTI-ORIENTATION SEARCH" instead of "≤22 MOVES"
- Init progress badge shows table name and percentage during Kociemba initialization
- Solving screen shows orientation progress and best move count found so far
- Phase 1 steps colored orange, Phase 2 steps colored blue in solution view
- `initKociemba()` now accepts an `onProgress` callback for table build reporting
- `solveFromFacelets()` accepts options object with `multiOrientation` and `onProgress`

### Fixed
- Solver no longer silently blocks during long solves — progress visible at all times

---

## [1.1.0] — 2026-11-04

### Added
- Three custom React hooks extracted from App.jsx: `useCubeState`, `useSolver`, `useAnimation`
- Persistent Web Worker — solver pruning tables now build once on app load and persist across solves
- Cubic ease-out animation on 3D cube rotations (`1 - (1-t)³`)
- WebGL detection with graceful fallback message for unsupported browsers
- React ErrorBoundary in main.jsx to prevent blank-page crashes
- WebGL-specific error boundary in ThreeCube

### Changed
- App.jsx refactored from ~498 lines to 314 lines (hooks extraction)
- Solver worker no longer created/destroyed per solve — single persistent instance at module level
- Solution playback animation uses eased interpolation instead of linear

### Removed
- ~37 debug `console.log`/`warn`/`error` statements from kociemba.js and solve.worker.js
- Performance-killing debug verification in `next1()` that created a new Cube and computed `twist()` on every Phase 1 node expansion (millions of times per solve)
- Dead `Cube3D.jsx` component (legacy CSS-based 3D cube, replaced by ThreeCube)
- Dead `T3D` export from cube.js
- "Beginner AI" solver mode (app now uses Kociemba exclusively)
- 18 debug/test buttons from the UI

### Fixed
- Solver initialization race condition — worker now reports 'ready' state before solve is enabled

---

## [1.0.0] — 2026-04-16

Initial release of Rubiksology.

### Added
- Full Rubik's Cube solver web application
- Kociemba two-phase algorithm (IDA* with pruning tables) implemented in pure JavaScript
- Web Worker-based solver to keep UI responsive during computation
- 3D cube visualization with Three.js (@react-three/fiber, @react-three/drei)
- 2D color painting interface with cross and grid layouts
- Click-to-paint and cycle-through-colors modes
- Algorithm input field supporting standard Rubik's notation (R, U, F, D, L, B and their primes/doubles)
- Animated algorithm application
- One-click scramble generator with animated scrambling
- Step-by-step solution playback with forward/back navigation
- Auto-play mode with three speed settings (0.5×, 1×, 2×)
- Jump-to-step and view-all-moves list
- Cube state validation with parity checking (corner twist sum, edge flip sum, permutation parity)
- OrbitControls for 3D view rotation
- Dark theme UI
- GitHub Pages deployment configuration

### Technical
- React 18, Vite 5, Three.js stack
- Cube state represented as face arrays with color strings (Y, R, B, W, O, G)
- Yellow-top, blue-front orientation convention
- Animation invariant: cube state updates only after animation completes
- `verifyParity()` used to distinguish unsolvable physical cubes from solver bugs

---

[1.2.0]: https://github.com/trureveal-ai/rubiks-solver/compare/306ce99...HEAD
[1.1.0]: https://github.com/trureveal-ai/rubiks-solver/compare/a0c26bb...306ce99
[1.0.0]: https://github.com/trureveal-ai/rubiks-solver/commit/a0c26bb
