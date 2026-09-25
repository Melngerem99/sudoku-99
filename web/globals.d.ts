/**
 * globals.d.ts — TypeScript declarations for global modules in Sudoku-99.
 * Provides ambient types for IIFE-exported modules attached to `window`.
 * Eliminates TS2304 ("Cannot find name") and TS2339 ("Property does not exist on Window").
 */

// ─── Board / Candidate types (mirror types.js) ─────────────────────────────

type Board = number[];
type CandidateGrid = Set<number>[];
type GeneratedDifficulty = 'easy' | 'medium' | 'hard' | 'expert' | 'imported';
type DifficultyLabel = 'Easy' | 'Medium' | 'Hard' | 'Expert' | 'Master' | 'Unknown';
type PuzzleSource = 'generated' | 'daily' | 'imported' | 'empty';

// ─── Hint System ────────────────────────────────────────────────────────────

interface Elimination {
  idx: number;
  digit: number;
}

interface Placement {
  idx: number;
  digit: number;
}

interface Highlights {
  cause: number[];
  affected: number[];
  result: number[];
}

interface HintResult {
  technique: string;
  description: string;
  highlights: Highlights;
  eliminations: Elimination[];
  placement: Placement | null;
}

interface TechniqueEntry {
  name: string;
  detect: (board: Board, cands: CandidateGrid) => HintResult | null;
}

// ─── Step Solver ────────────────────────────────────────────────────────────

interface SolutionStep {
  stepNumber: number;
  technique: string;
  description: string;
  highlights: Highlights;
  eliminations: Elimination[];
  placement: Placement | null;
  boardAfter: Board;
  candidatesAfter: CandidateGrid;
}

interface PathResult {
  steps: SolutionStep[];
  complete: boolean;
  stuckAt: number | null;
  hardestTechnique: string;
  techniqueCounts: Record<string, number>;
  durationMs: number;
}

// ─── Difficulty ─────────────────────────────────────────────────────────────

interface DifficultyResult {
  label: DifficultyLabel;
  score: number;
  hardestTier: number;
  hardestTechnique: string;
  stepCount: number;
  techniqueCounts: Record<string, number>;
  stuck: boolean;
}

// ─── Generator ──────────────────────────────────────────────────────────────

interface GenerationResult {
  puzzle: Board;
  solution: Board;
  actualDifficulty: DifficultyLabel;
  difficultyResult: DifficultyResult | null;
  attempts: number;
  timeMs: number;
  clueCount: number;
  exact: boolean;
}

// ─── Persistence ────────────────────────────────────────────────────────────

interface Snapshot {
  board: Board;
  candidates: CandidateGrid;
}

// ─── Statistics ─────────────────────────────────────────────────────────────

interface DifficultyStats {
  started: number;
  won: number;
  lost: number;
  bestTime: number | null;
  totalWinTime: number;
}

interface StatisticsData {
  v: number;
  perDifficulty: Record<string, DifficultyStats>;
  currentStreak: number;
  longestStreak: number;
  totalPlayTime: number;
  totalHintsUsed: number;
  totalGamesWithHints: number;
}

// ─── Library ────────────────────────────────────────────────────────────────

interface LibraryEntry {
  id: string;
  puzzleString: string;
  source: PuzzleSource;
  generatedDifficulty: string;
  actualDifficulty: DifficultyLabel;
  score: number;
  hardestTechnique: string;
  savedAt: number;
  lastPlayedAt: number;
  completed: boolean;
  favorite: boolean;
}

interface LibraryFilter {
  difficulty?: DifficultyLabel | null;
  source?: PuzzleSource | null;
  completed?: boolean | null;
  favorite?: boolean | null;
  sort?: 'newest' | 'oldest' | 'hardest' | 'easiest' | 'recent';
}

// ─── Daily ──────────────────────────────────────────────────────────────────

interface DailyPuzzle {
  puzzle: Board;
  solution: Board;
  difficulty: string;
  dateKey: string;
  dayNumber: number;
}

interface DailyCompletion {
  time: number;
  mistakes: number;
  hintsUsed: number;
  difficulty: string;
}

interface DailyHistory {
  completions: Record<string, DailyCompletion>;
  currentStreak: number;
  longestStreak: number;
}

// ─── Module APIs ────────────────────────────────────────────────────────────

