# Sudoku Solving Techniques Reference

This document describes all solving techniques implemented (and planned) in the hint system, ordered from simplest to most complex.

## Currently Implemented (16 techniques)

### Level 1 — Basic

#### 1. Naked Single
A cell has exactly one remaining candidate. That digit must go there.

**Detection:** `cands[i].size === 1`  
**Result:** Place the single candidate.

#### 2. Hidden Single
Within a unit (row/col/box), a digit can only be placed in one cell.

**Detection:** For each unit, for each digit, count cells where digit is a candidate. If count === 1, place it.  
**Result:** Place the digit in the only possible cell.

---

### Level 2 — Intermediate

#### 3. Locked Candidates (Pointing & Claiming)

**Pointing:** All candidates for digit d in a box lie on one row/col → eliminate d from the rest of that row/col outside the box.

**Claiming:** All candidates for digit d in a row/col lie in one box → eliminate d from the rest of that box.

#### 4. Naked Pair
Two cells in a unit share exactly the same two candidates. Those digits are locked to those cells.

**Result:** Eliminate both digits from all other cells in the unit.

#### 5. Naked Triple
Three cells in a unit collectively contain at most three candidates.

**Result:** Eliminate those digits from all other cells in the unit.

#### 6. Hidden Pair
Two digits appear as candidates in exactly the same two cells within a unit.

**Result:** Remove all other candidates from those two cells.

#### 7. Hidden Triple
Three digits appear only in the same three cells within a unit.

**Result:** Remove all other candidates from those three cells.

---

### Level 3 — Advanced

#### 8. X-Wing
Digit d appears in exactly 2 cells in each of two base rows, aligned in the same two columns.

**Result:** Eliminate d from all other cells in those two cover columns (or vice versa for column-based).

#### 9. Finned X-Wing
Like X-Wing but one base row has extra candidates (the "fin"). Eliminations restricted to cells seeing both the cover line and the fin's box.

#### 10. Sashimi Finned X-Wing
Degenerate Finned X-Wing where one base cell is missing. Still forces eliminations in the fin's box.

#### 11. XY-Wing
Pivot {X,Y} sees pincers {X,Z} and {Y,Z}. Regardless of pivot's value, one pincer must be Z.

**Result:** Eliminate Z from cells seeing both pincers.

#### 12. XYZ-Wing
Pivot {X,Y,Z} sees pincers {X,Z} and {Y,Z}. All three contain Z.

**Result:** Eliminate Z from cells seeing all three.

---

### Level 4 — Expert

#### 13. Two-String Kite
Row-string and column-string connected via a shared box. Opposite ends eliminate.

#### 14. Skyscraper
Two conjugate pairs sharing one line. Unshared ends form a chain.

**Result:** Eliminate digit from cells seeing both unshared ends.

#### 15. Unique Rectangle (Type 1)
Three corners of a rectangle are bi-value {A,B}. Fourth corner must NOT be {A,B} only (deadly pattern avoidance).

**Result:** Eliminate A and B from the fourth corner.

#### 16. BUG +1
All empty cells have exactly 2 candidates except one with 3. The extra digit breaks the deadly pattern.

**Result:** Place the BUG-breaking digit.

---

## Planned (6 techniques)

### Level 3 (continued)

#### 17. Swordfish
Generalization of X-Wing to 3 base lines and 3 cover lines.

#### 18. Jellyfish
Generalization to 4 base lines and 4 cover lines (rare).

### Level 4 (continued)

#### 19. W-Wing
Two bi-value {X,Y} cells connected by a strong link on Y.

**Result:** Eliminate X from cells seeing both endpoints.

#### 20. Simple Coloring
Conjugate pair chains for a digit. Color Wrap (contradiction) or Color Trap (both colors see a cell).

#### 21. Empty Rectangle
Box where d-candidates form L/T intersecting a strong link outside.

### Level 5

#### 22. ALS-XZ
Two Almost Locked Sets sharing a restricted common candidate. Non-restricted common is eliminated.

---

## Technique Detection API

```typescript
interface HintResult {
  technique: string;          // Display name
  description: string;        // HTML explanation
  highlights: {
    cause: number[];          // Pattern cells (blue highlight)
    affected: number[];       // Elimination target cells (purple)
    result: number[];         // Pivot/solution cells (yellow)
  };
  eliminations: Array<{ idx: number; digit: number }>;
  placement: { idx: number; digit: number } | null;
}

// Usage
const hint = Techniques.getHint(board, candidates);
if (hint) {
  UI.showHint(hint);  // Display in hint panel
}
```

## Difficulty Classification

| Difficulty | Required Techniques | Clue Count |
|-----------|-------------------|-----------|
| Easy | Naked Single, Hidden Single only | 36+ |
| Medium | + Locked Candidates, Naked/Hidden Pairs | 30-35 |
| Hard | + X-Wing, Triples, Fish variants | 26-29 |
| Expert | + Wings, Kites, Coloring, UR | 22-25 |
