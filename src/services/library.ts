/**
 * library.ts — Puzzle library (save, browse, filter, sort).
 */

export interface LibraryEntry {
  id: string;
  puzzleString: string;
  source: string;
  generatedDifficulty: string;
  actualDifficulty: string;
  score: number;
  hardestTechnique: string;
  savedAt: number;
  lastPlayedAt: number;
  completed: boolean;
  favorite: boolean;
}

export interface LibraryFilterOpts {
  difficulty?: string | null;
  source?: string | null;
  completed?: boolean | null;
  favorite?: boolean | null;
  sort?: string;
}

const STORAGE_KEY = "sudoku-library";

function loadAll(): LibraryEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const data = JSON.parse(raw);
    if (!Array.isArray(data)) return [];
    return data;
  } catch { return []; }
}

function saveAll(entries: LibraryEntry[]): void {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(entries)); } catch {}
}

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

export function save(entry: Partial<LibraryEntry> & { puzzleString: string }): string {
  const entries = loadAll();
  const existing = entries.findIndex(e => e.puzzleString === entry.puzzleString);
  if (existing >= 0) {
    entries[existing].lastPlayedAt = entry.lastPlayedAt || Date.now();
    if (entry.actualDifficulty) entries[existing].actualDifficulty = entry.actualDifficulty;
    if (entry.score) entries[existing].score = entry.score;
    if (entry.hardestTechnique) entries[existing].hardestTechnique = entry.hardestTechnique;
    saveAll(entries);
    return entries[existing].id;
  }
  const full: LibraryEntry = {
    id: entry.id || generateId(),
    puzzleString: entry.puzzleString,
    source: entry.source || 'generated',
    generatedDifficulty: entry.generatedDifficulty || 'medium',
    actualDifficulty: entry.actualDifficulty || 'Unknown',
    score: entry.score || 0,
    hardestTechnique: entry.hardestTechnique || '',
    savedAt: entry.savedAt || Date.now(),
    lastPlayedAt: entry.lastPlayedAt || Date.now(),
    completed: entry.completed ?? false,
    favorite: entry.favorite ?? false,
  };
  entries.push(full);
  saveAll(entries);
  return full.id;
}

export function remove(id: string): void {
  saveAll(loadAll().filter(e => e.id !== id));
}

export function get(id: string): LibraryEntry | null {
  return loadAll().find(e => e.id === id) || null;
}

export function getAll(): LibraryEntry[] {
  return loadAll();
}

export function toggleFavorite(id: string): boolean {
  const entries = loadAll();
  const entry = entries.find(e => e.id === id);
  if (entry) { entry.favorite = !entry.favorite; saveAll(entries); return entry.favorite; }
  return false;
}

export function markCompleted(id: string): void {
  const entries = loadAll();
  const entry = entries.find(e => e.id === id);
  if (entry) { entry.completed = true; saveAll(entries); }
}

export function markPlayed(id: string): void {
  const entries = loadAll();
  const entry = entries.find(e => e.id === id);
  if (entry) { entry.lastPlayedAt = Date.now(); saveAll(entries); }
}

export function has(puzzleString: string): boolean {
  return loadAll().some(e => e.puzzleString === puzzleString);
}

export function count(): number {
  return loadAll().length;
}

export function clear(): void {
  try { localStorage.removeItem(STORAGE_KEY); } catch {}
}

export function filter(opts: LibraryFilterOpts = {}): LibraryEntry[] {
  let entries = loadAll();
  if (opts.difficulty) entries = entries.filter(e => e.actualDifficulty === opts.difficulty);
  if (opts.source) entries = entries.filter(e => e.source === opts.source);
  if (opts.completed === true || opts.completed === false) entries = entries.filter(e => e.completed === opts.completed);
  if (opts.favorite === true) entries = entries.filter(e => e.favorite === true);

  const diffOrder: Record<string, number> = { Easy: 0, Medium: 1, Hard: 2, Expert: 3, Master: 4 };
  const sortKey = opts.sort || "newest";
  switch (sortKey) {
    case "newest": entries.sort((a, b) => (b.savedAt || 0) - (a.savedAt || 0)); break;
    case "oldest": entries.sort((a, b) => (a.savedAt || 0) - (b.savedAt || 0)); break;
    case "hardest": entries.sort((a, b) => (diffOrder[b.actualDifficulty] || 0) - (diffOrder[a.actualDifficulty] || 0)); break;
    case "easiest": entries.sort((a, b) => (diffOrder[a.actualDifficulty] || 0) - (diffOrder[b.actualDifficulty] || 0)); break;
    case "recent": entries.sort((a, b) => (b.lastPlayedAt || 0) - (a.lastPlayedAt || 0)); break;
  }
  return entries;
}
