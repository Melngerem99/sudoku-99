/**
 * daily.ts — Daily Challenge system with seeded PRNG.
 */

import { PEERS, countSolutions } from '../core/solver';

type Board = number[];

const HISTORY_KEY = "sudoku-daily-history";
const PROGRESS_PREFIX = "sudoku-daily-prog-";
const EPOCH_YEAR = 2025;
const EPOCH_MONTH = 0;
const EPOCH_DAY = 1;

// ─── Seeded PRNG (mulberry32) ───────────────────────────────────────────────

function mulberry32(seed: number): () => number {
  return function () {
    seed |= 0;
    seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

// ─── Date helpers ───────────────────────────────────────────────────────────

export function getDateKey(): string {
  const now = new Date();
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, "0");
  const d = String(now.getUTCDate()).padStart(2, "0");
  return y + "-" + m + "-" + d;
}

function dateKeyToSeed(dateKey: string): number {
  return parseInt(dateKey.replace(/-/g, ""), 10);
}

export function getDayNumber(dateKey: string): number {
  const parts = dateKey.split("-");
  const target = new Date(Date.UTC(+parts[0], +parts[1] - 1, +parts[2]));
  const epoch = new Date(Date.UTC(EPOCH_YEAR, EPOCH_MONTH, EPOCH_DAY));
  return Math.floor((target.getTime() - epoch.getTime()) / 86400000) + 1;
}

function getDayOfWeek(dateKey: string): number {
  const parts = dateKey.split("-");
  const d = new Date(Date.UTC(+parts[0], +parts[1] - 1, +parts[2]));
  return d.getUTCDay();
}

const DAY_DIFFICULTIES = ["easy", "medium", "hard", "expert", "hard", "medium", "easy"];

export function getDifficultyForDate(dateKey: string): string {
  const dow = getDayOfWeek(dateKey);
  const idx = dow === 0 ? 6 : dow - 1;
  return DAY_DIFFICULTIES[idx];
}

// ─── Seeded puzzle generation ───────────────────────────────────────────────

function generateSeeded(seed: number, difficulty: string): { puzzle: Board; solution: Board } {
  const rng = mulberry32(seed);

  function shuffle<T>(arr: T[]): T[] {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = (rng() * (i + 1)) | 0;
      const tmp = arr[i]; arr[i] = arr[j]; arr[j] = tmp;
    }
    return arr;
  }

  function canPlace(board: Board, idx: number, digit: number): boolean {
    const peers = PEERS[idx];
    for (let p = 0; p < peers.length; p++) {
      if (board[peers[p]] === digit) return false;
    }
    return true;
  }

  function fillRandom(board: Board): boolean {
    for (let i = 0; i < 81; i++) {
      if (board[i] !== 0) continue;
      const digits = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9]);
      for (const d of digits) {
        if (canPlace(board, i, d)) {
          board[i] = d;
          if (fillRandom(board)) return true;
          board[i] = 0;
        }
      }
      return false;
    }
    return true;
  }

  const CLUE_COUNTS: Record<string, number> = { easy: 36, medium: 30, hard: 26, expert: 22 };
  const targetClues = CLUE_COUNTS[difficulty] || 30;

  const solution = new Array(81).fill(0);
  fillRandom(solution);

  const puzzle = solution.slice();
  const positions: number[] = [];
  for (let i = 0; i < 81; i++) positions.push(i);
  shuffle(positions);

  let clues = 81;
  for (const pos of positions) {
    if (clues <= targetClues) break;
    const backup = puzzle[pos];
    puzzle[pos] = 0;
    if (countSolutions(puzzle, 2) !== 1) { puzzle[pos] = backup; }
    else { clues--; }
  }

  return { puzzle, solution };
}

// ─── Public API ─────────────────────────────────────────────────────────────

export function getTodayPuzzle(): { puzzle: Board; solution: Board; difficulty: string; dateKey: string; dayNumber: number } {
  const dateKey = getDateKey();
  const seed = dateKeyToSeed(dateKey);
  const difficulty = getDifficultyForDate(dateKey);
  const result = generateSeeded(seed, difficulty);
  return { puzzle: result.puzzle, solution: result.solution, difficulty, dateKey, dayNumber: getDayNumber(dateKey) };
}

function progressKey(): string { return PROGRESS_PREFIX + getDateKey(); }

export function saveProgress(state: any): void {
  try {
    const data = {
      board: state.board,
      candidates: state.candidates.map((s: Set<number>) => Array.from(s)),
      mistakes: state.mistakes,
      timerSeconds: state.timerSeconds,
      hintsUsed: state.hintsUsed,
      pencilMode: state.pencilMode,
      history: (state.history || []).slice(-20).map((snap: any) => ({ board: snap.board, candidates: snap.candidates.map((s: Set<number>) => Array.from(s)) })),
      future: (state.future || []).slice(-20).map((snap: any) => ({ board: snap.board, candidates: snap.candidates.map((s: Set<number>) => Array.from(s)) })),
    };
    localStorage.setItem(progressKey(), JSON.stringify(data));
  } catch {}
}

