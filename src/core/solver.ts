/**
 * solver.ts — Sudoku solver, validator, and generator.
 */

export type Board = number[];

// ─── Helpers ────────────────────────────────────────────────────────────────

function peers(idx: number): number[] {
  const row = Math.floor(idx / 9);
  const col = idx % 9;
  const boxRow = Math.floor(row / 3) * 3;
  const boxCol = Math.floor(col / 3) * 3;
  const set = new Set<number>();
  for (let i = 0; i < 9; i++) {
    set.add(row * 9 + i);
    set.add(i * 9 + col);
  }
  for (let r = boxRow; r < boxRow + 3; r++)
    for (let c = boxCol; c < boxCol + 3; c++)
      set.add(r * 9 + c);
  set.delete(idx);
  return [...set];
}

export const PEERS: ReadonlyArray<ReadonlyArray<number>> = Array.from({ length: 81 }, (_, i) => peers(i));

function canPlace(board: Board, idx: number, digit: number): boolean {
  for (const p of PEERS[idx]) {
    if (board[p] === digit) return false;
  }
  return true;
}

// ─── Validation ─────────────────────────────────────────────────────────────

export function isValid(board: Board): boolean {
  for (let idx = 0; idx < 81; idx++) {
    const d = board[idx];
    if (d === 0) continue;
    for (const p of PEERS[idx]) {
      if (board[p] === d) return false;
    }
  }
  return true;
}

// ─── Solver ─────────────────────────────────────────────────────────────────

function _solve(board: Board): boolean {
  let bestIdx = -1;
  let bestCount = 10;
  for (let i = 0; i < 81; i++) {
    if (board[i] !== 0) continue;
    let count = 0;
    for (let d = 1; d <= 9; d++) {
      if (canPlace(board, i, d)) count++;
    }
    if (count === 0) return false;
    if (count < bestCount) {
      bestCount = count;
      bestIdx = i;
      if (count === 1) break;
    }
  }
  if (bestIdx === -1) return true;
  for (let d = 1; d <= 9; d++) {
    if (canPlace(board, bestIdx, d)) {
      board[bestIdx] = d;
      if (_solve(board)) return true;
      board[bestIdx] = 0;
    }
  }
  return false;
}

export function solve(board: Board): Board | null {
  const copy = board.slice();
  return _solve(copy) ? copy : null;
}

// ─── Solution Counter ───────────────────────────────────────────────────────

export function countSolutions(board: Board, max = 2): number {
  let count = 0;
  function _count(b: Board) {
    if (count >= max) return;
    let bestIdx = -1;
    let bestCount = 10;
    for (let i = 0; i < 81; i++) {
      if (b[i] !== 0) continue;
      let c = 0;
      for (let d = 1; d <= 9; d++) if (canPlace(b, i, d)) c++;
      if (c === 0) return;
      if (c < bestCount) { bestCount = c; bestIdx = i; }
    }
    if (bestIdx === -1) { count++; return; }
    for (let d = 1; d <= 9; d++) {
      if (count >= max) return;
      if (canPlace(b, bestIdx, d)) {
        b[bestIdx] = d;
        _count(b);
        b[bestIdx] = 0;
      }
    }
  }
  _count(board.slice());
  return count;
}

// ─── Generator ──────────────────────────────────────────────────────────────

function shuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = (Math.random() * (i + 1)) | 0;
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function _fillRandom(board: Board): boolean {
  for (let i = 0; i < 81; i++) {
    if (board[i] !== 0) continue;
    const digits = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    for (const d of digits) {
      if (canPlace(board, i, d)) {
        board[i] = d;
        if (_fillRandom(board)) return true;
        board[i] = 0;
      }
    }
    return false;
  }
  return true;
}

const CLUE_COUNTS: Record<string, number> = { easy: 36, medium: 30, hard: 26, expert: 22 };

export function generate(difficulty = "medium"): { puzzle: Board; solution: Board } {
  const targetClues = CLUE_COUNTS[difficulty] ?? CLUE_COUNTS.medium;
  const solution = new Array(81).fill(0);
  _fillRandom(solution);
  const puzzle = solution.slice();
  const positions = shuffle(Array.from({ length: 81 }, (_, i) => i));
  let clues = 81;
  for (const pos of positions) {
    if (clues <= targetClues) break;
    const backup = puzzle[pos];
    puzzle[pos] = 0;
    if (countSolutions(puzzle, 2) !== 1) {
      puzzle[pos] = backup;
    } else {
      clues--;
    }
  }
  return { puzzle, solution };
}
