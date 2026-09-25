---
inclusion: manual
---

# Performance Guidelines

## Budgets

| Metric | Target | Critical |
|--------|--------|----------|
| Initial JS bundle (gzipped) | < 80KB | < 120KB |
| Time to Interactive | < 2s on 3G | < 4s |
| Puzzle generation | < 500ms | < 1000ms |
| Hint detection (all techniques) | < 200ms | < 500ms |
| Single cell re-render | < 4ms | < 16ms |
| Full board re-render | < 16ms | < 32ms |

## Solver Performance

- Pre-compute `PEERS[]` once at module load — O(1) peer lookups.
- Use bitwise operations for candidate sets where performance-critical.
- MRV heuristic reduces backtracking branching by 10-100x vs linear scan.
- `countSolutions(board, 2)` stops at 2 — never enumerate all solutions.

## Rendering

- Avoid full board re-renders when only one cell changes — use `updateCell(idx)`.
- Batch DOM reads before DOM writes to prevent layout thrashing.
- Use CSS `transform` and `opacity` for animations (GPU-composited).
- Avoid `getBoundingClientRect()` during animation frames.

## Technique Detection

- Order techniques simplest-first — most puzzles resolve with Naked/Hidden Singles.
- `getHint()` returns on first match — no need to run all detectors.
- Pre-compute unit membership lookups (which units contain cell X).
- Cache `buildCandidates()` result between hint requests if board hasn't changed.

## Memory

- Undo stack capped at 100 entries (shift oldest when exceeded).
- Candidate Sets use native `Set<number>` (V8-optimized for small integer sets).
- Avoid creating closures in hot loops (technique detectors, render loops).

## Measurement

- Use `performance.mark()` / `performance.measure()` for solver timing.
- Chrome DevTools Performance tab for render profiling.
- Lighthouse CI for bundle size and TTI tracking.