export function loadProgress(): any | null {
  try {
    const raw = localStorage.getItem(progressKey());
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!data || !Array.isArray(data.board) || data.board.length !== 81) return null;
    data.candidates = data.candidates.map((arr: number[]) => new Set(arr));
    data.history = Array.isArray(data.history) ? data.history.map((snap: any) => ({ board: snap.board, candidates: snap.candidates.map((arr: number[]) => new Set(arr)) })) : [];
    data.future = Array.isArray(data.future) ? data.future.map((snap: any) => ({ board: snap.board, candidates: snap.candidates.map((arr: number[]) => new Set(arr)) })) : [];
    return data;
  } catch { return null; }
}

export function clearProgress(): void {
  try { localStorage.removeItem(progressKey()); } catch {}
}

function loadHistory(): { completions: Record<string, any> } {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return { completions: {} };
    const data = JSON.parse(raw);
    if (!data || typeof data.completions !== "object") return { completions: {} };
    return data;
  } catch { return { completions: {} }; }
}

function saveHistory(history: any): void {
  try { localStorage.setItem(HISTORY_KEY, JSON.stringify(history)); } catch {}
}

export function recordCompletion(dateKey: string, timeSeconds: number, mistakes: number, hintsUsed: number): void {
  if (typeof dateKey !== "string") {
    hintsUsed = mistakes;
    mistakes = timeSeconds;
    timeSeconds = dateKey as any;
    dateKey = getDateKey();
  }
  const history = loadHistory();
  history.completions[dateKey] = { time: timeSeconds, mistakes, hintsUsed, difficulty: getDifficultyForDate(dateKey) };
  saveHistory(history);
  clearProgress();
}

export function getHistory(): { completions: Record<string, any>; currentStreak: number; longestStreak: number } {
  const history = loadHistory();
  const completions = history.completions || {};

  let currentStreak = 0;
  let longestStreak = 0;
  let streak = 0;

  const now = new Date();
  const checkDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const todayKey = getDateKey();
  if (!completions[todayKey]) { checkDate.setUTCDate(checkDate.getUTCDate() - 1); }

  for (let i = 0; i < 365; i++) {
    const y = checkDate.getUTCFullYear();
    const m = String(checkDate.getUTCMonth() + 1).padStart(2, "0");
    const d = String(checkDate.getUTCDate()).padStart(2, "0");
    const key = y + "-" + m + "-" + d;
    if (completions[key]) { streak++; } else { break; }
    checkDate.setUTCDate(checkDate.getUTCDate() - 1);
  }
  currentStreak = streak;

  const allDates = Object.keys(completions).sort();
  let tempStreak = 0;
  for (let j = 0; j < allDates.length; j++) {
    if (j === 0) { tempStreak = 1; }
    else {
      const prev = new Date(allDates[j - 1] + "T00:00:00Z");
      const curr = new Date(allDates[j] + "T00:00:00Z");
      const diff = (curr.getTime() - prev.getTime()) / 86400000;
      tempStreak = diff === 1 ? tempStreak + 1 : 1;
    }
    if (tempStreak > longestStreak) longestStreak = tempStreak;
  }

  return { completions, currentStreak, longestStreak };
}

export function getTodayStatus(): string {
  const dateKey = getDateKey();
  const history = loadHistory();
  if (history.completions && history.completions[dateKey]) return "completed";
  const progress = loadProgress();
  if (progress) return "in_progress";
  return "not_started";
}

export function getShareText(dateKey: string, timeSeconds: number, mistakes: number, hintsUsed: number): string {
  if (typeof dateKey !== "string") {
    hintsUsed = mistakes;
    mistakes = timeSeconds;
    timeSeconds = dateKey as any;
    dateKey = getDateKey();
  }
  const dayNum = getDayNumber(dateKey);
  const difficulty = getDifficultyForDate(dateKey);
  const m = Math.floor(timeSeconds / 60);
  const s = timeSeconds % 60;
  const timeStr = (m < 10 ? "0" : "") + m + ":" + (s < 10 ? "0" : "") + s;
  const diffEmoji: Record<string, string> = { easy: "🟢", medium: "🟡", hard: "🟠", expert: "🔴" };
  const mistakeStars = mistakes === 0 ? " ⭐" : "";
  return "Sudoku Daily #" + dayNum + " " + (diffEmoji[difficulty] || "🟡") +
    "\n⏱ " + timeStr + " | ❌ " + mistakes + " | 💡 " + hintsUsed + mistakeStars;
}
