---
inclusion: always
---

# Architecture Principles

## Platform Focus

The **web application** (`web/`) is the primary development target. The Qt/C++ desktop app (`desktop/`) is in maintenance mode.

## Layered Architecture

```
┌─────────────────────────────────────────┐
│  UI Layer (ui/)                          │  DOM, rendering, events, animations
├─────────────────────────────────────────┤
│  Controller Layer (app.ts)              │  State management, game flow, wiring
├─────────────────────────────────────────┤
│  Core Layer (core/)                     │  Solver, techniques, types — NO DOM
└─────────────────────────────────────────┘
```

### Rules

1. **Core has zero DOM dependencies.** It must run in Node.js for testing.
2. **UI emits events; controller handles them.** UI never mutates game state directly.
3. **Controller orchestrates.** It calls core functions and tells UI to re-render.
4. **State is centralized** in the controller as a plain object. UI reads; controller writes.

## State Management

- Game state is a plain TypeScript object (board, candidates, history, etc.).
- **Undo/redo** uses immutable snapshots: `{ board: number[], candidates: Set<number>[] }`.
- All mutations go through a central `dispatch` or direct function that pushes history.
- Persistence layer serializes state to localStorage on each mutation.

## Sudoku Domain Model

- **Board:** Flat 81-element `number[]` array. Index = row*9 + col. 0 = empty.
- **Candidates:** 81-element `Set<number>[]` array (pencil marks per cell).
- **Peers:** Pre-computed array of 20 peer indices per cell (row + col + box, excluding self).
- **Units:** 27 units (9 rows + 9 cols + 9 boxes), each a sorted 9-element index array.

## Solver Architecture

- Constraint propagation + backtracking with MRV heuristic.
- Puzzle generation: fill random grid → dig holes → verify uniqueness with `countSolutions(board, 2) === 1`.
- Technique detection: ordered array of detector functions, each returning `HintResult | null`.

## Build & Tooling

- **Bundler:** esbuild (fast, TypeScript-native, IIFE output for browser)
- **Language:** TypeScript (`strict: true`, `exactOptionalPropertyTypes: true`)
- **Tests:** Custom Node.js runner (330 tests, CJS test bundle)
- **Type checking:** `tsc --noEmit`

## Performance Budgets

- Initial page load: < 200KB uncompressed JS (164KB current)
- Puzzle generation: < 500ms on mobile devices
- Hint detection: < 200ms for all 22 techniques
- Re-render: < 16ms (single frame budget)

## File References

- Solver logic: `src/core/solver.ts`
- Technique detectors: `src/core/techniques.ts`
- Step solver: `src/core/step-solver.ts`
- Difficulty: `src/core/difficulty.ts`
- UI layer: `src/ui/ui.ts`
- Game controller: `src/game-controller.ts`
- Entry point: `src/main.ts`
- CSS theming: `web/style.css`
