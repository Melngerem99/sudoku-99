# Architecture Overview

## Platform Strategy

| Platform | Status | Directory | Technology |
|----------|--------|-----------|-----------|
| Web | **Active development** | `src/`, `web/` | TypeScript (strict mode) + esbuild |
| Desktop | Archived | `include/`, `src/widgets/`, `ui/` | Qt 5.13 C++ |

All development targets the web application.

## Web Application Architecture

### Layer Diagram

```
┌─────────────────────────────────────────────────────────────┐
│  web/index.html                                              │
│  Static markup, ARIA structure, overlays                     │
├─────────────────────────────────────────────────────────────┤
│  UI Layer (src/ui/)                                          │
│  - ui.ts: DOM building, cell rendering, events, modals       │
│  - dom-helpers.ts: typed element access ($btn, setText)      │
├─────────────────────────────────────────────────────────────┤
│  Controllers (src/controllers/)                              │
│  - statistics-controller.ts                                  │
│  - analysis-controller.ts                                    │
│  - import-controller.ts                                      │
│  - library-controller.ts                                     │
│  - daily-controller.ts                                       │
│  - step-solver-controller.ts                                 │
├─────────────────────────────────────────────────────────────┤
│  Game Controller (src/game-controller.ts)                    │
│  - Centralized game state and pause lifecycle                │
│  - Action handlers (place, erase, undo, redo, hint)          │
│  - Timer, win/loss, persistence routing                      │
│  - Controller initialization + callback injection            │
├─────────────────────────────────────────────────────────────┤
│  Services (src/services/)                                    │
│  - generator.ts: adaptive difficulty-aware puzzle generation  │
│  - persistence.ts: localStorage auto-save/restore            │
│  - statistics.ts: player performance tracking                │
│  - daily.ts: seeded PRNG daily challenges and date-bound save │
│  - library.ts: puzzle save/browse/filter                     │
│  - import-export.ts: puzzle I/O, URL sharing                 │
├─────────────────────────────────────────────────────────────┤
│  Core (src/core/)                                            │
│  - solver.ts: validate, solve, generate, count solutions     │
│  - techniques.ts: 22 implemented detectors, getHint          │
│  - step-solver.ts: logical solve path computation            │
│  - difficulty.ts: weighted scoring classification            │
│  - Pure functions, no DOM dependency                         │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow

```
User Action → UI Event → Game Controller → Core/Service → State Mutation → render()
                                                                                ↓
                                                          UI.renderBoard(state) ← ┘
```

### Module Dependencies

```
src/main.ts (entry + shims + bootstrap)
├── src/game-controller.ts
│   ├── src/core/solver.ts
│   ├── src/core/techniques.ts → solver.ts
│   ├── src/core/step-solver.ts → solver.ts, techniques.ts
│   ├── src/core/difficulty.ts
│   ├── src/services/generator.ts → solver.ts, step-solver.ts, difficulty.ts
│   ├── src/services/persistence.ts
│   ├── src/services/statistics.ts
│   ├── src/services/daily.ts → solver.ts
│   ├── src/services/import-export.ts → solver.ts
│   ├── src/ui/ui.ts → solver.ts
│   ├── src/ui/dom-helpers.ts
│   └── src/controllers/* → services/*, core/*, ui/*
└── Window shims (16 backward-compat globals)
```

## State Model

```typescript
// Centralized in src/game-controller.ts
interface Snapshot { board: Board; candidates: CandidateGrid; }

let board: Board;                      // 0 = empty, 1-9 = digit
let solution: Board;                   // correct answer
let givens: Board;                     // original clues
let candidates: CandidateGrid;         // Set<number>[81] pencil marks
let selectedIdx: number | null;        // focused cell
let activeDigit: number | null;        // numpad highlight
let pencilMode: boolean;
let mistakes: number;
let timerSeconds: number;
let pauseReasons: Set<'user' | 'background' | 'step-solver'>;
let activeDailyDateKey: string | null;
let gameOver: boolean;
let gameWon: boolean;
let history: Snapshot[];               // undo stack
let future: Snapshot[];                // redo stack
```

## Build System

- **Bundler:** esbuild (IIFE bundle for production, CJS for tests)
- **Language:** TypeScript (`strict: true`, `exactOptionalPropertyTypes: true`)
- **Tests:** Custom Node.js runner (400 tests)
- **Type checking:** `tsc --noEmit`

```
npm run build      → web/dist/main.js (~91KB IIFE, ~27KB gzip)
npm run build:test → web/dist/test-bundle.cjs (test bundle)
npm run typecheck  → tsc --noEmit (strict mode)
npm test           → 400 tests
npm run verify     → build + typecheck + test
```

## File Map

| Path | Role |
|------|------|
| `src/core/solver.ts` | Solver engine |
| `src/core/techniques.ts` | 22 technique detectors |
| `src/core/step-solver.ts` | Solve path computation |
| `src/core/difficulty.ts` | Difficulty classification |
| `src/services/generator.ts` | Adaptive generation |
| `src/services/daily.ts` | Daily challenge and date-bound progress |
| `src/services/persistence.ts` | Standard-game save/restore |
| `src/services/statistics.ts` | Performance tracking |
| `src/services/library.ts` | Puzzle library |
| `src/services/import-export.ts` | Puzzle I/O |
| `src/ui/ui.ts` | DOM rendering and panels |
| `src/ui/dom-helpers.ts` | Typed DOM access |
| `src/controllers/*.ts` | Six panel controllers |
| `src/game-controller.ts` | Main game logic, timer, and pause lifecycle |
| `src/main.ts` | Entry, shims, and bootstrap |
| `web/style.css` | Application stylesheet |
| `web/index.html` | Markup structure |
| `scripts/sw.template.js` | Service-worker template |