interface SolverAPI {
  isValid(board: Board): boolean;
  solve(board: Board): Board | null;
  countSolutions(board: Board, max?: number): number;
  generate(difficulty?: string): { puzzle: Board; solution: Board };
  PEERS: ReadonlyArray<ReadonlyArray<number>>;
}

interface TechniquesAPI {
  TECHNIQUES: TechniqueEntry[];
  getHint(board: Board, candidates?: CandidateGrid): HintResult | null;
  detectAll(board: Board, candidates?: CandidateGrid): HintResult[];
  buildCandidates(board: Board): CandidateGrid;
}

interface StepSolverAPI {
  computePath(board: Board): PathResult;
  assessDifficulty(hardestTechniqueIdx: number): string;
}

interface DifficultyAPI {
  analyze(pathResult: PathResult | any): DifficultyResult;
  LABELS: string[];
}

interface GeneratorAPI {
  generate(targetDifficulty: string, callback: (result: GenerationResult) => void, onProgress?: (progress: { attempt: number; maxAttempts: number }) => void): () => void;
  generateSync(targetDifficulty?: string): GenerationResult;
}

interface ImportExportAPI {
  parse(input: string): { board: Board } | { error: string };
  validate(board: Board): {
    valid: boolean;
    solvable: boolean;
    unique: boolean;
    solutions: number;
    error: string | null;
  };
  exportGivens(givens: Board): string;
  exportBoard(board: Board): string;
  generateURL(board: Board): string;
  getHashPuzzle(): Board | null;
  clearHash(): void;
  copyToClipboard(text: string, onSuccess?: () => void, onFallback?: (text: string) => void): void;
}

interface PersistenceAPI {
  scheduleSave(data: any): void;
  saveImmediate(data: any): void;
  load(): any;
  clear(): void;
}

interface StatisticsAPI {
  recordGameStart(difficulty: string): void;
  recordWin(difficulty: string, timeSeconds: number, hintsUsed?: number): void;
  recordLoss(difficulty: string, timeSeconds?: number, hintsUsed?: number): void;
  getStats(): any;
  reset(): void;
  formatTime(seconds: number): string;
  winRate(won?: number, total?: number): number | string;
  avgTime(totalWinTime?: number, won?: number): number | string;
}

interface DailyAPI {
  getTodayPuzzle(): DailyPuzzle;
  saveProgress(state: any): void;
  loadProgress(): any;
  clearProgress(): void;
  recordCompletion(dateKey: string, timeSeconds: number, mistakes: number, hintsUsed: number): void;
  getHistory(): DailyHistory;
  getShareText(dateKey: string, timeSeconds: number, mistakes: number, hintsUsed: number): string;
  getTodayStatus(): string;
  getDateKey(): string;
  getDayNumber(dateKey: string): number;
  getDifficultyForDate(dateKey: string): string;
}

interface LibraryAPI {
  save(entry: Partial<LibraryEntry> & { puzzleString: string }): void;
  getAll(filter?: LibraryFilter): LibraryEntry[];
  get(id: string): LibraryEntry | null;
  filter(filter?: LibraryFilter): LibraryEntry[];
  remove(id: string): void;
  toggleFavorite(id: string): void;
  markCompleted(id: string): void;
  markPlayed(id: string): void;
  has(puzzleString: string): boolean;
  count(): number;
  clear(): void;
}

interface UIAPI {
  init(): void;
  renderBoard(board: Board, givens: Board, candidates: CandidateGrid, selectedIdx: number | null, activeDigit: number | null, conflicts: Set<number> | null): void;
  updateCell(idx: number, board: Board, givens: Board, candidates: CandidateGrid, selectedIdx: number | null, activeDigit: number | null, conflicts: Set<number> | null): void;
  setTimer(seconds: number): void;
  setMistakes(count: number, max: number): void;
  setDigitCounts(board: Board): void;
  showHint(hintResult: HintResult): void;
  hideHint(): void;
  clearHintHighlights(): void;
  showModal(opts?: { title?: string; body?: string; buttons?: Array<{ label: string; primary?: boolean; onClick?: () => void }> }): void;
  hideModal(): void;
  setActiveDigitButton(digit: number): void;
  flashCell(idx: number, cls: string, durationMs?: number): void;
  toggleDarkMode(): void;
  isDarkMode(): boolean;
  on(event: string, handler: Function): void;
  cells: any[];
  [key: string]: any;
}

// ─── Window augmentation ────────────────────────────────────────────────────

