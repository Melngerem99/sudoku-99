/**
 * persistence.ts — Auto-save/restore game state via localStorage.
 */

const STORAGE_KEY = "sudoku-game-state";
const SCHEMA_VERSION = 1;
const DEBOUNCE_MS = 500;

let debounceTimer: ReturnType<typeof setTimeout> | null = null;

function serialize(state: any): any {
  return {
    v: SCHEMA_VERSION,
    ts: Date.now(),
    board: state.board,
    solution: state.solution,
    givens: state.givens,
    candidates: state.candidates.map((s: Set<number>) => Array.from(s)),
    pencilMode: state.pencilMode,
    mistakes: state.mistakes,
    timerSeconds: state.timerSeconds,
    hintsUsedThisGame: state.hintsUsedThisGame || 0,
    gameOver: state.gameOver,
    gameWon: state.gameWon,
    emptyMode: state.emptyMode,
    currentDifficulty: state.currentDifficulty,
    history: state.history.slice(-20).map((snap: any) => ({
      board: snap.board,
      candidates: snap.candidates.map((s: Set<number>) => Array.from(s)),
    })),
    future: state.future.slice(-20).map((snap: any) => ({
      board: snap.board,
      candidates: snap.candidates.map((s: Set<number>) => Array.from(s)),
    })),
  };
}

function deserialize(data: any): any {
  return {
    board: data.board,
    solution: data.solution,
    givens: data.givens,
    candidates: data.candidates.map((arr: number[]) => new Set(arr)),
    selectedIdx: null,
    activeDigit: null,
    pencilMode: data.pencilMode,
    mistakes: data.mistakes,
    timerSeconds: data.timerSeconds,
    hintsUsedThisGame: data.hintsUsedThisGame || 0,
    gameOver: data.gameOver,
    gameWon: data.gameWon,
    emptyMode: data.emptyMode,
    currentDifficulty: data.currentDifficulty,
    history: (data.history || []).map((snap: any) => ({
      board: snap.board,
      candidates: snap.candidates.map((arr: number[]) => new Set(arr)),
    })),
    future: (data.future || []).map((snap: any) => ({
      board: snap.board,
      candidates: snap.candidates.map((arr: number[]) => new Set(arr)),
    })),
  };
}

function validate(data: any): boolean {
  try {
    if (data.v !== SCHEMA_VERSION) return false;
    if (!Array.isArray(data.board) || data.board.length !== 81) return false;
    if (!Array.isArray(data.solution) || data.solution.length !== 81) return false;
    if (!Array.isArray(data.givens) || data.givens.length !== 81) return false;
    if (!Array.isArray(data.candidates) || data.candidates.length !== 81) return false;
    for (let i = 0; i < 81; i++) {
      if (data.board[i] < 0 || data.board[i] > 9) return false;
      if (data.solution[i] < 0 || data.solution[i] > 9) return false;
      if (data.givens[i] < 0 || data.givens[i] > 9) return false;
    }
    for (let j = 0; j < 81; j++) {
      if (!Array.isArray(data.candidates[j])) return false;
      for (const d of data.candidates[j]) { if (d < 1 || d > 9) return false; }
    }
    if (typeof data.mistakes !== "number" || data.mistakes < 0) return false;
    if (typeof data.timerSeconds !== "number" || data.timerSeconds < 0) return false;
    if (typeof data.gameOver !== "boolean") return false;
    if (typeof data.gameWon !== "boolean") return false;
    if (typeof data.pencilMode !== "boolean") return false;
    if (typeof data.emptyMode !== "boolean") return false;
    if (["easy", "medium", "hard", "expert"].indexOf(data.currentDifficulty) === -1) return false;
    return true;
  } catch { return false; }
}

export function scheduleSave(getStateFn: () => any): void {
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => { saveImmediate(getStateFn()); }, DEBOUNCE_MS);
}

export function saveImmediate(state: any): void {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(serialize(state))); } catch {}
}

export function load(): any | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (!validate(data)) { localStorage.removeItem(STORAGE_KEY); return null; }
    return deserialize(data);
  } catch { try { localStorage.removeItem(STORAGE_KEY); } catch {} return null; }
}

export function clear(): void {
  if (debounceTimer) clearTimeout(debounceTimer);
  try { localStorage.removeItem(STORAGE_KEY); } catch {}
}
