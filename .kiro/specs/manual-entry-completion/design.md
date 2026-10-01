# Design Document — Phase 12.0 Manual Entry Completion

## Overview

All eight production functions under test (`loadManualEntry`, `cancelManualEntry`, `clearManualEntry`, `finishManualEntry`, and the downstream `importPuzzle` / `autoFillCandidates`) are already implemented and stable. This phase adds test coverage only. No production files are modified.

Tests are appended to `web/tests/game-controller.test.js` as eight new `h.describe` blocks, following the patterns established by the existing game-controller tests.

## Architecture

### Layer being tested

```
┌─────────────────────────────────────────┐
│  game-controller.ts (Controller Layer)  │  ← system under test
├─────────────────────────────────────────┤
│  validate() / solve() / Statistics /    │  ← real implementations (no mocks)
│  Persistence / UI                       │
└─────────────────────────────────────────┘
```

Tests run against the compiled CJS test bundle (`web/dist/test-bundle.cjs`), which includes all modules. The `loadApp()` helper provides a fully-wired instance with a `MockDocument` and a `createIntervalClock()` that lets tests observe `setInterval` handles without real time passing.

### Test helpers used (no new infrastructure needed)

| Helper | Source | Purpose |
|--------|--------|---------|
| `loadApp(storage?, difficulty?, seed?)` | existing | Boot controller with mock DOM and storage |
| `seedGame(Persistence, difficulty)` | existing | Write FIXTURE_PUZZLE state before `initGameController()` |
| `h.FIXTURE_PUZZLE` | existing | A valid, unique 81-cell puzzle |
| `h.FIXTURE_SOLUTION` | existing | Known solution for FIXTURE_PUZZLE |
| `h.assertEqual / h.assert` | existing | Assertion primitives |
| `dispatchKey(target, key, modifiers)` | existing | Simulate keyboard events on elements |
| `createIntervalClock()` | existing | Intercepts `setInterval`; `size` reflects active timers |

### How to enter manual entry mode in tests

`btn-manual-entry` click opens a modal. The confirm button in that modal calls `loadManualEntry()`. In the test harness this is done by:

```js
document.getElementById('btn-manual-entry').click();
// The modal footer's first child is the primary button ("Start Entry")
document.getElementById('modal-footer').children[0].click();
```

### How to place digits during manual entry

The `digitInput` event fired by the UI is the standard pathway. In tests we trigger it via the `on('digitInput', ...)` event system, which the harness exposes via the synthetic event dispatch already used in keyboard navigation tests. For manual-entry-specific placement, simulating `dispatchKey` on a cell with a digit key is the most consistent approach — matching how the existing grid keyboard tests work.

Alternatively, cells can be clicked (triggering `cellClick`) and then a digit key dispatched:

```js
UI.cells[idx].click();               // selectCell(idx)
dispatchKey(UI.cells[idx], '5');     // placeDigit(5) via keydown handler
```

### How to build board states for validation-path tests

**Conflicting board**: Use `h.FIXTURE_PUZZLE` as a base and overwrite one cell so the same digit appears twice in a row or column. For example, place `5` at index 1 (row 0, col 1) when index 0 already holds `5`.

**No-solution board**: A standard technique is to fill a partial set of cells that are each individually valid but collectively leave no completion path. A known minimal example: place `1` at (row 0, col 0), `2` at (row 0, col 3), `3` at (row 0, col 6), `4` at (row 1, col 0), `5` at (row 1, col 3), `6` at (row 1, col 6), `7` at (row 2, col 0), `8` at (row 2, col 3), `9` at (row 2, col 6) — all nine digits used in the first three rows' first column of each box; combined with `1` at (row 0, col 1), `2` at (row 1, col 1), `3` at (row 2, col 1) this creates a contradiction. The simplest route in practice is a known-conflict-free near-complete board where one row is left with all nine digits assigned but one column's constraints make the remaining empty cell impossible. For the test suite a concrete board array is defined inline.

**Multiple-solutions board**: Entering only 2–3 digits (e.g., `5` at index 0 and `3` at index 1) guarantees many solutions because the constraint count is far below the 17-clue minimum.

### Observing state

| What to check | How |
|---|---|
| Toolbar hidden | `document.getElementById('toolbar').hidden` |
| EntryActions visible | `!document.getElementById('manual-entry-actions').hidden` |
| Active intervals | `clock.intervals.size` (2 = playing, 0 = entry/paused) |
| Modal shown | `document.getElementById('modal-overlay').classList.contains('active')` |
| Modal title | `document.getElementById('modal-title').textContent` |
| Cell digit text | `global.UI.cells[idx].querySelector('.cell-digit').textContent` |
| Cell candidate count | `global.Persistence.load().candidates[idx].size` or via UI cells |
| Statistics | `global.Statistics.getStats().perDifficulty.imported.started` |
| Persisted difficulty | `global.Persistence.load().currentDifficulty` |
| Board contents | `global.Persistence.load().board[idx]` |

