/**
 * import-export.ts — Puzzle import/export via 81-char strings and URL sharing.
 */

import { isValid, countSolutions } from '../core/solver';

type Board = number[];

export interface ParseSuccess { board: Board; }
export interface ParseError { error: string; }
export type ParseResult = ParseSuccess | ParseError;

export interface ValidationResult {
  valid: boolean;
  solvable: boolean;
  unique: boolean;
  solutions: number;
  error: string | null;
}

export function parse(input: string): ParseResult {
  if (!input || typeof input !== "string") {
    return { error: "No input provided." };
  }
  let cleaned = input.replace(/[\s\n\r\t]/g, "");
  cleaned = cleaned.replace(/\./g, "0");
  if (!/^[0-9]+$/.test(cleaned)) {
    return { error: "Invalid characters. Use digits 0-9 or '.' for empty cells." };
  }
  if (cleaned.length !== 81) {
    return { error: "Expected 81 digits, got " + cleaned.length + "." };
  }
  const board: Board = [];
  for (let i = 0; i < 81; i++) {
    board.push(parseInt(cleaned[i], 10));
  }
  return { board };
}

export function validate(board: Board): ValidationResult {
  if (!isValid(board)) {
    return { valid: false, solvable: false, unique: false, solutions: 0, error: "Board has conflicting digits in a row, column, or box." };
  }
  let emptyCount = 0;
  for (let i = 0; i < 81; i++) { if (board[i] === 0) emptyCount++; }
  if (emptyCount === 0) {
    return { valid: true, solvable: true, unique: true, solutions: 1, error: null };
  }
  const solutions = countSolutions(board, 2);
  if (solutions === 0) {
    return { valid: true, solvable: false, unique: false, solutions: 0, error: "This puzzle has no valid solution." };
  }
  if (solutions > 1) {
    return { valid: true, solvable: true, unique: false, solutions, error: "This puzzle has multiple solutions. Hints may not work correctly." };
  }
  return { valid: true, solvable: true, unique: true, solutions: 1, error: null };
}

export function exportGivens(givens: Board): string {
  return givens.map(v => String(v)).join("");
}

export function exportBoard(board: Board): string {
  return board.map(v => String(v)).join("");
}

export function generateURL(board: Board): string {
  const puzzleStr = board.map(v => String(v)).join("");
  return window.location.origin + window.location.pathname + "#puzzle=" + puzzleStr;
}

export function getHashPuzzle(): Board | null {
  const hash = window.location.hash;
  if (!hash || hash.indexOf("#puzzle=") !== 0) return null;
  const puzzleStr = hash.substring(8);
  const result = parse(puzzleStr);
  if ('error' in result) return null;
  return result.board;
}

export function clearHash(): void {
  if (window.history && window.history.replaceState) {
    window.history.replaceState(null, "", window.location.pathname + window.location.search);
  } else {
    window.location.hash = "";
  }
}

export function copyToClipboard(text: string, onSuccess?: () => void, onFallback?: (text: string) => void): void {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(
      () => { if (onSuccess) onSuccess(); },
      () => { if (onFallback) onFallback(text); }
    );
  } else {
    if (onFallback) onFallback(text);
  }
}
