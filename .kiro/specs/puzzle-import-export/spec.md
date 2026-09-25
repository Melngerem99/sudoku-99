# Puzzle Import/Export Specification

## Goals
- Allow users to share puzzles with each other via compact string representations
- Enable importing puzzles from external sources (books, websites, competitions)
- Provide URL-based sharing (puzzle encoded in URL parameters)
- Support standard puzzle formats used by the Sudoku community

## Requirements

### R1: Export Formats
- **81-character string:** Digits 1-9 for clues, '0' or '.' for empty cells
  - Example: `530070000600195000098000060800060003400803001700020006060000280000419005000080079`
- **URL format:** `https://[domain]/#puzzle=[81-char-string]`
- **Clipboard copy:** One-click button copies 81-char string
- **QR code:** Generate QR code image for the 81-char string (stretch goal)

### R2: Import Methods
- **Paste field:** Text input accepting 81-character string (0 or . for empty)
- **URL detection:** On page load, check URL hash for `#puzzle=` parameter
- **Drag-and-drop:** Drop a .txt file containing the puzzle string (stretch goal)
- **Validation:** Verify imported puzzle is valid (no conflicts) and solvable (unique solution)

### R3: Import Validation
- Check string length === 81
- Check all characters are 0-9 or '.'
- Run `isValid()` on parsed board (no duplicate digits in units)
- Run `countSolutions(board, 2)` to verify exactly 1 solution
- If invalid: show error message explaining what's wrong
- If multiple solutions: warn user ("puzzle has multiple solutions — hints may not work correctly")

### R4: UI Components
- "Import" button in settings drawer
- Import dialog/modal with:
  - Text input field (paste or type)
  - "Import from URL" indicator (if puzzle in current URL)
  - Validate button → shows success/error
  - Load button → replaces current game with imported puzzle
- "Export/Share" button (visible when playing any puzzle)
- Share sheet with: Copy String, Copy URL, (optional: QR code)

### R5: URL Sharing
- Puzzle encoded in URL hash (client-side only, no server needed)
- Format: `#puzzle=530070000...` (81 digits)
- On page load: if hash contains puzzle → prompt "Load shared puzzle?"
- After loading: clear hash to prevent re-prompting on refresh
- Share button generates full URL and copies to clipboard

### R6: Format Compatibility
- Accept both '0' and '.' as empty cell markers
- Accept whitespace/newlines between digits (strip before parsing)
- Accept 9-line format (9 digits per line, with optional spaces)
- Normalize all to the canonical 81-digit-zero format internally

## Acceptance Criteria
- [ ] 81-character string exports correctly for any puzzle
- [ ] Importing a valid 81-char string loads the puzzle correctly
- [ ] URL with `#puzzle=` loads the shared puzzle on page visit
- [ ] Invalid imports show clear error messages
- [ ] Multi-solution puzzles show a warning but still load
- [ ] Copy-to-clipboard works across browsers (Clipboard API with fallback)
- [ ] Whitespace and '.' characters are handled in import
- [ ] Imported puzzles are fully playable (solver, hints, undo/redo all work)

## Implementation Notes
- Parsing: `string.replace(/[.\s]/g, '0').split('').map(Number)`
- Validation pipeline: length check → character check → isValid() → countSolutions()
- URL handling: `window.location.hash` for read, `history.replaceState` to clear
- Clipboard API: `navigator.clipboard.writeText(str)` with `document.execCommand('copy')` fallback
- QR code: use a small library like qrcode-generator (4KB) or skip for MVP
- Export the solution along with the puzzle? No — only export the puzzle (81 clue string)

## Risks
| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Users paste invalid data (typos, wrong length) | High | Low | Clear validation messages with specific errors |
| URL gets too long for some platforms | Low | Low | 81 chars + prefix is ~100 chars total — well within limits |
| Clipboard API blocked in some browsers | Medium | Low | Fallback to textarea + execCommand; show manual copy instructions |
| Imported puzzle with multiple solutions breaks hints | Medium | Medium | Warn user; disable hint button for multi-solution puzzles |
