/**
 * techniques.ts — Complete Sudoku solving-technique detector (22 techniques).
 *
 * Each detector: detect(board, cands) → HintResult | null
 */

import { PEERS } from './solver';

type Board = number[];
type CandidateGrid = Set<number>[];

export interface Elimination { idx: number; digit: number; }
export interface Placement { idx: number; digit: number; }
export interface Highlights { cause: number[]; affected: number[]; result: number[]; }

export interface HintResult {
  technique: string;
  description: string;
  highlights: Highlights;
  eliminations: Elimination[];
  placement: Placement | null;
}

export interface TechniqueEntry {
  name: string;
  detect: (board: Board, cands: CandidateGrid) => HintResult | null;
}


  const row = (i: number) => (i / 9) | 0;
  const col = (i: number) => i % 9;
  const box = (i: number) => (((i / 9) | 0) / 3 | 0) * 3 + ((i % 9) / 3 | 0);

  /** All 9 cell indices in the same row as i (including i). */
  const rowCells = (i: number) => {
    const r = row(i);
    return Array.from({ length: 9 }, (_, c) => r * 9 + c);
  };

  /** All 9 cell indices in the same column as i (including i). */
  const colCells = (i: number) => {
    const c = col(i);
    return Array.from({ length: 9 }, (_, r) => r * 9 + c);
  };

  /** All 9 cell indices in the same 3×3 box as i (including i). */
  const boxCells = (i: number) => {
    const br = (row(i) / 3 | 0) * 3;
    const bc = (col(i) / 3 | 0) * 3;
    const out = [];
    for (let r = br; r < br + 3; r++)
      for (let c = bc; c < bc + 3; c++)
        out.push(r * 9 + c);
    return out;
  };

  /**
   * Pre-built list of all 27 units (9 rows + 9 cols + 9 boxes).
   * Each entry is a sorted 9-element array of cell indices.
   */
  const ALL_UNITS = (() => {
    const units = [];
    for (let i = 0; i < 9; i++) {
      // row i
      units.push(Array.from({ length: 9 }, (_, c) => i * 9 + c));
      // col i
      units.push(Array.from({ length: 9 }, (_, r) => r * 9 + i));
      // box i  (reading order: 0=top-left … 8=bottom-right)
      const br = (i / 3 | 0) * 3, bc = (i % 3) * 3;
      const b = [];
      for (let r = br; r < br + 3; r++)
        for (let c = bc; c < bc + 3; c++) b.push(r * 9 + c);
      units.push(b);
    }
    return units;
  })();

  /** The 9 row-units, 9 col-units and 9 box-units as separate arrays. */
  const ROW_UNITS = ALL_UNITS.slice(0, 27).filter((_, i) => i % 3 === 0);
  const COL_UNITS = ALL_UNITS.slice(0, 27).filter((_, i) => i % 3 === 1);
  const BOX_UNITS = ALL_UNITS.slice(0, 27).filter((_, i) => i % 3 === 2);

  /**
   * Two cells "see" each other when they share a unit.
   * Uses PEERS which is pre-computed in solver.js.
   */
  const sees = (a: number, b: number) => a !== b && PEERS[a].includes(b);

  /** Label helpers for readable explanations. */
  const R = (i: number) => `R${row(i) + 1}`;
  const C = (i: number) => `C${col(i) + 1}`;
  const RC = (i: number) => `${R(i)}${C(i)}`;

  /* ════════════════════════════════════════════════════════════════════════
   * CANDIDATE HELPERS
   * ═══════════════════════════════════════════════════════════════════════*/

  /**
   * buildCandidates(board)
   * Constructs a full pencil-mark array from scratch.
   * Every empty cell gets the set of digits not already present in its peers.
   */
  function buildCandidates(board: Board) {
    return board.map((val: number, idx: number): Set<number> => {
      if (val !== 0) return new Set();
      const used = new Set(PEERS[idx].map((p) => board[p]).filter(Boolean));
      const s = new Set<number>();
      for (let d = 1; d <= 9; d++) if (!used.has(d)) s.add(d);
      return s;
    });
  }

  /** Return candidates, building them if not supplied. */
  function ensure(board: Board, candidates: CandidateGrid | null) {
    return (candidates || buildCandidates(board));
  }

  /** Cells in a unit that are empty and have digit d as a candidate. */
  function unitCellsWithDigit(unit: number[], board: Board, cands: CandidateGrid, d: number) {
    return unit.filter((i) => board[i] === 0 && cands[i].has(d));
  }


  /* ════════════════════════════════════════════════════════════════════════
   * 1. NAKED SINGLE
   * A cell has exactly one remaining candidate — that digit must go there.
   * ═══════════════════════════════════════════════════════════════════════*/
  function nakedSingle(board: Board, cands: CandidateGrid) {
    for (let i = 0; i < 81; i++) {
      if (board[i] !== 0 || cands[i].size !== 1) continue;
      const digit = [...cands[i]][0];
      return {
        technique: "Naked Single",
        description:
          `${RC(i)} has only one remaining candidate: <strong>${digit}</strong>. ` +
          `Every other digit already appears in its row, column, or box.`,
        highlights: { cause: [] as number[], affected: [] as number[], result: [i] },
        eliminations: [] as Elimination[],
        placement: { idx: i, digit },
      };
    }
    return null;
  }

  /* ════════════════════════════════════════════════════════════════════════
   * 2. HIDDEN SINGLE
   * Within a unit, one digit can only be placed in a single cell.
   * ═══════════════════════════════════════════════════════════════════════*/
  function hiddenSingle(board: Board, cands: CandidateGrid) {
    for (const unit of ALL_UNITS) {
      for (let d = 1; d <= 9; d++) {
        const possible = unitCellsWithDigit(unit, board, cands, d);
        if (possible.length !== 1) continue;
        const idx = possible[0];

        // Determine unit type for the explanation
        const isRow = unit.every((i) => row(i) === row(unit[0]));
        const isCol = unit.every((i) => col(i) === col(unit[0]));
        const unitName = isRow
          ? `row ${row(idx) + 1}`
          : isCol
          ? `column ${col(idx) + 1}`
          : `box ${box(idx) + 1}`;

        return {
          technique: "Hidden Single",
          description:
            `<strong>${d}</strong> can only be placed in ${RC(idx)} within ${unitName}. ` +
            `All other cells in that unit either already contain a digit or ` +
            `have ${d} eliminated by a peer.`,
          highlights: {
            cause: unit.filter((i) => i !== idx && board[i] !== 0),
            affected: [] as number[],
            result: [idx],
          },
          eliminations: [] as Elimination[],
          placement: { idx, digit: d },
        };
      }
    }
    return null;
  }

  /* ════════════════════════════════════════════════════════════════════════
   * 3. LOCKED CANDIDATES (Pointing & Claiming)
   *
   * Pointing: all candidates for digit d in a box lie on one row/col
   *   → eliminate d from the rest of that row/col outside the box.
   *
   * Claiming: all candidates for digit d in a row/col lie in one box
   *   → eliminate d from the rest of that box.
   * ═══════════════════════════════════════════════════════════════════════*/
  function lockedCandidates(board: Board, cands: CandidateGrid) {
    for (let d = 1; d <= 9; d++) {

      // ── Pointing ──────────────────────────────────────────────────────
      for (const boxUnit of BOX_UNITS) {
        const cells = unitCellsWithDigit(boxUnit, board, cands, d);
        if (cells.length < 2) continue;

        const rows: number[] = [...new Set<number>(cells.map(row))];
        const cols: number[] = [...new Set<number>(cells.map(col))];

        if (rows.length === 1) {
          // All in the same row → eliminate from rest of that row
          const r = rows[0];
          const elim = [];
          for (let c = 0; c < 9; c++) {
            const i = r * 9 + c;
            if (!boxUnit.includes(i) && board[i] === 0 && cands[i].has(d))
              elim.push({ idx: i, digit: d });
          }
          if (elim.length) {
            return {
              technique: "Locked Candidates (Pointing)",
              description:
                `In box ${box(cells[0]!) + 1}, digit <strong>${d}</strong> is confined to ` +
                `row ${r + 1}. It can therefore be removed from all other cells in row ${r + 1} ` +
                `outside that box.`,
              highlights: {
                cause: cells,
                affected: elim.map((e) => e.idx),
                result: cells,
              },
              eliminations: elim,
              placement: null as Placement | null,
            };
          }
        }

        if (cols.length === 1) {
          // All in the same column → eliminate from rest of that column
          const c = cols[0];
          const elim = [];
          for (let r = 0; r < 9; r++) {
            const i = r * 9 + c;
            if (!boxUnit.includes(i) && board[i] === 0 && cands[i].has(d))
              elim.push({ idx: i, digit: d });
          }
          if (elim.length) {
            return {
              technique: "Locked Candidates (Pointing)",
              description:
                `In box ${box(cells[0]!) + 1}, digit <strong>${d}</strong> is confined to ` +
                `column ${c + 1}. It can therefore be removed from all other cells in column ${c + 1} ` +
                `outside that box.`,
              highlights: {
                cause: cells,
                affected: elim.map((e) => e.idx),
                result: cells,
              },
              eliminations: elim,
              placement: null as Placement | null,
            };
          }
        }
      }

      // ── Claiming ──────────────────────────────────────────────────────
      // Check rows and columns: if all d-candidates lie in one box, eliminate
      // d from the rest of that box.
      for (const lineUnit of [...ROW_UNITS, ...COL_UNITS]) {
        const cells = unitCellsWithDigit(lineUnit, board, cands, d);
        if (cells.length < 2) continue;

        const boxes: number[] = [...new Set<number>(cells.map(box))];
        if (boxes.length !== 1) continue;

        const bx = boxes[0];
        const boxUnit = BOX_UNITS[bx];
        const elim = [];
        for (const i of boxUnit) {
          if (!lineUnit.includes(i) && board[i] === 0 && cands[i].has(d))
            elim.push({ idx: i, digit: d });
        }
        if (elim.length) {
          const isRow = lineUnit.every((i) => row(i) === row(lineUnit[0]));
          const lineName = isRow
            ? `row ${row(cells[0]!) + 1}`
            : `column ${col(cells[0]!) + 1}`;
          return {
            technique: "Locked Candidates (Claiming)",
            description:
              `All candidates for <strong>${d}</strong> in ${lineName} lie within box ${bx + 1}. ` +
              `So ${d} can be eliminated from all other cells in that box.`,
            highlights: {
              cause: cells,
              affected: elim.map((e) => e.idx),
              result: cells,
            },
            eliminations: elim,
            placement: null as Placement | null,
          };
        }
      }
    }
    return null;
  }


  /* ════════════════════════════════════════════════════════════════════════
   * 4. NAKED PAIR
   * Two cells in the same unit share exactly the same two candidates.
   * Those two digits are locked to those cells and can be removed elsewhere.
   * ═══════════════════════════════════════════════════════════════════════*/
  function nakedPair(board: Board, cands: CandidateGrid) {
    for (const unit of ALL_UNITS) {
      const empties = unit.filter((i) => board[i] === 0 && cands[i].size === 2);
      for (let a = 0; a < empties.length - 1; a++) {
        for (let b = a + 1; b < empties.length; b++) {
          const iA = empties[a], iB = empties[b];
          // Identical two-candidate sets?
          if (![...cands[iA]].every((d) => cands[iB].has(d))) continue;
          const digits = [...cands[iA]];
          const elim = [];
          for (const i of unit) {
            if (i === iA || i === iB || board[i] !== 0) continue;
            for (const d of digits)
              if (cands[i].has(d)) elim.push({ idx: i, digit: d });
          }
          if (elim.length) {
            return {
              technique: "Naked Pair",
              description:
                `${RC(iA)} and ${RC(iB)} both contain only {${digits.join(", ")}}. ` +
                `These two digits are locked to those cells, so they can be removed ` +
                `from every other cell in the same unit.`,
              highlights: {
                cause: [iA, iB],
                affected: [...new Set(elim.map((e) => e.idx))],
                result: [iA, iB],
              },
              eliminations: elim,
              placement: null as Placement | null,
            };
          }
        }
      }
    }
    return null;
  }

  /* ════════════════════════════════════════════════════════════════════════
   * 5. NAKED TRIPLE
   * Three cells in a unit collectively contain at most three candidates.
   * Those digits can be removed from all other cells in the unit.
   * ═══════════════════════════════════════════════════════════════════════*/
  function nakedTriple(board: Board, cands: CandidateGrid) {
    for (const unit of ALL_UNITS) {
      const empties = unit.filter(
        (i) => board[i] === 0 && cands[i].size >= 2 && cands[i].size <= 3
      );
      for (let a = 0; a < empties.length - 2; a++) {
        for (let b = a + 1; b < empties.length - 1; b++) {
          for (let c = b + 1; c < empties.length; c++) {
            const iA = empties[a], iB = empties[b], iC = empties[c];
            const combined = new Set([...cands[iA], ...cands[iB], ...cands[iC]]);
            if (combined.size !== 3) continue;
            const digits = [...combined];
            const elim = [];
            for (const i of unit) {
              if (i === iA || i === iB || i === iC || board[i] !== 0) continue;
              for (const d of digits)
                if (cands[i].has(d)) elim.push({ idx: i, digit: d });
            }
            if (elim.length) {
              return {
                technique: "Naked Triple",
                description:
                  `${RC(iA)}, ${RC(iB)}, and ${RC(iC)} together contain only ` +
                  `{${digits.join(", ")}}. These digits are locked to those three cells ` +
                  `and can be eliminated from every other cell in the unit.`,
                highlights: {
                  cause: [iA, iB, iC],
                  affected: [...new Set(elim.map((e) => e.idx))],
                  result: [iA, iB, iC],
                },
                eliminations: elim,
                placement: null as Placement | null,
              };
            }
          }
        }
      }
    }
    return null;
  }

  /* ════════════════════════════════════════════════════════════════════════
   * 6. HIDDEN PAIR
   * Two digits appear as candidates in exactly the same two cells within a
   * unit. All other candidates in those two cells can be removed.
   * ═══════════════════════════════════════════════════════════════════════*/
  function hiddenPair(board: Board, cands: CandidateGrid) {
    for (const unit of ALL_UNITS) {
      // For each pair of digits, find which cells in the unit have them
      for (let dA = 1; dA <= 8; dA++) {
        for (let dB = dA + 1; dB <= 9; dB++) {
          const cellsA = unitCellsWithDigit(unit, board, cands, dA);
          const cellsB = unitCellsWithDigit(unit, board, cands, dB);
          if (
            cellsA.length !== 2 || cellsB.length !== 2 ||
            cellsA[0] !== cellsB[0] || cellsA[1] !== cellsB[1]
          ) continue;

          const [iA, iB] = cellsA;
          const keep = new Set([dA, dB]);
          const elim = [];
          for (const i of [iA, iB])
            for (const d of cands[i])
              if (!keep.has(d)) elim.push({ idx: i, digit: d });

          if (elim.length) {
            return {
              technique: "Hidden Pair",
              description:
                `Digits ${dA} and ${dB} can only appear in ${RC(iA)} and ${RC(iB)} ` +
                `within this unit. Those two cells must contain ${dA} and ${dB}, so all ` +
                `other candidates in them can be removed.`,
              highlights: {
                cause: [iA, iB],
                affected: [iA, iB],
                result: [iA, iB],
              },
              eliminations: elim,
              placement: null as Placement | null,
            };
          }
        }
      }
    }
    return null;
  }

  /* ════════════════════════════════════════════════════════════════════════
   * 7. HIDDEN TRIPLE
   * Three digits each appear only in (some subset of) the same three cells
   * within a unit. Other candidates in those three cells can be removed.
   * ═══════════════════════════════════════════════════════════════════════*/
  function hiddenTriple(board: Board, cands: CandidateGrid) {
    for (const unit of ALL_UNITS) {
      // Collect digits that appear in exactly 2 or 3 cells in this unit
      const digitCells: Record<number, number[]> = {};
      for (let d = 1; d <= 9; d++) {
        const cells = unitCellsWithDigit(unit, board, cands, d);
        if (cells.length >= 2 && cells.length <= 3) digitCells[d] = cells;
      }
      const digits = Object.keys(digitCells).map(Number);

      for (let a = 0; a < digits.length - 2; a++) {
        for (let b = a + 1; b < digits.length - 1; b++) {
          for (let c = b + 1; c < digits.length; c++) {
            const dA = digits[a], dB = digits[b], dC = digits[c];
            const cellSet = new Set([
              ...digitCells[dA], ...digitCells[dB], ...digitCells[dC],
            ]);
            if (cellSet.size !== 3) continue;
            const tripleCells = [...cellSet];
            const keep = new Set([dA, dB, dC]);
            const elim = [];
            for (const i of tripleCells)
              for (const d of cands[i])
                if (!keep.has(d)) elim.push({ idx: i, digit: d });

            if (elim.length) {
              return {
                technique: "Hidden Triple",
                description:
                  `Digits ${dA}, ${dB}, and ${dC} can only appear in ` +
                  `${tripleCells.map(RC).join(", ")} within this unit. ` +
                  `All other candidates in those three cells can therefore be removed.`,
                highlights: {
                  cause: tripleCells,
                  affected: tripleCells,
                  result: tripleCells,
                },
                eliminations: elim,
                placement: null as Placement | null,
              };
            }
          }
        }
      }
    }
    return null;
  }


  /* ════════════════════════════════════════════════════════════════════════
   * 8. X-WING
   * Digit d appears in exactly two cells in each of two base rows (or cols),
   * and those cells align in the same two columns (or rows).
   * d can be eliminated from every other cell in those two cover columns (rows).
   * ═══════════════════════════════════════════════════════════════════════*/
  function xWing(board: Board, cands: CandidateGrid) {
    for (let d = 1; d <= 9; d++) {
      // ── base = rows, cover = columns ──────────────────────────────────
      const rowsWith2 = [];
      for (let r = 0; r < 9; r++) {
        const cells = Array.from({ length: 9 }, (_, c) => r * 9 + c)
          .filter((i) => board[i] === 0 && cands[i].has(d));
        if (cells.length === 2) rowsWith2.push({ r, cols: cells.map(col) });
      }
      for (let a = 0; a < rowsWith2.length - 1; a++) {
        for (let b = a + 1; b < rowsWith2.length; b++) {
          const A = rowsWith2[a], B = rowsWith2[b];
          if (A.cols[0] !== B.cols[0] || A.cols[1] !== B.cols[1]) continue;
          const [c0, c1] = A.cols;
          const cause = [A.r * 9 + c0, A.r * 9 + c1, B.r * 9 + c0, B.r * 9 + c1];
          const elim = [];
          for (let r = 0; r < 9; r++) {
            if (r === A.r || r === B.r) continue;
            for (const c of [c0, c1]) {
              const i = r * 9 + c;
              if (board[i] === 0 && cands[i].has(d)) elim.push({ idx: i, digit: d });
            }
          }
          if (elim.length) {
            return {
              technique: "X-Wing",
              description:
                `Digit <strong>${d}</strong> appears only in columns ${c0 + 1} and ${c1 + 1} ` +
                `within rows ${A.r + 1} and ${B.r + 1}. One of those two columns must ` +
                `contain ${d} in each row, so ${d} can be eliminated from the rest of ` +
                `columns ${c0 + 1} and ${c1 + 1}.`,
              highlights: { cause, affected: elim.map((e) => e.idx), result: cause },
              eliminations: elim,
              placement: null as Placement | null,
            };
          }
        }
      }

      // ── base = columns, cover = rows ──────────────────────────────────
      const colsWith2 = [];
      for (let c = 0; c < 9; c++) {
        const cells = Array.from({ length: 9 }, (_, r) => r * 9 + c)
          .filter((i) => board[i] === 0 && cands[i].has(d));
        if (cells.length === 2) colsWith2.push({ c, rows: cells.map(row) });
      }
      for (let a = 0; a < colsWith2.length - 1; a++) {
        for (let b = a + 1; b < colsWith2.length; b++) {
          const A = colsWith2[a], B = colsWith2[b];
          if (A.rows[0] !== B.rows[0] || A.rows[1] !== B.rows[1]) continue;
          const [r0, r1] = A.rows;
          const cause = [r0 * 9 + A.c, r1 * 9 + A.c, r0 * 9 + B.c, r1 * 9 + B.c];
          const elim = [];
          for (let c = 0; c < 9; c++) {
            if (c === A.c || c === B.c) continue;
            for (const r of [r0, r1]) {
              const i = r * 9 + c;
              if (board[i] === 0 && cands[i].has(d)) elim.push({ idx: i, digit: d });
            }
          }
          if (elim.length) {
            return {
              technique: "X-Wing",
              description:
                `Digit <strong>${d}</strong> appears only in rows ${r0 + 1} and ${r1 + 1} ` +
                `within columns ${A.c + 1} and ${B.c + 1}. One of those two rows must ` +
                `contain ${d} in each column, so ${d} can be eliminated from the rest of ` +
                `rows ${r0 + 1} and ${r1 + 1}.`,
              highlights: { cause, affected: elim.map((e) => e.idx), result: cause },
              eliminations: elim,
              placement: null as Placement | null,
            };
          }
        }
      }
    }
    return null;
  }

  /* ════════════════════════════════════════════════════════════════════════
   * 9. FINNED X-WING
   * Like an X-Wing, but one base row (or column) has extra candidates for d
   * beyond the two cover lines — the "fin". Eliminations are restricted to
   * cells that both (a) see the normal X-Wing cover cell AND (b) see the fin.
   * ═══════════════════════════════════════════════════════════════════════*/
  function finnedXWing(board: Board, cands: CandidateGrid) {
    for (let d = 1; d <= 9; d++) {
      // ── base = rows ────────────────────────────────────────────────────
      // Build per-row candidate positions
      const rowCandCols = Array.from({ length: 9 }, (_, r) =>
        Array.from({ length: 9 }, (__, c) => c)
          .filter((c: number) => board[r * 9 + c] === 0 && cands[r * 9 + c].has(d))
      );

      for (let rA = 0; rA < 9; rA++) {
        if (rowCandCols[rA].length < 2) continue;
        for (let rB = 0; rB < 9; rB++) {
          if (rB === rA || rowCandCols[rB].length !== 2) continue;
          const [c0, c1] = rowCandCols[rB]; // rB is the "clean" base row
          // rA must contain c0 and c1 plus at least one extra col (the fin)
          if (!rowCandCols[rA].includes(c0) || !rowCandCols[rA].includes(c1)) continue;
          const finCols = rowCandCols[rA].filter((c: number) => c !== c0 && c !== c1);
          if (finCols.length === 0) continue; // plain X-Wing handled above

          // All fin cells must be in the same box as the rA cover cells
          const finCells = finCols.map((c) => rA * 9 + c);
          const baseACoverCells = [rA * 9 + c0, rA * 9 + c1];
          const finBoxes = new Set(finCells.map(box));
          // For a valid finned X-Wing only one fin box is supported here
          if (finBoxes.size !== 1) continue;
          const finBox = [...finBoxes][0];

          // Eliminations: cells in cover columns that also see every fin cell
          // (i.e. are in the same box as the fin)
          const elim = [];
          for (const c of [c0, c1]) {
            for (let r = 0; r < 9; r++) {
              if (r === rA || r === rB) continue;
              const i = r * 9 + c;
              if (board[i] !== 0 || !cands[i].has(d)) continue;
              // Must see all fin cells → must be in finBox
              if (box(i) === finBox) elim.push({ idx: i, digit: d });
            }
          }
          if (elim.length) {
            const cause = [...baseACoverCells, ...finCells, rB * 9 + c0, rB * 9 + c1];
            return {
              technique: "Finned X-Wing",
              description:
                `Digit <strong>${d}</strong> forms an X-Wing in rows ${rA + 1} and ${rB + 1} ` +
                `on columns ${c0 + 1} and ${c1 + 1}, but row ${rA + 1} has extra ` +
                `candidate(s) in column(s) ${finCols.map((c) => c + 1).join(", ")} (the fin). ` +
                `Cells that see both a cover column and the fin can eliminate ${d}.`,
              highlights: { cause, affected: elim.map((e) => e.idx), result: cause },
              eliminations: elim,
              placement: null as Placement | null,
            };
          }
        }
      }
    }
    return null;
  }

  /* ════════════════════════════════════════════════════════════════════════
   * 10. SASHIMI FINNED X-WING
   * Like a Finned X-Wing, but one of the two "base" cells in the fin row is
   * missing — the pattern is degenerate but still forces eliminations in the
   * fin's box via the remaining cover column.
   * ═══════════════════════════════════════════════════════════════════════*/
  function sashimiXWing(board: Board, cands: CandidateGrid) {
    for (let d = 1; d <= 9; d++) {
      const rowCandCols = Array.from({ length: 9 }, (_, r) =>
        Array.from({ length: 9 }, (__, c) => c)
          .filter((c: number) => board[r * 9 + c] === 0 && cands[r * 9 + c].has(d))
      );

      for (let rA = 0; rA < 9; rA++) {
        for (let rB = 0; rB < 9; rB++) {
          if (rB === rA || rowCandCols[rB].length !== 2) continue;
          const [c0, c1] = rowCandCols[rB];

          // rA must contain exactly ONE of c0/c1, plus at least one extra (fin)
          const hasC0 = rowCandCols[rA].includes(c0);
          const hasC1 = rowCandCols[rA].includes(c1);
          if (hasC0 === hasC1) continue; // need exactly one
          const presentCol  = hasC0 ? c0 : c1; // the column rA shares with rB
          const missingCol  = hasC0 ? c1 : c0; // the column rA is missing
          const finCols = rowCandCols[rA].filter((c: number) => c !== presentCol);
          if (finCols.length === 0) continue;

          // All fin candidates must lie in one box
          const finCells = finCols.map((c) => rA * 9 + c);
          const finBoxes = new Set(finCells.map(box));
          if (finBoxes.size !== 1) continue;
          const finBox = [...finBoxes][0];

          // The rA cover cell for the presentCol must also be in the fin box
          if (box(rA * 9 + presentCol) !== finBox) continue;

          // Eliminations: cells in the missingCol that see the fin box
          const elim = [];
          for (let r = 0; r < 9; r++) {
            if (r === rA || r === rB) continue;
            const i = r * 9 + missingCol;
            if (board[i] !== 0 || !cands[i].has(d)) continue;
            if (box(i) === finBox) elim.push({ idx: i, digit: d });
          }
          if (elim.length) {
            const cause = [rA * 9 + presentCol, ...finCells, rB * 9 + c0, rB * 9 + c1];
            return {
              technique: "Sashimi Finned X-Wing",
              description:
                `Digit <strong>${d}</strong>: row ${rB + 1} has exactly 2 candidates in ` +
                `columns ${c0 + 1} and ${c1 + 1}. Row ${rA + 1} contains only column ` +
                `${presentCol + 1} of that pair plus fin cell(s) in the same box. ` +
                `This Sashimi pattern allows ${d} to be removed from column ` +
                `${missingCol + 1} cells that see the fin box.`,
              highlights: { cause, affected: elim.map((e) => e.idx), result: cause },
              eliminations: elim,
              placement: null as Placement | null,
            };
          }
        }
      }
    }
    return null;
  }


  /* ════════════════════════════════════════════════════════════════════════
   * 11. XY-WING
   * Three bi-value cells: pivot {X,Y}, pincer-A {X,Z}, pincer-B {Y,Z}.
   * The pivot sees both pincers. Any cell that sees BOTH pincers cannot
   * contain Z — because whichever value the pivot takes, one pincer must
   * hold Z.
   * ═══════════════════════════════════════════════════════════════════════*/
  function xyWing(board: Board, cands: CandidateGrid) {
    // Collect all bi-value cells
    const bivalue = [];
    for (let i = 0; i < 81; i++)
      if (board[i] === 0 && cands[i].size === 2) bivalue.push(i);

    for (const pivot of bivalue) {
      const [X, Y] = [...cands[pivot]];

      // Find pincers that the pivot sees
      for (const pA of bivalue) {
        if (pA === pivot || !sees(pivot, pA)) continue;
        if (!cands[pA].has(X)) continue;
        // pA has X; its other digit is Z
        const [Z_a] = [...cands[pA]].filter((d) => d !== X);

        for (const pB of bivalue) {
          if (pB === pivot || pB === pA || !sees(pivot, pB)) continue;
          if (!cands[pB].has(Y)) continue;
          const [Z_b] = [...cands[pB]].filter((d) => d !== Y);
          if (Z_a !== Z_b) continue; // pincers must share Z
          const Z = Z_a;

          // Eliminate Z from cells that see both pincers (but not the pivot)
          const elim = [];
          for (let i = 0; i < 81; i++) {
            if (i === pivot || i === pA || i === pB) continue;
            if (board[i] !== 0 || !cands[i].has(Z)) continue;
            if (sees(i, pA) && sees(i, pB)) elim.push({ idx: i, digit: Z });
          }
          if (elim.length) {
            return {
              technique: "XY-Wing",
              description:
                `Pivot ${RC(pivot)} {${X},${Y}} sees pincer ${RC(pA)} {${X},${Z}} ` +
                `and pincer ${RC(pB)} {${Y},${Z}}. ` +
                `Regardless of the pivot's value, one pincer must be <strong>${Z}</strong>, ` +
                `so ${Z} can be removed from any cell that sees both pincers.`,
              highlights: {
                cause: [pivot, pA, pB],
                affected: elim.map((e) => e.idx),
                result: [pivot, pA, pB],
              },
              eliminations: elim,
              placement: null as Placement | null,
            };
          }
        }
      }
    }
    return null;
  }

  /* ════════════════════════════════════════════════════════════════════════
   * 12. XYZ-WING
   * Pivot has exactly three candidates {X,Y,Z}. Two pincers each share a
   * unit with the pivot: one contains {X,Z}, the other {Y,Z}.
   * All three cells contain Z, so Z can be eliminated from any cell that
   * sees ALL THREE of pivot, pA, and pB.
   * ═══════════════════════════════════════════════════════════════════════*/
  function xyzWing(board: Board, cands: CandidateGrid) {
    // Collect tri-value cells (potential pivots) and bi-value cells (pincers)
    const trivalue = [];
    const bivalue  = [];
    for (let i = 0; i < 81; i++) {
      if (board[i] !== 0) continue;
      if (cands[i].size === 3) trivalue.push(i);
      if (cands[i].size === 2) bivalue.push(i);
    }

    for (const pivot of trivalue) {
      const pivotDigits = [...cands[pivot]]; // [X, Y, Z]

      // Try every combination of two bi-value cells as pincers
      for (let ai = 0; ai < bivalue.length - 1; ai++) {
        const pA = bivalue[ai];
        if (!sees(pivot, pA)) continue;
        // pA must be a 2-element subset of pivot's candidates
        if (![...cands[pA]].every((d) => cands[pivot].has(d))) continue;

        for (let bi2 = ai + 1; bi2 < bivalue.length; bi2++) {
          const pB = bivalue[bi2];
          if (pB === pA || !sees(pivot, pB)) continue;
          if (![...cands[pB]].every((d) => cands[pivot].has(d))) continue;

          // The two pincers together must cover all three pivot digits
          const covered = new Set([...cands[pA], ...cands[pB]]);
          if (covered.size !== 3) continue;

          // Z is the digit shared by all three cells
          const Z = pivotDigits.find((d) => cands[pA].has(d) && cands[pB].has(d))!;
          if (Z === undefined) continue;

          // Eliminate Z from cells that see ALL THREE: pivot, pA, pB
          const elim = [];
          for (let i = 0; i < 81; i++) {
            if (i === pivot || i === pA || i === pB) continue;
            if (board[i] !== 0 || !cands[i].has(Z)) continue;
            if (sees(i, pivot) && sees(i, pA) && sees(i, pB))
              elim.push({ idx: i, digit: Z });
          }
          if (elim.length) {
            return {
              technique: "XYZ-Wing",
              description:
                `Pivot ${RC(pivot)} {${pivotDigits.join(",")}} sees pincers ` +
                `${RC(pA)} {${[...cands[pA]].join(",")}} and ` +
                `${RC(pB)} {${[...cands[pB]].join(",")}}. ` +
                `All three cells contain <strong>${Z}</strong>. Any cell that ` +
                `sees all three of them cannot be ${Z}.`,
              highlights: {
                cause: [pivot, pA, pB],
                affected: elim.map((e) => e.idx),
                result: [pivot, pA, pB],
              },
              eliminations: elim,
              placement: null as Placement | null,
            };
          }
        }
      }
    }
    return null;
  }


  /* ════════════════════════════════════════════════════════════════════════
   * 13. TWO-STRING KITE
   * For digit d:
   *   • A row has exactly 2 candidates in columns cR1 and cR2.
   *   • A column has exactly 2 candidates in rows rC1 and rC2.
   *   • One end of the row-string and one end of the col-string share a box
   *     (the "kite corner").
   *   • The other end of the row-string and the other end of the col-string
   *     together eliminate d from any cell that sees both of them.
   * ═══════════════════════════════════════════════════════════════════════*/
  function twoStringKite(board: Board, cands: CandidateGrid) {
    for (let d = 1; d <= 9; d++) {
      // Build rows with exactly 2 d-candidates
      const rowPairs = [];
      for (let r = 0; r < 9; r++) {
        const cells = Array.from({ length: 9 }, (_, c) => r * 9 + c)
          .filter((i) => board[i] === 0 && cands[i].has(d));
        if (cells.length === 2) rowPairs.push(cells); // [idx0, idx1]
      }
      // Build columns with exactly 2 d-candidates
      const colPairs = [];
      for (let c = 0; c < 9; c++) {
        const cells = Array.from({ length: 9 }, (_, r) => r * 9 + c)
          .filter((i) => board[i] === 0 && cands[i].has(d));
        if (cells.length === 2) colPairs.push(cells);
      }

      for (const rowStr of rowPairs) {
        for (const colStr of colPairs) {
          // The row and column must be different lines
          if (row(rowStr[0]) === row(colStr[0])) continue;
          if (col(colStr[0]) === col(rowStr[0])) continue;

          // Try both orientations: which end of rowStr is the kite corner?
          for (let ri = 0; ri < 2; ri++) {
            const rCorner = rowStr[ri];       // corner end (shares box with col)
            const rTail   = rowStr[1 - ri];   // tail end (does the eliminating)

            for (let ci = 0; ci < 2; ci++) {
              const cCorner = colStr[ci];     // corner end
              const cTail   = colStr[1 - ci]; // tail end

              // Corner condition: rCorner and cCorner share a box
              if (box(rCorner) !== box(cCorner)) continue;
              // They must not be the same cell
              if (rCorner === cCorner) continue;

              // Eliminations: cells that see BOTH tails
              const elim = [];
              for (let i = 0; i < 81; i++) {
                if (i === rTail || i === cTail) continue;
                if (board[i] !== 0 || !cands[i].has(d)) continue;
                if (sees(i, rTail) && sees(i, cTail))
                  elim.push({ idx: i, digit: d });
              }
              if (elim.length) {
                return {
                  technique: "Two-String Kite",
                  description:
                    `Digit <strong>${d}</strong>: the row-string ${RC(rowStr[0])}–${RC(rowStr[1])} ` +
                    `and column-string ${RC(colStr[0])}–${RC(colStr[1])} share a box at ` +
                    `${RC(rCorner)} / ${RC(cCorner)}. ` +
                    `The opposite ends ${RC(rTail)} and ${RC(cTail)} together eliminate ${d} ` +
                    `from any cell that sees both.`,
                  highlights: {
                    cause: [...rowStr, ...colStr],
                    affected: elim.map((e) => e.idx),
                    result: [rTail, cTail],
                  },
                  eliminations: elim,
                  placement: null as Placement | null,
                };
              }
            }
          }
        }
      }
    }
    return null;
  }

  /* ════════════════════════════════════════════════════════════════════════
   * 14. SKYSCRAPER
   * For digit d, two rows (or two columns) each have exactly 2 candidates.
   * One column (or row) is shared between them (the "base column").
   * The two unshared ends are in different rows (or columns).
   * Any cell that sees BOTH unshared ends cannot contain d.
   *
   * This is essentially a chain: if d is NOT at one end, it propagates
   * through the base column to the other base cell, then to the other end.
   * ═══════════════════════════════════════════════════════════════════════*/
  function skyscraper(board: Board, cands: CandidateGrid) {
    for (let d = 1; d <= 9; d++) {
      // ── Two rows share one column ──────────────────────────────────────
      const rowPairs = [];
      for (let r = 0; r < 9; r++) {
        const cells = Array.from({ length: 9 }, (_, c) => r * 9 + c)
          .filter((i) => board[i] === 0 && cands[i].has(d));
        if (cells.length === 2) rowPairs.push(cells);
      }
      for (let a = 0; a < rowPairs.length - 1; a++) {
        for (let b = a + 1; b < rowPairs.length; b++) {
          const A = rowPairs[a], B = rowPairs[b];
          // Find the shared column
          const sharedCols = [col(A[0]), col(A[1])].filter(
            (c) => col(B[0]) === c || col(B[1]) === c
          );
          if (sharedCols.length !== 1) continue;
          const sharedCol = sharedCols[0];

          // Tails: the cell in each row that is NOT in the shared column
          const tailA = A.find((i) => col(i) !== sharedCol)!;
          const tailB = B.find((i) => col(i) !== sharedCol)!;

          // Tails must be in different columns (otherwise it's an X-Wing)
          if (col(tailA) === col(tailB)) continue;

          const elim = [];
          for (let i = 0; i < 81; i++) {
            if (i === tailA || i === tailB) continue;
            if (board[i] !== 0 || !cands[i].has(d)) continue;
            if (sees(i, tailA) && sees(i, tailB))
              elim.push({ idx: i, digit: d });
          }
          if (elim.length) {
            return {
              technique: "Skyscraper",
              description:
                `Digit <strong>${d}</strong>: rows ${row(A[0]) + 1} and ${row(B[0]) + 1} ` +
                `each have exactly 2 candidates and share column ${sharedCol + 1}. ` +
                `The unshared ends ${RC(tailA)} and ${RC(tailB)} form a chain: ` +
                `any cell seeing both cannot contain ${d}.`,
              highlights: {
                cause: [...A, ...B],
                affected: elim.map((e) => e.idx),
                result: [tailA, tailB],
              },
              eliminations: elim,
              placement: null as Placement | null,
            };
          }
        }
      }

      // ── Two columns share one row ──────────────────────────────────────
      const colPairs = [];
      for (let c = 0; c < 9; c++) {
        const cells = Array.from({ length: 9 }, (_, r) => r * 9 + c)
          .filter((i) => board[i] === 0 && cands[i].has(d));
        if (cells.length === 2) colPairs.push(cells);
      }
      for (let a = 0; a < colPairs.length - 1; a++) {
        for (let b = a + 1; b < colPairs.length; b++) {
          const A = colPairs[a], B = colPairs[b];
          const sharedRows = [row(A[0]), row(A[1])].filter(
            (r) => row(B[0]) === r || row(B[1]) === r
          );
          if (sharedRows.length !== 1) continue;
          const sharedRow = sharedRows[0];

          const tailA = A.find((i) => row(i) !== sharedRow)!;
          const tailB = B.find((i) => row(i) !== sharedRow)!;
          if (row(tailA) === row(tailB)) continue;

          const elim = [];
          for (let i = 0; i < 81; i++) {
            if (i === tailA || i === tailB) continue;
            if (board[i] !== 0 || !cands[i].has(d)) continue;
            if (sees(i, tailA) && sees(i, tailB))
              elim.push({ idx: i, digit: d });
          }
          if (elim.length) {
            return {
              technique: "Skyscraper",
              description:
                `Digit <strong>${d}</strong>: columns ${col(A[0]) + 1} and ${col(B[0]) + 1} ` +
                `each have exactly 2 candidates and share row ${sharedRow + 1}. ` +
                `The unshared ends ${RC(tailA)} and ${RC(tailB)} form a chain: ` +
                `any cell seeing both cannot contain ${d}.`,
              highlights: {
                cause: [...A, ...B],
                affected: elim.map((e) => e.idx),
                result: [tailA, tailB],
              },
              eliminations: elim,
              placement: null as Placement | null,
            };
          }
        }
      }
    }
    return null;
  }


  /* ════════════════════════════════════════════════════════════════════════
   * 15. UNIQUE RECTANGLE — TYPE 1
   *
   * Premise: a valid Sudoku has exactly one solution. A "deadly pattern"
   * would allow two solutions, so it cannot exist.
   *
   * The UR Type 1 deadly pattern: four cells forming a rectangle that span
   * exactly two rows, two columns, and two boxes, where three of the four
   * cells are bi-value cells containing the same two digits {A,B}. The
   * fourth "floor" cell contains {A,B} plus extra candidates.
   *
   * If the extra candidates were removed the rectangle would become deadly,
   * so the solution MUST use one of those extras in that cell — meaning A
   * and B can be eliminated from it.
   * ═══════════════════════════════════════════════════════════════════════*/
  function uniqueRectangle(board: Board, cands: CandidateGrid) {
    // Find all bi-value cells grouped by their candidate-pair
    const biPairCells: Record<string, number[]> = {}; // key = "A,B" → [idx, ...]
    for (let i = 0; i < 81; i++) {
      if (board[i] !== 0 || cands[i].size !== 2) continue;
      const key = [...cands[i]].sort((a, b) => a - b).join(",");
      if (!biPairCells[key]) biPairCells[key] = [];
      biPairCells[key].push(i);
    }

    for (const [key, cells] of Object.entries(biPairCells)) {
      if (cells.length < 3) continue;
      const [dA, dB] = key.split(",").map(Number);

      // Try every combination of 3 bi-value cells as the "roof" cells
      for (let a = 0; a < cells.length - 2; a++) {
        for (let b = a + 1; b < cells.length - 1; b++) {
          for (let c = b + 1; c < cells.length; c++) {
            const roof = [cells[a], cells[b], cells[c]];
            const rows: number[] = [...new Set(roof.map(row))];
            const cols: number[] = [...new Set(roof.map(col))];
            if (rows.length !== 2 || cols.length !== 2) continue;

            // The four corners of the rectangle
            const [r0, r1] = rows as [number, number];
            const [c0, c1] = cols as [number, number];
            const corners = [r0 * 9 + c0, r0 * 9 + c1, r1 * 9 + c0, r1 * 9 + c1];

            // Must span exactly 2 boxes
            const boxSet = new Set(corners.map(box));
            if (boxSet.size !== 2) continue;

            // The fourth corner is the "floor" cell not in roof
            const floor = corners.find((i) => !roof.includes(i))!;
            if (board[floor] !== 0) continue;
            // Floor must contain both UR digits plus at least one extra
            if (!cands[floor].has(dA) || !cands[floor].has(dB)) continue;
            if (cands[floor].size <= 2) continue; // already a bi-value → deadly

            // Eliminate the UR digits from the floor cell
            const elim = [
              { idx: floor, digit: dA },
              { idx: floor, digit: dB },
            ];
            return {
              technique: "Unique Rectangle (Type 1)",
              description:
                `Cells ${roof.map(RC).join(", ")} are all bi-value {${dA},${dB}}, ` +
                `forming three corners of a rectangle. If ${RC(floor)} also contained ` +
                `only {${dA},${dB}}, the puzzle would have two solutions (deadly pattern). ` +
                `Therefore ${dA} and ${dB} can be eliminated from ${RC(floor)}.`,
              highlights: {
                cause: roof,
                affected: [floor],
                result: [floor],
              },
              eliminations: elim,
              placement: null as Placement | null,
            };
          }
        }
      }
    }
    return null;
  }

  /* ════════════════════════════════════════════════════════════════════════
   * 16. BUG + 1  (Bivalue Universal Grave + 1)
   *
   * A BUG is a state where every unsolved cell has exactly 2 candidates AND
   * every digit appears exactly twice in every unit — a deadly pattern with
   * two solutions. To avoid it, exactly one cell must have more than 2
   * candidates (the "+1" cell). That extra candidate is the only digit that
   * breaks the BUG, so it MUST be placed there.
   *
   * Detection: every empty cell has ≤ 2 candidates except exactly one cell
   * which has exactly 3. The digit that appears 3 times in one of that
   * cell's units (row, col, or box) is the BUG digit and must be placed.
   * ═══════════════════════════════════════════════════════════════════════*/
  function bugPlusOne(board: Board, cands: CandidateGrid) {
    const triCells = [];
    for (let i = 0; i < 81; i++) {
      if (board[i] !== 0) continue;
      if (cands[i].size === 3) triCells.push(i);
      else if (cands[i].size > 3) return null; // not a BUG+1 state
    }
    if (triCells.length !== 1) return null;

    const cell = triCells[0];
    const digits = [...cands[cell]];

    // Confirm BUG: every other empty cell must have exactly 2 candidates
    for (let i = 0; i < 81; i++) {
      if (board[i] !== 0 || i === cell) continue;
      if (cands[i].size !== 2) return null;
    }

    // Find the digit that would appear 3 times in one of the cell's units
    // (that's the non-BUG digit that breaks the deadlock)
    for (const d of digits) {
      for (const getUnit of [rowCells, colCells, boxCells]) {
        const unit = getUnit(cell);
        const count = unit.filter(
          (i) => board[i] === 0 && cands[i].has(d)
        ).length;
        if (count === 3) {
          // d appears 3 times in this unit → it is the BUG-breaking digit
          return {
            technique: "BUG +1",
            description:
              `The board is one step away from a deadly Bivalue Universal Grave. ` +
              `Every empty cell has exactly 2 candidates except ${RC(cell)} which has 3. ` +
              `Digit <strong>${d}</strong> appears 3 times in one of its units instead of 2, ` +
              `so placing <strong>${d}</strong> in ${RC(cell)} is the only way to avoid ` +
              `a non-unique solution.`,
            highlights: {
              cause: unit.filter((i) => board[i] === 0 && cands[i].has(d)),
              affected: [] as number[],
              result: [cell],
            },
            eliminations: [] as Elimination[],
            placement: { idx: cell, digit: d },
          };
        }
      }
    }
    return null;
  }


  /* ════════════════════════════════════════════════════════════════════════
   * 17. SWORDFISH
   * Generalization of X-Wing to 3 base rows (or cols) and 3 cover cols (rows).
   * ═══════════════════════════════════════════════════════════════════════*/
  function swordfish(board: Board, cands: CandidateGrid) {
    for (let d = 1; d <= 9; d++) {
      // Base = rows
      const rowsWithD = [];
      for (let r = 0; r < 9; r++) {
        const cols = [];
        for (let c = 0; c < 9; c++) {
          const i = r * 9 + c;
          if (board[i] === 0 && cands[i].has(d)) cols.push(c);
        }
        if (cols.length >= 2 && cols.length <= 3) rowsWithD.push({ r, cols });
      }
      for (let a = 0; a < rowsWithD.length - 2; a++) {
        for (let b = a + 1; b < rowsWithD.length - 1; b++) {
          for (let c2 = b + 1; c2 < rowsWithD.length; c2++) {
            const allCols = new Set([...rowsWithD[a].cols, ...rowsWithD[b].cols, ...rowsWithD[c2].cols]);
            if (allCols.size !== 3) continue;
            const coverCols = [...allCols];
            const baseRows = [rowsWithD[a].r, rowsWithD[b].r, rowsWithD[c2].r];
            const elim = [];
            const cause = [];
            for (const br of baseRows) for (const cc of coverCols) {
              const i = br * 9 + cc;
              if (board[i] === 0 && cands[i].has(d)) cause.push(i);
            }
            for (const cc of coverCols) {
              for (let r = 0; r < 9; r++) {
                if (baseRows.includes(r)) continue;
                const i = r * 9 + cc;
                if (board[i] === 0 && cands[i].has(d)) elim.push({ idx: i, digit: d });
              }
            }
            if (elim.length) {
              return { technique: "Swordfish", description: `Digit <strong>${d}</strong> in rows ${baseRows.map(r=>r+1).join(", ")} is confined to columns ${coverCols.map(c=>c+1).join(", ")}. Eliminating ${d} from other cells in those columns.`, highlights: { cause, affected: elim.map(e=>e.idx), result: cause }, eliminations: elim, placement: null as Placement | null };
            }
          }
        }
      }
      // Base = cols
      const colsWithD = [];
      for (let c = 0; c < 9; c++) {
        const rows = [];
        for (let r = 0; r < 9; r++) {
          const i = r * 9 + c;
          if (board[i] === 0 && cands[i].has(d)) rows.push(r);
        }
        if (rows.length >= 2 && rows.length <= 3) colsWithD.push({ c, rows });
      }
      for (let a = 0; a < colsWithD.length - 2; a++) {
        for (let b = a + 1; b < colsWithD.length - 1; b++) {
          for (let c2 = b + 1; c2 < colsWithD.length; c2++) {
            const allRows = new Set([...colsWithD[a].rows, ...colsWithD[b].rows, ...colsWithD[c2].rows]);
            if (allRows.size !== 3) continue;
            const coverRows = [...allRows];
            const baseCols = [colsWithD[a].c, colsWithD[b].c, colsWithD[c2].c];
            const elim = [];
            const cause = [];
            for (const bc of baseCols) for (const cr of coverRows) {
              const i = cr * 9 + bc;
              if (board[i] === 0 && cands[i].has(d)) cause.push(i);
            }
            for (const cr of coverRows) {
              for (let c = 0; c < 9; c++) {
                if (baseCols.includes(c)) continue;
                const i = cr * 9 + c;
                if (board[i] === 0 && cands[i].has(d)) elim.push({ idx: i, digit: d });
              }
            }
            if (elim.length) {
              return { technique: "Swordfish", description: `Digit <strong>${d}</strong> in columns ${baseCols.map(c=>c+1).join(", ")} is confined to rows ${coverRows.map(r=>r+1).join(", ")}. Eliminating ${d} from other cells in those rows.`, highlights: { cause, affected: elim.map(e=>e.idx), result: cause }, eliminations: elim, placement: null as Placement | null };
            }
          }
        }
      }
    }
    return null;
  }

  /* ════════════════════════════════════════════════════════════════════════
   * 18. JELLYFISH
   * Generalization to 4 base lines and 4 cover lines.
   * ═══════════════════════════════════════════════════════════════════════*/
  function jellyfish(board: Board, cands: CandidateGrid) {
    for (let d = 1; d <= 9; d++) {
      const rowsWithD = [];
      for (let r = 0; r < 9; r++) {
        const cols = [];
        for (let c = 0; c < 9; c++) { if (board[r*9+c]===0 && cands[r*9+c].has(d)) cols.push(c); }
        if (cols.length >= 2 && cols.length <= 4) rowsWithD.push({ r, cols });
      }
      for (let a = 0; a < rowsWithD.length - 3; a++) {
        for (let b = a+1; b < rowsWithD.length - 2; b++) {
          for (let c2 = b+1; c2 < rowsWithD.length - 1; c2++) {
            for (let d2 = c2+1; d2 < rowsWithD.length; d2++) {
              const allCols = new Set([...rowsWithD[a].cols,...rowsWithD[b].cols,...rowsWithD[c2].cols,...rowsWithD[d2].cols]);
              if (allCols.size !== 4) continue;
              const coverCols = [...allCols];
              const baseRows = [rowsWithD[a].r, rowsWithD[b].r, rowsWithD[c2].r, rowsWithD[d2].r];
              const elim = [], cause = [];
              for (const br of baseRows) for (const cc of coverCols) { const i=br*9+cc; if (board[i]===0&&cands[i].has(d)) cause.push(i); }
              for (const cc of coverCols) { for (let r=0;r<9;r++) { if (baseRows.includes(r)) continue; const i=r*9+cc; if (board[i]===0&&cands[i].has(d)) elim.push({idx:i,digit:d}); } }
              if (elim.length) {
                return { technique: "Jellyfish", description: `Digit <strong>${d}</strong> forms a Jellyfish pattern across rows ${baseRows.map(r=>r+1).join(", ")} and columns ${coverCols.map(c=>c+1).join(", ")}.`, highlights: { cause, affected: elim.map(e=>e.idx), result: cause }, eliminations: elim, placement: null as Placement | null };
              }
            }
          }
        }
      }
    }
    return null;
  }

  /* ════════════════════════════════════════════════════════════════════════
   * 19. W-WING
   * Two bi-value cells {X,Y} connected by a strong link on one digit.
   * ═══════════════════════════════════════════════════════════════════════*/
  function wWing(board: Board, cands: CandidateGrid) {
    const bivalue = [];
    for (let i = 0; i < 81; i++) if (board[i] === 0 && cands[i].size === 2) bivalue.push(i);

    for (let ai = 0; ai < bivalue.length - 1; ai++) {
      for (let bi = ai + 1; bi < bivalue.length; bi++) {
        const a = bivalue[ai], b = bivalue[bi];
        if (sees(a, b)) continue; // Must NOT see each other
        // Both must have the same two candidates (Set equality, order-independent)
        if (cands[a].size !== 2 || cands[b].size !== 2) continue;
        let samePair = true;
        for (const d of cands[a]) { if (!cands[b].has(d)) { samePair = false; break; } }
        if (!samePair) continue;
        const [X, Y] = [...cands[a]];
        // Try each digit as the linking digit
        for (const linkDigit of [X, Y]) {
          const elimDigit = linkDigit === X ? Y : X;
          // Find a unit where linkDigit has a strong link connecting cells that see a and b respectively
          for (const unit of ALL_UNITS) {
            const linkCells = unit.filter(i => board[i] === 0 && cands[i].has(linkDigit));
            if (linkCells.length !== 2) continue; // Strong link = exactly 2 in unit
            const [l1, l2] = linkCells;
            // One link cell must see a, the other must see b (or vice versa)
            if (sees(l1, a) && sees(l2, b)) { /* ok */ }
            else if (sees(l1, b) && sees(l2, a)) { /* ok */ }
            else continue;
            // Eliminate elimDigit from cells that see BOTH a and b
            const elim = [];
            for (let i = 0; i < 81; i++) {
              if (i === a || i === b) continue;
              if (board[i] !== 0 || !cands[i].has(elimDigit)) continue;
              if (sees(i, a) && sees(i, b)) elim.push({ idx: i, digit: elimDigit });
            }
            if (elim.length) {
              return { technique: "W-Wing", description: `${RC(a)} and ${RC(b)} are both {${X},${Y}}. A strong link on <strong>${linkDigit}</strong> connects them via ${RC(l1)}–${RC(l2)}. <strong>${elimDigit}</strong> can be eliminated from cells seeing both endpoints.`, highlights: { cause: [a, b, l1, l2], affected: elim.map(e=>e.idx), result: [a, b] }, eliminations: elim, placement: null as Placement | null };
            }
          }
        }
      }
    }
    return null;
  }

  /* ════════════════════════════════════════════════════════════════════════
   * 20. SIMPLE COLORING
   * Conjugate pair chains — Color Wrap and Color Trap.
   * ═══════════════════════════════════════════════════════════════════════*/
  function simpleColoring(board: Board, cands: CandidateGrid) {
    for (let d = 1; d <= 9; d++) {
      // Build conjugate pair graph for digit d
      const adj: number[][] = Array.from({ length: 81 }, (): number[] => []);
      for (const unit of ALL_UNITS) {
        const cells = unit.filter(i => board[i] === 0 && cands[i].has(d));
        if (cells.length === 2) {
          adj[cells[0]].push(cells[1]);
          adj[cells[1]].push(cells[0]);
        }
      }
      // BFS/color each connected component
      const color = new Array(81).fill(-1); // -1=unvisited, 0=colorA, 1=colorB
      for (let start = 0; start < 81; start++) {
        if (board[start] !== 0 || !cands[start].has(d) || color[start] !== -1) continue;
        if (adj[start].length === 0) continue;
        // BFS
        const queue = [start];
        color[start] = 0;
        const component: number[][] = [[], []]; // [colorA cells, colorB cells]
        component[0].push(start);
        let valid = true;
        while (queue.length > 0) {
          const cur = queue.shift()!;
          const nextColor = 1 - color[cur]!;
          for (const nb of adj[cur]) {
            if (color[nb] === -1) {
              color[nb] = nextColor;
              component[nextColor].push(nb);
              queue.push(nb);
            } else if (color[nb] === color[cur]!) {
              valid = false; // Color wrap — contradiction
            }
          }
        }
        if (component[0].length + component[1].length < 2) continue;

        // Color Wrap: two same-colored cells see each other → that color is false
        if (!valid) {
          // Find which color has the contradiction
          for (const grp of [0, 1]) {
            const cells = component[grp];
            for (let i = 0; i < cells.length; i++) {
              for (let j = i + 1; j < cells.length; j++) {
                if (sees(cells[i], cells[j])) {
                  // This color is impossible — eliminate d from ALL cells of this color
                  const elim = cells.map(idx => ({ idx, digit: d }));
                  const otherCells = component[1 - grp];
                  return { technique: "Simple Coloring (Wrap)", description: `For digit <strong>${d}</strong>, a conjugate chain has two same-colored cells (${RC(cells[i])}, ${RC(cells[j])}) that see each other. That color is impossible — eliminating ${d} from all cells of that color.`, highlights: { cause: otherCells, affected: cells, result: otherCells }, eliminations: elim, placement: null as Placement | null };
                }
              }
            }
          }
        }

        // Color Trap: an uncolored cell sees both colors → can't be d
        const elim = [];
        for (let i = 0; i < 81; i++) {
          if (board[i] !== 0 || !cands[i].has(d) || color[i] !== -1) continue;
          let seesA = false, seesB = false;
          for (const ca of component[0]) { if (sees(i, ca)) { seesA = true; break; } }
          if (!seesA) continue;
          for (const cb of component[1]) { if (sees(i, cb)) { seesB = true; break; } }
          if (seesB) elim.push({ idx: i, digit: d });
        }
        if (elim.length) {
          const allChain = [...component[0], ...component[1]];
          return { technique: "Simple Coloring (Trap)", description: `For digit <strong>${d}</strong>, cells ${elim.map(e => RC(e.idx)).join(", ")} see both colors of a conjugate chain. Since one color must hold ${d}, these cells cannot.`, highlights: { cause: allChain, affected: elim.map(e=>e.idx), result: allChain }, eliminations: elim, placement: null as Placement | null };
        }
      }
    }
    return null;
  }

  /* ════════════════════════════════════════════════════════════════════════
   * 21. EMPTY RECTANGLE
   * Box where d-candidates form L/T shape + strong link outside.
   * ═══════════════════════════════════════════════════════════════════════*/
  function emptyRectangle(board: Board, cands: CandidateGrid) {
    for (let d = 1; d <= 9; d++) {
      for (let bx = 0; bx < 9; bx++) {
        const br = (bx / 3 | 0) * 3, bc = (bx % 3) * 3;
        const boxCellsWithD = [];
        for (let r = br; r < br + 3; r++)
          for (let c = bc; c < bc + 3; c++) {
            const i = r * 9 + c;
            if (board[i] === 0 && cands[i].has(d)) boxCellsWithD.push(i);
          }
        if (boxCellsWithD.length < 2) continue;
        // Check if all candidates lie on one row + one col (ER shape)
        const rows = [...new Set(boxCellsWithD.map(row))];
        const cols = [...new Set(boxCellsWithD.map(col))];
        // Need candidates in at least 2 rows and 2 cols for ER
        if (rows.length < 2 || cols.length < 2) continue;
        // Try each row/col as the ER "line"
        for (const erRow of rows) {
          for (const erCol of cols) {
            // All candidates must be on erRow OR erCol
            const onLines = boxCellsWithD.every(i => row(i) === erRow || col(i) === erCol);
            if (!onLines) continue;
            // Found an ER with intersection at (erRow, erCol)
            // Strong link in erRow outside box → elimination at intersection of link's other end's column and erCol
            const rowCells = [];
            for (let c = 0; c < 9; c++) {
              if (c >= bc && c < bc + 3) continue;
              const i = erRow * 9 + c;
              if (board[i] === 0 && cands[i].has(d)) rowCells.push(i);
            }
            // Not a simple ER pattern via row. Try column strong link.
            const colCells = [];
            for (let r = 0; r < 9; r++) {
              if (r >= br && r < br + 3) continue;
              const i = r * 9 + erCol;
              if (board[i] === 0 && cands[i].has(d)) colCells.push(i);
            }
            // For column-based ER: find a strong link in a ROW that has one cell at erCol
            for (let r = 0; r < 9; r++) {
              if (r >= br && r < br + 3) continue;
              const i = r * 9 + erCol;
              if (board[i] !== 0 || !cands[i].has(d)) continue;
              // Find strong link in this ROW
              const rowLine = [];
              for (let c = 0; c < 9; c++) {
                const idx = r * 9 + c;
                if (board[idx] === 0 && cands[idx].has(d)) rowLine.push(idx);
              }
              if (rowLine.length !== 2) continue;
              const other = rowLine[0] === i ? rowLine[1] : rowLine[0];
              // Elimination target: intersection of other's column and erRow
              const target = erRow * 9 + col(other);
              if (target === other) continue;
              if (board[target] !== 0 || !cands[target].has(d)) continue;
              // Verify target is not in the ER box
              if (row(target) >= br && row(target) < br+3 && col(target) >= bc && col(target) < bc+3) continue;
              const elim = [{ idx: target, digit: d }];
              return { technique: "Empty Rectangle", description: `Digit <strong>${d}</strong>: an Empty Rectangle in box ${bx+1} (row ${erRow+1} × col ${erCol+1}) combines with a strong link ${RC(i)}–${RC(other)} to eliminate ${d} from ${RC(target)}.`, highlights: { cause: [...boxCellsWithD, i, other], affected: [target], result: boxCellsWithD }, eliminations: elim, placement: null as Placement | null };
            }
            // Also try row-based: strong link in COL with one cell at erRow
            for (let c = 0; c < 9; c++) {
              if (c >= bc && c < bc + 3) continue;
              const i = erRow * 9 + c;
              if (board[i] !== 0 || !cands[i].has(d)) continue;
              const colLine = [];
              for (let r = 0; r < 9; r++) {
                const idx = r * 9 + c;
                if (board[idx] === 0 && cands[idx].has(d)) colLine.push(idx);
              }
              if (colLine.length !== 2) continue;
              const other = colLine[0] === i ? colLine[1] : colLine[0];
              const target = row(other) * 9 + erCol;
              if (target === other) continue;
              if (board[target] !== 0 || !cands[target].has(d)) continue;
              if (row(target) >= br && row(target) < br+3 && col(target) >= bc && col(target) < bc+3) continue;
              const elim = [{ idx: target, digit: d }];
              return { technique: "Empty Rectangle", description: `Digit <strong>${d}</strong>: an Empty Rectangle in box ${bx+1} (row ${erRow+1} × col ${erCol+1}) combines with a strong link ${RC(i)}–${RC(other)} to eliminate ${d} from ${RC(target)}.`, highlights: { cause: [...boxCellsWithD, i, other], affected: [target], result: boxCellsWithD }, eliminations: elim, placement: null as Placement | null };
            }
          }
        }
      }
    }
    return null;
  }

  /* ════════════════════════════════════════════════════════════════════════
   * 22. ALS-XZ (Almost Locked Set)
   * Two ALS sharing a restricted common → eliminate non-restricted common.
   * ═══════════════════════════════════════════════════════════════════════*/
  function alsXZ(board: Board, cands: CandidateGrid) {
    // Find all ALS: a set of N cells (in same unit) with exactly N+1 candidates total
    // Limit to size 2-4 for performance
    const allALS: { cells: number[]; digits: number[] }[] = [];
    for (const unit of ALL_UNITS) {
      const empty = unit.filter(i => board[i] === 0 && cands[i].size > 0);
      // Enumerate subsets of size 2-4
      for (let size = 2; size <= Math.min(4, empty.length); size++) {
        const combos = combinations(empty, size);
        for (const combo of combos) {
          const digits = new Set<number>();
          for (const i of combo) for (const d of cands[i]) digits.add(d);
          if (digits.size === size + 1) {
            allALS.push({ cells: combo, digits: [...digits] });
          }
        }
      }
    }
    // Deduplicate ALS by cell set
    const seen = new Set();
    const uniqueALS = [];
    for (const als of allALS) {
      const key = als.cells.slice().sort().join(",");
      if (!seen.has(key)) { seen.add(key); uniqueALS.push(als); }
    }

    // Find ALS pairs with restricted common
    for (let ai = 0; ai < uniqueALS.length - 1; ai++) {
      for (let bi = ai + 1; bi < uniqueALS.length; bi++) {
        const alsA = uniqueALS[ai], alsB = uniqueALS[bi];
        // Must not overlap
        if (alsA.cells.some(c => alsB.cells.includes(c))) continue;
        // Find common digits
        const commonDigits = alsA.digits.filter(d => alsB.digits.includes(d));
        if (commonDigits.length < 2) continue; // Need at least 2 (one restricted, one to eliminate)

        for (const rc of commonDigits) {
          // Check if rc is a restricted common:
          // All cells in A with rc must see all cells in B with rc
          const aCellsWithRC = alsA.cells.filter(i => cands[i].has(rc));
          const bCellsWithRC = alsB.cells.filter(i => cands[i].has(rc));
          let restricted = true;
          for (const a of aCellsWithRC) {
            for (const b of bCellsWithRC) {
              if (!sees(a, b)) { restricted = false; break; }
            }
            if (!restricted) break;
          }
          if (!restricted) continue;

          // rc is restricted common. Eliminate other common digits from cells seeing all occurrences
          for (const elDigit of commonDigits) {
            if (elDigit === rc) continue;
            const aCellsWithEl = alsA.cells.filter(i => cands[i].has(elDigit));
            const bCellsWithEl = alsB.cells.filter(i => cands[i].has(elDigit));
            const allWithEl = [...aCellsWithEl, ...bCellsWithEl];
            const elim = [];
            for (let i = 0; i < 81; i++) {
              if (board[i] !== 0 || !cands[i].has(elDigit)) continue;
              if (alsA.cells.includes(i) || alsB.cells.includes(i)) continue;
              if (allWithEl.every(c => sees(i, c))) elim.push({ idx: i, digit: elDigit });
            }
            if (elim.length) {
              const cause = [...alsA.cells, ...alsB.cells];
              return { technique: "ALS-XZ", description: `Two Almost Locked Sets (${alsA.cells.map(RC).join(",")}) and (${alsB.cells.map(RC).join(",")}) share restricted common <strong>${rc}</strong>. Digit <strong>${elDigit}</strong> can be eliminated from cells seeing all its occurrences in both sets.`, highlights: { cause, affected: elim.map(e=>e.idx), result: cause }, eliminations: elim, placement: null as Placement | null };
            }
          }
        }
      }
    }
    return null;
  }

  /** Generate all k-combinations of arr */
  function combinations(arr: number[], k: number): number[][] {
    const result: number[][] = [];
    function gen(start: number, combo: number[]) {
      if (combo.length === k) { result.push(combo.slice()); return; }
      for (let i = start; i <= arr.length - (k - combo.length); i++) {
        combo.push(arr[i]);
        gen(i + 1, combo);
        combo.pop();
      }
    }
    gen(0, []);
    return result;
  }

  /* ════════════════════════════════════════════════════════════════════════
   * TECHNIQUES REGISTRY
   *
   * Ordered easy → hard. The hint engine iterates this array and returns
   * the first technique that fires. Each entry exposes:
   *   name   : string          — display / lookup name
   *   detect : Function        — detect(board, cands) → HintResult | null
   * ═══════════════════════════════════════════════════════════════════════*/
  const TECHNIQUES = [
    { name: "Naked Single",               detect: nakedSingle      },
    { name: "Hidden Single",              detect: hiddenSingle     },
    { name: "Locked Candidates",          detect: lockedCandidates },
    { name: "Naked Pair",                 detect: nakedPair        },
    { name: "Naked Triple",               detect: nakedTriple      },
    { name: "Hidden Pair",                detect: hiddenPair       },
    { name: "Hidden Triple",              detect: hiddenTriple     },
    { name: "X-Wing",                     detect: xWing            },
    { name: "Finned X-Wing",              detect: finnedXWing      },
    { name: "Sashimi Finned X-Wing",      detect: sashimiXWing     },
    { name: "Swordfish",                  detect: swordfish        },
    { name: "Jellyfish",                  detect: jellyfish        },
    { name: "XY-Wing",                    detect: xyWing           },
    { name: "XYZ-Wing",                   detect: xyzWing          },
    { name: "W-Wing",                     detect: wWing            },
    { name: "Two-String Kite",            detect: twoStringKite    },
    { name: "Skyscraper",                 detect: skyscraper       },
    { name: "Simple Coloring",            detect: simpleColoring   },
    { name: "Empty Rectangle",            detect: emptyRectangle   },
    { name: "Unique Rectangle (Type 1)",  detect: uniqueRectangle  },
    { name: "BUG +1",                     detect: bugPlusOne       },
    { name: "ALS-XZ",                     detect: alsXZ            },
  ];

  /* ════════════════════════════════════════════════════════════════════════
   * PUBLIC API
   * ═══════════════════════════════════════════════════════════════════════*/

  /**
   * getHint(board, candidates?)
   * Returns the first applicable HintResult (simplest technique first),
   * or null if no technique applies to the current board state.
   *
   * @param {number[]}    board       — 81-element array (0 = empty)
   * @param {Set<number>[]?} candidates — pencil marks; built automatically if omitted
   * @returns {HintResult|null}
   */
  function getHint(board: Board, candidates: CandidateGrid | null) {
    const cands = ensure(board, candidates);
    for (const { detect } of TECHNIQUES) {
      const result = detect(board, cands);
      if (result) return result;
    }
    return null;
  }

  /**
   * detectAll(board, candidates?)
   * Runs every technique and returns an array of all that fire (one result
   * per technique, in difficulty order).
   *
   * @param {number[]}    board
   * @param {Set<number>[]?} candidates
   * @returns {HintResult[]}
   */
  function detectAll(board: Board, candidates: CandidateGrid | null) {
    const cands = ensure(board, candidates);
    return TECHNIQUES.map(({ detect }) => detect(board, cands)).filter(Boolean);
  }

  /* ════════════════════════════════════════════════════════════════════════
   * EXPORT
   * ═══════════════════════════════════════════════════════════════════════*/


// ─── Public Exports ─────────────────────────────────────────────────────────

export { TECHNIQUES, getHint, detectAll, buildCandidates };