declare var Solver: SolverAPI;
declare var Techniques: TechniquesAPI;
declare var StepSolver: StepSolverAPI;
declare var Difficulty: DifficultyAPI;
declare var Generator: GeneratorAPI;
declare var ImportExport: ImportExportAPI;
declare var Persistence: PersistenceAPI;
declare var Statistics: StatisticsAPI;
declare var Daily: DailyAPI;
declare var Library: LibraryAPI;
declare var UI: UIAPI;

interface Window {
  Solver: SolverAPI;
  Techniques: TechniquesAPI;
  StepSolver: StepSolverAPI;
  Difficulty: DifficultyAPI;
  Generator: GeneratorAPI;
  ImportExport: ImportExportAPI;
  Persistence: PersistenceAPI;
  Statistics: StatisticsAPI;
  Daily: DailyAPI;
  Library: LibraryAPI;
  UI: UIAPI;
}


// ─── Service Worker types (for sw.js) ───────────────────────────────────────

interface ExtendableEvent extends Event {
  waitUntil(promise: Promise<any>): void;
}

interface FetchEvent extends ExtendableEvent {
  readonly request: Request;
  respondWith(response: Promise<Response | undefined> | Response): void;
}

interface ServiceWorkerGlobalScope {
  skipWaiting(): Promise<void>;
  clients: { claim(): Promise<void> };
  addEventListener(type: 'install', listener: (event: ExtendableEvent) => void): void;
  addEventListener(type: 'activate', listener: (event: ExtendableEvent) => void): void;
  addEventListener(type: 'fetch', listener: (event: FetchEvent) => void): void;
  addEventListener(type: string, listener: (event: Event) => void): void;
}


// ─── DOM Helpers (dom-helpers.js) ───────────────────────────────────────────

interface DOMHelpersAPI {
  $el(id: string): HTMLElement | null;
  $btn(id: string): HTMLButtonElement | null;
  $input(id: string): HTMLInputElement | null;
  $select(id: string): HTMLSelectElement | null;
  setText(id: string, value: string | number): void;
  show(el: HTMLElement | null): void;
  hide(el: HTMLElement | null): void;
  enable(btn: HTMLButtonElement | null): void;
  disable(btn: HTMLButtonElement | null): void;
}

declare var DOM: DOMHelpersAPI;

interface Window {
  DOM: DOMHelpersAPI;
}


// ─── Statistics Controller (statistics-controller.js) ───────────────────────

interface StatisticsControllerAPI {
  init(): void;
  open(): void;
  close(): void;
  refresh(): void;
}

declare var StatisticsController: StatisticsControllerAPI;


// ─── Analysis Controller (analysis-controller.js) ───────────────────────────

interface AnalysisControllerAPI {
  init(opts: { getGivens: () => Board; getCurrentDifficulty: () => string; getPuzzleSource: () => string }): void;
  open(): void;
  close(): void;
  invalidate(): void;
}

declare var AnalysisController: AnalysisControllerAPI;


// ─── Import Controller (import-controller.js) ───────────────────────────────

interface ImportControllerAPI {
  init(config: { importPuzzle: (board: Board) => void; getGivens: () => Board }): void;
  open(): void;
  close(): void;
}

declare var ImportController: ImportControllerAPI;


// ─── Library Controller (library-controller.js) ─────────────────────────────

interface LibraryControllerAPI {
  init(config: { getGivens: () => Board; getPuzzleSource: () => string; getCurrentDifficulty: () => string; isGameCompleted: () => boolean; loadPuzzle: (board: Board) => void }): void;
  open(): void;
  close(): void;
  refresh(): void;
}

declare var LibraryController: LibraryControllerAPI;


// ─── Daily Controller (daily-controller.js) ─────────────────────────────────

interface DailyControllerAPI {
  init(config: { startDaily: () => void }): void;
  open(): void;
  close(): void;
  refresh(): void;
  updateBadge(): void;
}

declare var DailyController: DailyControllerAPI;


// ─── Step Solver Controller (step-solver-controller.js) ─────────────────────

interface StepSolverControllerAPI {
  init(config: { getBoard: () => Board; getCandidates: () => CandidateGrid; getGivens: () => Board; restoreState: (board: Board, candidates: CandidateGrid) => void; render: () => void; computeConflicts: () => Set<number> }): void;
  open(): void;
  close(): void;
  isActive(): boolean;
}

declare var StepSolverController: StepSolverControllerAPI;
