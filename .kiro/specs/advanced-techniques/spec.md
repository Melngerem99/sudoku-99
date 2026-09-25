# Advanced Techniques Specification

## Goals
- Expand the hint system from 16 to 22+ solving techniques
- Enable proper Expert-level difficulty grading (requires advanced techniques to solve)
- Maintain the existing technique interface and highlight system
- Each new technique must be accompanied by comprehensive tests

## Requirements

### R1: New Techniques to Implement

#### Swordfish (Level 3)
- Digit d appears in exactly 2-3 cells in each of 3 base rows
- Those cells align in exactly 3 cover columns
- Eliminate d from all other cells in cover columns
- Dual: also detect column-based Swordfish

#### Jellyfish (Level 3)
- Same pattern as Swordfish but with 4 base lines and 4 cover lines
- Rare but necessary for some expert puzzles

#### W-Wing (Level 4)
- Two bi-value cells {X,Y} connected by a strong link on Y in a shared unit
- Eliminates X from cells that see both endpoints
- One of the more common advanced techniques in hard puzzles

#### Simple Coloring (Level 4)
- Build conjugate pair chains for a digit
- Color cells alternating: if chain reaches contradiction (two same-color in a unit) → eliminate that color
- If both colors see a cell → that cell can't have the digit
- Two rules: Color Wrap (contradiction) and Color Trap (seen by both)

#### Empty Rectangle (Level 4)
- A box where all candidates for digit d are confined to one row and one column (forming an L or T)
- Combined with a strong link outside the box, eliminates d from specific cells

#### ALS-XZ (Almost Locked Set - Level 5)
- Two Almost Locked Sets (N cells with N+1 candidates) sharing a restricted common candidate
- The non-restricted common candidate can be eliminated from cells seeing all occurrences

### R2: Technique Registry Updates
- Insert new techniques in correct difficulty order
- Swordfish after X-Wing variants (position ~11)
- Jellyfish after Swordfish
- W-Wing after XYZ-Wing
- Simple Coloring after Skyscraper
- Empty Rectangle after Simple Coloring
- ALS-XZ at the end (most complex)

### R3: Difficulty Grading Update
- Update difficulty scoring to use technique requirements
- Expert puzzles must require at least one Level 4+ technique
- Hard puzzles require Level 3 techniques
- Generate puzzles that specifically need advanced techniques (iterative generation)

### R4: Testing Requirements
- Each new technique: minimum 5 positive test cases, 3 negative cases
- Use published expert Sudoku puzzles as test fixtures
- Verify: applying the elimination still yields a unique solution
- Performance: no individual technique takes >50ms on a mobile device

## Acceptance Criteria
- [ ] All 6 new techniques implemented and passing tests
- [ ] Existing 16 techniques still pass all tests (no regressions)
- [ ] `getHint()` correctly prioritizes simpler techniques first
- [ ] Difficulty grading uses technique requirements, not just clue count
- [ ] Expert-generated puzzles require at least one advanced technique
- [ ] Performance: `detectAll()` completes in <200ms including new techniques
- [ ] Each technique generates correct human-readable explanation HTML

## Implementation Notes
- Swordfish/Jellyfish generalize X-Wing: iterate N rows, check alignment in N columns
- Simple Coloring: BFS/DFS on conjugate pairs graph, assign alternating colors
- W-Wing: find two bi-value cells, check if a strong link connects them
- Empty Rectangle: for each box, check if d-candidates form L/T shape intersecting a strong link
- ALS-XZ: enumerate ALS pairs (expensive) — optimize by limiting set size to 4-5 cells
- Consider adding a technique difficulty tier to HintResult for UI display

## Risks
| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| ALS-XZ too slow for real-time hints | High | Medium | Limit ALS size to 4 cells; skip if simpler technique found first |
| Coloring chains get complex (multiple colors) | Medium | Medium | Start with single-digit simple coloring only |
| Generating puzzles that require specific techniques is slow | High | Medium | Cache generated puzzles; generate in background |
| False positives in technique detection | Medium | High | Thorough testing; verify eliminations don't break uniqueness |
