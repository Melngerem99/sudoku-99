/**
 * statistics.ts — Player performance tracking.
 */

const STORAGE_KEY = "sudoku-statistics";
const SCHEMA_VERSION = 1;

interface DifficultyStats {
  started: number;
  won: number;
  lost: number;
  bestTime: number | null;
  totalWinTime: number;
}

interface StatsData {
  v: number;
  perDifficulty: Record<string, DifficultyStats>;
  currentStreak: number;
  longestStreak: number;
  totalPlayTime: number;
  totalHintsUsed: number;
  totalGamesWithHints: number;
}

function defaultStats(): StatsData {
  return {
    v: SCHEMA_VERSION,
    perDifficulty: {
      easy:   { started: 0, won: 0, lost: 0, bestTime: null, totalWinTime: 0 },
      medium: { started: 0, won: 0, lost: 0, bestTime: null, totalWinTime: 0 },
      hard:   { started: 0, won: 0, lost: 0, bestTime: null, totalWinTime: 0 },
      expert: { started: 0, won: 0, lost: 0, bestTime: null, totalWinTime: 0 },
    },
    currentStreak: 0,
    longestStreak: 0,
    totalPlayTime: 0,
    totalHintsUsed: 0,
    totalGamesWithHints: 0,
  };
}

function validateStats(data: any): data is StatsData {
  try {
    if (!data || typeof data !== "object" || data.v !== SCHEMA_VERSION) return false;
    if (!data.perDifficulty || typeof data.perDifficulty !== "object") return false;
    for (const d of ["easy", "medium", "hard", "expert"]) {
      const pd = data.perDifficulty[d];
      if (!pd || typeof pd.started !== "number" || typeof pd.won !== "number") return false;
    }
    return typeof data.currentStreak === "number" && typeof data.longestStreak === "number";
  } catch { return false; }
}

function loadStats(): StatsData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultStats();
    const data = JSON.parse(raw);
    if (!validateStats(data)) { try { localStorage.removeItem(STORAGE_KEY); } catch {} return defaultStats(); }
    return data;
  } catch { try { localStorage.removeItem(STORAGE_KEY); } catch {} return defaultStats(); }
}

function saveStats(stats: StatsData): void {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(stats)); } catch {}
}

let stats = loadStats();

export function recordGameStart(difficulty: string): void {
  const d = stats.perDifficulty[difficulty];
  if (d) { d.started++; saveStats(stats); }
}

export function recordWin(difficulty: string, timeSeconds: number, hintsUsed: number): void {
  const d = stats.perDifficulty[difficulty];
  if (!d) return;
  d.won++;
  d.totalWinTime += timeSeconds;
  if (d.bestTime === null || timeSeconds < d.bestTime) d.bestTime = timeSeconds;
  stats.currentStreak++;
  if (stats.currentStreak > stats.longestStreak) stats.longestStreak = stats.currentStreak;
  stats.totalPlayTime += timeSeconds;
  stats.totalHintsUsed += hintsUsed;
  if (hintsUsed > 0) stats.totalGamesWithHints++;
  saveStats(stats);
}

export function recordLoss(difficulty: string, timeSeconds: number, hintsUsed: number): void {
  const d = stats.perDifficulty[difficulty];
  if (!d) return;
  d.lost++;
  stats.currentStreak = 0;
  stats.totalPlayTime += timeSeconds;
  stats.totalHintsUsed += hintsUsed;
  if (hintsUsed > 0) stats.totalGamesWithHints++;
  saveStats(stats);
}

export function getStats(): StatsData { return stats; }

export function reset(): void { stats = defaultStats(); saveStats(stats); }

export function formatTime(seconds: number | null): string {
  if (seconds === null || seconds === undefined) return "—";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return (m < 10 ? "0" : "") + m + ":" + (s < 10 ? "0" : "") + s;
}

export function winRate(won: number, lost: number): string {
  const total = won + lost;
  if (total === 0) return "—";
  return Math.round((won / total) * 100) + "%";
}

export function avgTime(totalWinTime: number, won: number): string {
  if (won === 0) return "—";
  return formatTime(Math.round(totalWinTime / won));
}
