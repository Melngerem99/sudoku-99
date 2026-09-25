# Game Persistence Specification

## Goals
- Auto-save game state to localStorage on every action so users never lose progress
- Resume in-progress games seamlessly on page reload
- Handle corrupted/outdated save data gracefully
- Support multiple save slots (current game + daily challenge)

## Requirements

### R1: Auto-Save
- Serialize full game state to localStorage after every state-mutating action
- Debounce writes to max 1 per 500ms (batch rapid undo/redo)
- Save key: `sudoku-game-state` (main), `sudoku-daily-state` (daily challenge)
- Serialization must handle `Set<number>` candidates (convert to arrays)

### R2: State Schema
- Saved fields: board, solution, givens, candidates, selectedIdx, activeDigit, pencilMode, mistakes, timerSeconds, difficulty, history (last 20 entries), future (last 20 entries), gameOver, gameWon, emptyMode
- Schema version field for future migration
- Timestamp of last save

### R3: Resume on Load
- On page load, check localStorage for saved state
- If valid saved state exists: restore it instead of generating new puzzle
- Resume timer from saved `timerSeconds` value
- Show subtle "Game restored" toast notification (dismisses in 2s)
- If no saved state: generate new puzzle as normal

### R4: Data Integrity
- Validate saved data on load (correct array lengths, value ranges)
- If validation fails: discard save, start fresh, show "Save corrupted" message
- Schema version check: if version mismatch, attempt migration or discard
- Handle localStorage being full (catch QuotaExceededError, warn user)

### R5: Clear Save
- "New Puzzle" action clears the current save slot
- "Reveal Solution" clears the save (game is over)
- Win/Lose clears the save (game is complete)
- Explicit "Reset" option in settings to clear all saved data

### R6: Storage Size
- Estimate max save size: ~5KB per game state (including history)
- Total localStorage usage: < 50KB across all save slots
- Trim undo/redo history to 20 entries before saving (vs 100 in-memory)

## Acceptance Criteria
- [ ] Refreshing the page mid-game restores exact board state
- [ ] Timer resumes from where it left off
- [ ] Undo/redo stacks are preserved (up to 20 entries)
- [ ] Corrupted localStorage data doesn't crash the app
- [ ] New game clears saved state
- [ ] Win/lose clears saved state
- [ ] Works in private/incognito mode (localStorage available but ephemeral)
- [ ] No perceptible lag from save operations during gameplay

## Implementation Notes
- Use `JSON.stringify`/`JSON.parse` with custom replacer/reviver for Sets
- Set serialization: `[...set]` for save, `new Set(arr)` for load
- Debounce implementation: `setTimeout` + clear on next mutation
- Validation function checks: board.length === 81, all values 0-9, candidates are arrays of 1-9
- Consider `structuredClone` for deep-copying state before save (avoid mutation during async save)

## Risks
| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| localStorage disabled (Safari private mode) | Medium | Medium | Wrap in try/catch; game works without persistence, just no save |
| Save data grows too large | Low | Low | Cap history at 20 entries; monitor total size |
| Race condition: save during rapid input | Low | Medium | Debounce saves; use synchronous localStorage API |
| Schema evolution breaks old saves | Medium | Medium | Version field + migration functions; fallback to discard |
