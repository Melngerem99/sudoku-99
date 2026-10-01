# Implementation Plan: Phase 12.0 Manual Entry Completion

## Overview

Append eight `h.describe` test suites to `web/tests/game-controller.test.js`. No production code changes are made. Each suite corresponds directly to one requirement. The suites share no mutable state — each calls `loadApp()` independently.

## Tasks

- [x] 1. Suite 1 — Manual entry lifecycle
  - Append `h.describe('GameController — manual entry lifecycle', ...)` to `web/tests/game-controller.test.js`
  - Assert initial state: `document.getElementById('toolbar').hidden === false` and `document.getElementById('manual-entry-actions').hidden === true`
  - Click `btn-manual-entry`, then click the primary modal button ("Start Entry") via `document.getElementById('modal-footer').children[0].click()`
  - Assert toolbar is now hidden and entry-actions are visible
  - Dispatch a digit key (`'5'`) on an empty cell; assert `UI.cells[idx].querySelector('.cell-digit').textContent === '5'`
  - Click `manual-entry-clear`; assert that cell (and two others entered beforehand) all show empty text content
  - _Requirements: 1.1, 1.2, 1.3, 1.4_

- [x] 2. Suite 2 — Finish entry: valid unique puzzle
  - Append `h.describe('GameController — manual entry finish: valid puzzle', ...)` to `web/tests/game-controller.test.js`
  - Enter manual entry mode (same modal-confirm pattern as Suite 1)
  - Loop through `h.FIXTURE_PUZZLE` indices; for each non-zero cell: `UI.cells[idx].click()` then `dispatchKey(UI.cells[idx], String(digit))`
  - Click `manual-entry-finish`
  - Assert `document.getElementById('modal-overlay').classList.contains('active') === false`
  - Assert `clock.intervals.size === 2` (tick + checkpoint running)
  - Assert `global.Statistics.getStats().perDifficulty.imported.started === 1`
  - Assert `global.Persistence.load().currentDifficulty === 'imported'`
  - Assert `document.getElementById('toolbar').hidden === false` and `document.getElementById('manual-entry-actions').hidden === true`
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

- [x] 3. Suite 3 — Finish entry: conflicting digits
  - Append `h.describe('GameController — manual entry finish: conflicting digits', ...)` to `web/tests/game-controller.test.js`
  - Enter manual entry mode
  - Place digit `5` at cell index 0, then digit `5` at cell index 1 (same row, creates row conflict)
  - Click `manual-entry-finish`
  - Assert `document.getElementById('modal-overlay').classList.contains('active') === true`
  - Assert `document.getElementById('modal-title').textContent === 'Conflicting Entries'`
  - Assert `document.getElementById('toolbar').hidden === true` (still in entry mode)
  - _Requirements: 3.1, 3.2_

- [x] 4. Suite 4 — Finish entry: no valid solution
  - Append `h.describe('GameController — manual entry finish: no solution', ...)` to `web/tests/game-controller.test.js`
  - Define a constant `NO_SOLUTION_BOARD` — a flat 81-element array that is conflict-free (passes `isValid`) but has zero solutions. A reliable example: start from all zeros and fill row 0 with `[1,2,3,4,5,6,7,8,9]`, row 1 col 0–2 with `[4,5,6]`, and then force a contradiction by placing `1` in the only remaining position that a valid solver would need for row 1 col 0 (e.g., cell 9 = `1`). For the test file, use a pre-validated constant array (inline comment explains why it has no solution).
  - Enter manual entry mode
  - For each non-zero cell in `NO_SOLUTION_BOARD`: click cell and dispatch digit key
  - Click `manual-entry-finish`
  - Assert modal title is `'No Solution'`
  - Assert toolbar still hidden
  - _Requirements: 4.1, 4.2_

- [x] 5. Suite 5 — Finish entry: multiple solutions
  - Append `h.describe('GameController — manual entry finish: multiple solutions', ...)` to `web/tests/game-controller.test.js`
  - Enter manual entry mode
  - Place only two digits: `5` at cell 0 and `3` at cell 1 (far below the 17-clue uniqueness minimum)
  - Click `manual-entry-finish`
  - Assert modal title is `'Multiple Solutions'`
  - Assert toolbar still hidden
  - _Requirements: 5.1, 5.2_

