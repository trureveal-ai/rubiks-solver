# Rubiksology — Rubik's Cube Solver

A web-based Rubik's Cube solver featuring a 3D interactive cube, 2D color painting interface, and an optimal Kociemba two-phase solving engine that guarantees solutions in ≤22 moves.

**[Live Demo →](https://trureveal-ai.github.io/rubiks-solver/)**

---

## Features

- **Kociemba Two-Phase Solver** — JavaScript implementation of Herbert Kociemba's algorithm running in a persistent Web Worker. Finds near-optimal solutions (typically ≤20 moves) for any valid cube state.
- **3D Cube Visualization** — Real-time Three.js rendering with orbit controls, eased rotation animations, and step-by-step solution playback.
- **2D Paint Interface** — Click-to-paint or cycle-through-colors mode with cross and grid layouts. Enter your physical cube's colors, then hit solve.
- **Algorithm Input** — Type standard notation (e.g. `R U R' U'`) to apply moves instantly or watch them animate.
- **Scramble Generator** — One-click random scramble with animated application.
- **Solution Playback** — Step forward/back, auto-play at three speeds (0.5×, 1×, 2×), jump to any move, view all moves at a glance.
- **WebGL Fallback** — Graceful degradation when WebGL isn't available.
- **Error Boundaries** — React error boundaries prevent blank-page crashes.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | React 18 |
| Build | Vite 5 |
| 3D Rendering | Three.js, @react-three/fiber, @react-three/drei |
| Solver | Custom Kociemba two-phase IDA* (pure JS, Web Worker) |
| Deployment | GitHub Pages via `gh-pages` |

## Project Structure

```
src/
├── main.jsx                  # Entry point with ErrorBoundary
├── App.jsx                   # Main app shell and UI (314 lines)
├── components/
│   ├── Cell.jsx              # Single sticker in flat view
│   ├── FlatFace.jsx          # 3×3 face grid for paint mode
│   ├── MoveBadge.jsx         # Animated move notation badge
│   ├── ScrambleBanner.jsx    # Scramble sequence display
│   └── ThreeCube.jsx         # Three.js cube with animation
├── engine/
│   ├── cube.js               # Cube data model, moves, scramble
│   ├── kociemba.js           # Kociemba two-phase algorithm
│   ├── solve.worker.js       # Web Worker wrapper for solver
│   └── validate.js           # Cube state validation + parity check
└── hooks/
    ├── useCubeState.js       # Cube state, painting, undo, scramble
    ├── useSolver.js          # Persistent worker, init, solve
    └── useAnimation.js       # Playback, step nav, auto-play
```

## Getting Started

### Prerequisites

- Node.js 18+
- npm 9+

### Install & Run

```bash
git clone https://github.com/trureveal-ai/rubiks-solver.git
cd rubiks-solver
npm install
npm run dev
```

Open [http://localhost:5173/rubiks-solver/](http://localhost:5173/rubiks-solver/) in your browser.

### Build for Production

```bash
npm run build
npm run preview   # preview the production build locally
```

### Deploy to GitHub Pages

```bash
npm run deploy
```

## How It Works

### Cube Conventions

- **Orientation**: Yellow top, Blue front
- **Color codes**: Y (yellow), R (red), B (blue), W (white), O (orange), G (green)
- **Face arrays**: Each face is a 9-element array indexed left-to-right, top-to-bottom
- **Step semantics**: Step 0 = scrambled start state, step N = N moves applied

### Solver Architecture

The Kociemba two-phase algorithm works by:

1. **Phase 1** — Reduces the cube to the "G1" subgroup (edges oriented, corners oriented, E-slice edges in E-slice) using coordinate-based IDA* search with pruning tables.
2. **Phase 2** — Solves from G1 to the identity using a restricted move set, again with IDA* and pruning tables.

Pruning tables are computed once when the worker initializes (~2–4 seconds on first load) and persist in memory for the session — subsequent solves return in milliseconds.

### Animation Pipeline

1. `animTrigger` prop fires → ThreeCube `useEffect` picks it up
2. `useFrame` interpolates rotation with cubic ease-out: `1 - (1-t)³`
3. On completion, `onAnimationDone` callback fires
4. Parent hook updates cube state **only after animation finishes** (critical invariant)

## Version History

See [CHANGELOG.md](./CHANGELOG.md) for the full version history.

## License

MIT

## Author

**Cam** — [trureveal-ai](https://github.com/trureveal-ai)
