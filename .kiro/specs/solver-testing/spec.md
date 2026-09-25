# Solver Testing Specification

## Goals
- Establish comprehensive test coverage for the Sudoku solver using property-based testing
- Prove solver correctness: every generated puzzle is solvable and has exactly one solution
- Prove technique correctness: every elimination/placement is valid
- Create a regression safety net before any refactoring or new technique development

## Requirements

### R1: Test Infrastructure
- Install Vitest as test runner
- Install fast-check for property-based testing
- Configure test scripts in package.json (`test`, `test:watch`, `test:cov`)
- Coverage threshold: 90% for core/ modules

### R2: Solver Property Tests
- Property: `isValid(solve(anyValidPartialBoard))` is always true
- Property: `solve(generate(difficulty).puzzle)` equals `generate(difficulty).solution`
- Property: `countSolutions(generate(difficulty).puzzle, 2) === 1`
- Property: `generate(difficulty).puzzle` has correct number of non-zero cells for difficulty
- Property: `solve(emptyBoard)` fills all 81 cells with valid digits
- Property: `canPlace` correctly identifies legal placements

### R3: Technique Detector Tests
- Each of the 16 techniques has at minimum:
  - 3 positive cases (known board + candidates where technique fires)
  - 2 negative cases (similar state where technique should NOT fire)
  - Verification: applying eliminations doesn't break solution uniqueness
  - Verification: placement digit matches known solution
- Test fixture format: board array + expected HintResult (technique name + eliminations)

### R4: Integration Tests
- Game flow: new game → place digits → undo → redo → verify state consistency
- Mistake detection: wrong digit increments counter, correct digit doesn't
- Win condition: filling all cells correctly triggers win
- Empty mode: solve arbitrary user-entered puzzles correctly

### R5: Regression Tests
- Specific puzzle inputs that historically caused issues
- Edge cases: almost-full boards, boards with only 1 empty cell, multiple solutions (should return null from generate)

## Acceptance Criteria
- [ ] `npm run test` passes with 0 failures
- [ ] Coverage report shows ≥90% on `solver.ts`
- [ ] Coverage report shows ≥90% on `techniques/*.ts`
- [ ] Property tests run 100 iterations in CI (configurable)
- [ ] All 16 technique detectors have passing positive and negative tests
- [ ] CI integration: tests run on every push

## Implementation Notes
- Create test fixtures as constant arrays (known puzzle states)
- Use `fc.integer({min:0, max:80})` for cell index generation
- Use `fc.integer({min:1, max:9})` for digit generation
- Generate random valid partial boards by solving a blank board and then removing random cells
- Technique tests: use known published Sudoku puzzles where specific techniques are required
- The test file structure mirrors the source: `solver.test.ts`, `techniques/naked-single.test.ts`

## Risks
| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Property tests too slow in CI | Medium | Medium | Cap at 100 iterations; use `fc.seed()` for reproducibility |
| Finding good technique test fixtures | Medium | Low | Use online Sudoku databases; manually construct minimal cases |
| Flaky tests due to randomness | Low | High | Fix seeds in CI; use `fc.seed()` for deterministic runs |
| Technique test false negatives | Low | Medium | Also verify via solving: if technique says place X, solve confirms X |
