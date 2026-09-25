---
inclusion: auto
fileMatchPattern: "**/*.{ts,js}"
---

# Sudoku Domain Knowledge

## Core Concepts

### Board Representation
- Flat 81-element array where `index = row * 9 + col`
- Value `0` = empty cell; values `1-9` = placed digits
- Row from index: `Math.floor(idx / 9)`
- Column from index: `idx % 9`
- Box from index: `Math.floor(row/3) * 3 + Math.floor(col/3)`

### Peers
- Every cell has exactly 20 peers (cells that share a row, column, or box)
- Pre-computed as `PEERS[idx]: number[]` for performance

### Units
- 27 total units: 9 rows + 9 columns + 9 boxes
- Each unit contains exactly 9 cell indices
- A valid Sudoku has each digit 1-9 appearing exactly once in each unit

### Candidates (Pencil Marks)
- `Set<number>` per empty cell containing all legal remaining digits
- Updated incrementally: when a digit is placed, remove it from all peer candidates
- Full rebuild available for error recovery or initial auto-fill

## Solving Techniques (Ordered by Difficulty)

### Basic (Level 1)
1. **Naked Single** — Cell has exactly 1 candidate
2. **Hidden Single** — Digit has exactly 1 possible cell in a unit

### Intermediate (Level 2)
3. **Locked Candidates** — Pointing (box→line) and Claiming (line→box)
4. **Naked Pair/Triple** — N cells in a unit share exactly N candidates
5. **Hidden Pair/Triple** — N digits confined to exactly N cells in a unit

### Advanced (Level 3)
6. **X-Wing** — 2 rows with digit in same 2 columns (or vice versa)
7. **Finned/Sashimi X-Wing** — X-Wing with extra candidates in one base
8. **Swordfish** — 3 rows with digit in same 3 columns
9. **XY-Wing** — Pivot + 2 pincers eliminate shared candidate Z
10. **XYZ-Wing** — 3-candidate pivot + 2 pincers

### Expert (Level 4)
11. **Two-String Kite** — Row-string + col-string connected via box
12. **Skyscraper** — Two conjugate pairs sharing one line
13. **Unique Rectangle** — Deadly pattern avoidance (Type 1-4)
14. **BUG+1** — Bivalue Universal Grave + 1 extra candidate
15. **Simple Coloring** — Conjugate pair chains
16. **W-Wing** — Two bi-value cells connected by a strong link

## Difficulty Grading

| Difficulty | Clues | Hardest Technique Required |
|-----------|-------|---------------------------|
| Easy | 36+ | Naked/Hidden Singles only |
| Medium | 30-35 | Locked Candidates, Naked Pairs |
| Hard | 26-29 | X-Wing, Hidden Pairs/Triples |
| Expert | 22-25 | Wings, Fish variants, Chains |

## Puzzle Generation Algorithm

1. Generate a random fully-solved grid (backtracking with random digit order)
2. Shuffle all 81 cell positions
3. For each position: remove the digit, check `countSolutions(board) === 1`
4. If uniqueness preserved: keep hole. Otherwise: restore digit.
5. Stop when target clue count reached.

## HintResult Interface

```typescript
interface HintResult {
  technique: string;
  description: string;          // HTML-safe explanation
  highlights: {
    cause: number[];            // Pattern cells (blue)
    affected: number[];         // Elimination cells (purple)
    result: number[];           // Pivot/solution cells (yellow)
  };
  eliminations: Array<{ idx: number; digit: number }>;
  placement: { idx: number; digit: number } | null;
}
```