- [x] 6. Suite 6 — Cancel restore
  - Append `h.describe('GameController — manual entry cancel restore', ...)` to `web/tests/game-controller.test.js`
  - `loadApp()` with default seed (FIXTURE_PUZZLE, medium)
  - Verify initial `clock.intervals.size === 2` (timer running before entry)
  - Enter manual entry mode; assert `clock.intervals.size === 0` (timer stopped during entry)
  - Place digits in cells 2, 10, and 20 (cells that are `0` in FIXTURE_PUZZLE, so they are safely editable)
  - Click `manual-entry-cancel`
  - For each of cells 2, 10, 20: assert `UI.cells[idx].querySelector('.cell-digit').textContent` matches `String(h.FIXTURE_PUZZLE[idx])` (restored — these are `0` in FIXTURE_PUZZLE so they should appear as `''`)
  - For non-zero cells (e.g., cell 0 = `5`): assert digit text is `'5'`
  - Assert `clock.intervals.size === 2` (timer resumed)
  - Assert `document.getElementById('toolbar').hidden === false`
  - Assert `document.getElementById('manual-entry-actions').hidden === true`
  - Assert `global.Persistence.load().currentDifficulty === 'medium'`
  - _Requirements: 6.1, 6.2, 6.3, 6.4_

- [x] 7. Suite 7 — Persistence isolation during entry
  - Append `h.describe('GameController — manual entry persistence isolation', ...)` to `web/tests/game-controller.test.js`
  - `loadApp()` with default seed
  - Capture `const preEntryBoard = global.Persistence.load().board.slice()`
  - Enter manual entry mode
  - Place digits in cells 2, 10, 20 (empty cells in FIXTURE_PUZZLE)
  - Assert `global.Persistence.load().board` equals `preEntryBoard` element-by-element (entry did not overwrite persistence)
  - Assert `global.Persistence.load().currentDifficulty === 'medium'` (pre-entry difficulty unchanged)
  - _Requirements: 7.1, 7.2_

- [x] 8. Suite 8 — Auto-fill candidates blocked during entry, available after finish
  - Append `h.describe('GameController — manual entry auto-candidates guard', ...)` to `web/tests/game-controller.test.js`
  - Enter manual entry mode
  - Click `document.getElementById('btn-auto-candidates')`
  - Assert that every cell's candidates are empty: loop `UI.cells`, check that no `querySelector('.cell-candidate')` elements are present (or that `Persistence.load().candidates.every(s => s.size === 0)`)
  - Enter all FIXTURE_PUZZLE clue digits and click `manual-entry-finish` (same as Suite 2)
  - Click `document.getElementById('btn-auto-candidates')` again
  - Assert that at least one empty cell now has candidates populated (e.g., `Persistence.load().candidates.some(s => s.size > 0)`)
  - _Requirements: 8.1, 8.2_

- [x] 9. Checkpoint — run test suite and confirm all new suites pass
  - Run `npm test` (or `node web/tests/run-tests.js` if that is the project entry point)
  - Confirm all 8 new `h.describe` suites report 0 failures
  - Fix any assertion mismatches before marking complete
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP — none are marked optional here because all eight suites are required coverage.
- Each suite calls `loadApp()` independently, so test isolation is guaranteed.
- The `btn-manual-entry` → modal confirm → `loadManualEntry()` path is the only way to enter manual entry mode through the public API; tests must go through the modal rather than calling `loadManualEntry` directly, to match real user behaviour.
- For Suite 4 (no-solution board), the inline constant must be validated offline before committing. The solver is deterministic so once the constant is confirmed to return 0 solutions it is stable.
- `clock.intervals.size === 0` during manual entry is expected: `loadManualEntry()` calls `stopTimer()` and the entry mode guard prevents `startTimer()` from running.
- The `Statistics` module accumulates across all `loadApp()` calls within a test file because it uses module-level state backed by the same `localStorage`. Suite 2 relies on `imported.started === 1`; if suites run in file order and no earlier suite triggers `finishManualEntry`, this holds. The fixture-loading (`loadApp`) call in Suite 2 should use a fresh storage to be safe.

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1"] },
    { "id": 1, "tasks": ["2", "3", "4", "5"] },
    { "id": 2, "tasks": ["6", "7", "8"] },
    { "id": 3, "tasks": ["9"] }
  ]
}
```