## Test Suite Design

### Suite 1 — Manual entry lifecycle (Requirements 1.1–1.4)

1. Assert initial state: toolbar visible, entry actions hidden.
2. Trigger `btn-manual-entry` → confirm modal → assert toolbar hidden, entry actions visible.
3. Dispatch a digit key on an empty cell → assert cell displays the digit.
4. Click `manual-entry-clear` → assert that cell (and others) are cleared.

### Suite 2 — Finish entry: valid puzzle (Requirements 2.1–2.5)

1. Enter `h.FIXTURE_PUZZLE` digits cell-by-cell (only the non-zero cells; manual entry starts with a blank board, so every cell is editable).
2. Click `manual-entry-finish`.
3. Assert: modal not active, `clock.intervals.size === 2`, `Statistics.imported.started === 1`, `Persistence.currentDifficulty === 'imported'`, toolbar visible.

**Implementation note**: Entering all 81 cells individually is slow; the cleaner approach is to use the `on('digitInput', ...)` event pathway or directly invoke `UI.cells[idx].click()` + `dispatchKey(cell, digit)` only for the 30–35 clue cells in FIXTURE_PUZZLE, skipping zeros.

### Suite 3 — Finish entry: conflicting digits (Requirements 3.1–3.2)

1. Enter two identical digits that share a row (e.g., place `5` at cells 0 and 1 in row 0).
2. Click `manual-entry-finish`.
3. Assert modal title is `"Conflicting Entries"`, toolbar still hidden.

### Suite 4 — Finish entry: no solution (Requirements 4.1–4.2)

1. Enter a known-unsolvable partial board (defined as a constant in the test file).
2. Click `manual-entry-finish`.
3. Assert modal title is `"No Solution"`, toolbar still hidden.

### Suite 5 — Finish entry: multiple solutions (Requirements 5.1–5.2)

1. Enter only 2 digits at cells 0 and 1.
2. Click `manual-entry-finish`.
3. Assert modal title is `"Multiple Solutions"`, toolbar still hidden.

### Suite 6 — Cancel restore (Requirements 6.1–6.4)

1. `loadApp()` with default seed (FIXTURE_PUZZLE, medium difficulty).
2. Enter manual entry mode.
3. Overwrite several cells with new digits.
4. Click `manual-entry-cancel`.
5. Assert: each previously-overwritten cell now shows its FIXTURE_PUZZLE digit, `clock.intervals.size === 2`, toolbar visible, `Persistence.currentDifficulty === 'medium'`.

### Suite 7 — Persistence isolation (Requirements 7.1–7.2)

1. `loadApp()` with default seed.
2. Record the pre-entry `Persistence.load()` board snapshot.
3. Enter manual entry mode.
4. Place several digits in cells that were previously empty.
5. Assert `Persistence.load().board` still matches the pre-entry snapshot (unchanged).

### Suite 8 — Auto-fill candidates blocked / available (Requirements 8.1–8.2)

1. Enter manual entry mode.
2. Click `btn-auto-candidates`.
3. Assert that `Persistence.load().candidates` (or directly checking `UI.cells` state) shows no populated candidate sets.
4. Finish entry with FIXTURE_PUZZLE.
5. Click `btn-auto-candidates`.
6. Assert that at least one empty cell now has a non-empty candidate set.

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

All acceptance criteria in this spec were classified as **EXAMPLE** tests during prework analysis. The reasons are:

- Every test exercises a specific, well-defined state transition driven by a concrete sequence of UI events or a particular board fixture.
- The production functions under test (`loadManualEntry`, `cancelManualEntry`, `clearManualEntry`, `finishManualEntry`) are integration-level wiring of already-tested primitives (`validate`, `solve`, `buildCandidates`, `saveImmediate`). The solver and candidate logic have their own property-based tests in `solver.test.ts`.
- Running `validate()` or `countSolutions()` 100 times with randomly generated boards would replicate the solver's existing property tests, not add coverage of the controller wiring.
- The one candidate for a round-trip property (backup → enter → cancel → state unchanged) is meaningful but its output space is determined by a single fixture rather than an unbounded input domain. The example test covers the property fully.

Because no acceptance criterion meets the criteria for PBT (behavior varies meaningfully with input AND testing OUR code AND 100 iterations would find more bugs than 2–3), this design intentionally contains no property-based tests. All eight suites use example-based assertions. This is consistent with the project's testing rules for UI integration and controller-level wiring.
