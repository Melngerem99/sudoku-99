---
inclusion: always
---

# Testing Strategy

## Framework

- **Test runner:** Vitest
- **Property-based testing:** fast-check
- **Coverage target:** 90%+ for core/ modules, 70%+ for UI integration

## Test Categories

### 1. Solver Correctness (Property-Based)

- Every generated puzzle has exactly one solution.
- `solve(puzzle)` always returns the same solution for a given puzzle.
- `isValid(solve(puzzle))` is always true.
- Generated puzzles have the correct number of clues for their difficulty.
- `countSolutions(solvedBoard) === 1`.

### 2. Technique Detectors (Unit Tests)

Each technique detector must have:
- At least 3 positive test cases (known board states where the technique applies).
- At least 2 negative test cases (states where the technique should NOT fire).
- Verification that eliminations are correct (removing the candidate doesn't break uniqueness).
- Verification that placements are correct (placed digit matches the solution).

### 3. Game State (Integration Tests)

- Place digit → board updates, candidates propagate, undo stack grows.
- Undo → state matches previous snapshot exactly.
- Redo after undo → state matches the action that was undone.
- Mistake detection → correct digit = no mistake; wrong digit = mistake count increases.
- Win condition → all cells match solution triggers win state.
- Persistence → state survives page reload (via mock localStorage).

### 4. UI (Smoke Tests)

- Grid renders 81 cells with correct ARIA attributes.
- Clicking a cell emits `cellClick` event.
- Hint panel opens/closes without errors.
- Dark mode toggle persists preference.

## Running Tests

```bash
npm run test        # Run all tests once
npm run test:watch  # Watch mode during development
npm run test:cov    # Generate coverage report
```

## Property Test Guidelines

- Use `fc.integer({min: 0, max: 80})` for cell indices.
- Use `fc.integer({min: 1, max: 9})` for digits.
- Generate random valid boards by running the solver on empty boards with random seeds.
- Cap property test iterations at 100 for CI speed; use 1000 locally.

## Test File Naming

- `solver.test.ts` alongside `solver.ts`
- `techniques/naked-single.test.ts` alongside `naked-single.ts`
- Place in `__tests__/` directory or co-located — prefer co-located for core modules.
