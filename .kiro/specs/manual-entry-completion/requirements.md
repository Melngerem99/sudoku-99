# Requirements Document

## Introduction

Phase 12.0 adds automated tests for the Manual Entry feature already implemented in `src/game-controller.ts`. No production code changes are made. The eight test suites below verify that the existing `loadManualEntry`, `cancelManualEntry`, `clearManualEntry`, and `finishManualEntry` functions behave correctly across every significant user-facing path.

All tests are appended to `web/tests/game-controller.test.js` using the project's existing `h.describe` / `assertEqual` / `assert` patterns and the `loadApp` / `seedGame` infrastructure already present in that file.

## Glossary

- **GameController**: The module under test (`src/game-controller.ts`), accessed via the CJS test bundle.
- **ManualEntryMode**: The transient editing state activated by `loadManualEntry()`, where `manualEntryMode === true` and the normal toolbar is hidden.
- **EntryActions**: The three-button strip (`manual-entry-finish`, `manual-entry-clear`, `manual-entry-cancel`) shown only during manual entry.
- **FIXTURE_PUZZLE**: The 81-cell test puzzle array defined in `web/tests/helpers.js`, which is a valid, unique puzzle with a known solution.
- **Validation**: The `validate(board)` function from `src/services/import-export.ts` that checks for conflicts, solvability, and uniqueness.
- **Statistics**: The `Statistics` global (backed by `src/services/statistics.ts`) tracking per-difficulty game counts.
- **Persistence**: The `Persistence` global (backed by `src/services/persistence.ts`) storing the current game state in `localStorage`.
- **Clock**: The `createIntervalClock()` helper returned by `loadApp()`, whose `intervals.size` reflects how many `setInterval` handles are active (2 = normal play, 0 = paused / manual entry).

## Requirements

### Requirement 1 — Entry lifecycle: mode transitions and UI visibility

**User Story:** As a player, I want the toolbar to hide and entry-action buttons to appear when I start manual entry, so that the UI clearly communicates I am in a special editing mode.

#### Acceptance Criteria

1. WHEN the GameController initialises normally, THE EntryActions section SHALL be hidden and the toolbar SHALL be visible.
2. WHEN a player clicks `btn-manual-entry` and confirms "Start Entry" in the resulting modal, THE GameController SHALL set `manualEntryMode` to true, hide the toolbar, and show the EntryActions section.
3. WHEN `manualEntryMode` is true, THE GameController SHALL allow digit placement into any cell index.
4. WHEN a player clicks `manual-entry-clear`, THE GameController SHALL wipe all placed digits from every cell and reset selection and history, while remaining in `manualEntryMode`.

### Requirement 2 — Finish entry: valid unique puzzle

**User Story:** As a player, I want finishing a valid puzzle entry to immediately start a playable game, so that I can continue without any interruption.

#### Acceptance Criteria

1. WHEN a player clicks `manual-entry-finish` with a board that passes Validation (valid, solvable, unique), THE GameController SHALL NOT show the modal-overlay.
2. WHEN a valid puzzle is confirmed, THE GameController SHALL start the game timer (two active intervals: tick and checkpoint).
3. WHEN a valid puzzle is confirmed, THE GameController SHALL record one started game in `Statistics.perDifficulty.imported`.
4. WHEN a valid puzzle is confirmed, THE GameController SHALL persist the game with `currentDifficulty === "imported"`.
5. WHEN a valid puzzle is confirmed, THE GameController SHALL restore the toolbar to visible and hide the EntryActions section.

### Requirement 3 — Finish entry: conflicting digits

**User Story:** As a player, I want the GameController to reject a board with conflicting digits and keep me in entry mode, so that I can fix mistakes before starting a game.

#### Acceptance Criteria

1. WHEN a player clicks `manual-entry-finish` with a board where the same digit appears twice in a row, column, or box, THE GameController SHALL display a modal with the title "Conflicting Entries".
2. WHILE the "Conflicting Entries" modal is shown, THE GameController SHALL remain in `manualEntryMode` (toolbar hidden, EntryActions visible).

### Requirement 4 — Finish entry: no valid solution

**User Story:** As a player, I want the GameController to reject a board that has no solution, so that I am not given a broken game.

#### Acceptance Criteria

1. WHEN a player clicks `manual-entry-finish` with a board that passes conflict checking but has zero solutions, THE GameController SHALL display a modal with the title "No Solution".
2. WHILE the "No Solution" modal is shown, THE GameController SHALL remain in `manualEntryMode` (toolbar hidden, EntryActions visible).

### Requirement 5 — Finish entry: multiple solutions

**User Story:** As a player, I want the GameController to reject a board with multiple solutions, so that hint logic is not broken by an ambiguous puzzle.

#### Acceptance Criteria

1. WHEN a player clicks `manual-entry-finish` with a board that has more than one valid solution, THE GameController SHALL display a modal with the title "Multiple Solutions".
2. WHILE the "Multiple Solutions" modal is shown, THE GameController SHALL remain in `manualEntryMode` (toolbar hidden, EntryActions visible).

### Requirement 6 — Cancel: full state restoration

**User Story:** As a player, I want cancelling manual entry to restore my previous game exactly, so that starting entry by mistake does not lose my progress.

#### Acceptance Criteria

1. WHEN a player clicks `manual-entry-cancel` after entering manual entry from a running seeded game, THE GameController SHALL restore the board to the pre-entry puzzle (`FIXTURE_PUZZLE`).
2. WHEN a player clicks `manual-entry-cancel`, THE GameController SHALL resume the game timer (two active intervals).
3. WHEN a player clicks `manual-entry-cancel`, THE GameController SHALL restore the toolbar to visible and hide the EntryActions section.
4. WHEN a player clicks `manual-entry-cancel`, THE GameController SHALL restore `currentDifficulty` to its pre-entry value.

### Requirement 7 — Persistence isolation during entry

**User Story:** As a player, I want manual entry not to overwrite my saved game, so that reloading the page during entry does not corrupt my progress.

#### Acceptance Criteria

1. WHILE `manualEntryMode` is true, THE GameController SHALL NOT write any new state to Persistence when digits are placed.
2. WHILE `manualEntryMode` is true, the state returned by `Persistence.load()` SHALL match the state saved before entering manual entry.

### Requirement 8 — Auto-fill candidates blocked during entry and available after finish

**User Story:** As a player, I want auto-fill candidates to be blocked during manual entry and work normally once entry is complete, so that pencil marks from an incomplete board are never persisted.

#### Acceptance Criteria

1. WHILE `manualEntryMode` is true, WHEN a player clicks `btn-auto-candidates`, THE GameController SHALL NOT populate any cell's candidate set.
2. WHEN `manualEntryMode` has been exited by a successful `finishManualEntry`, WHEN a player clicks `btn-auto-candidates`, THE GameController SHALL populate candidate sets for empty cells.
