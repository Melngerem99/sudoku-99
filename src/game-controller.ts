/**
 * game-controller.ts — Main game controller.
 * Wires together Solver, Techniques, UI, and all sub-controllers.
 */

import { PEERS, isValid, solve } from './core/solver';
import { buildCandidates, getHint } from './core/techniques';
import { computePath } from './core/step-solver';
import { analyze } from './core/difficulty';
import { generate } from './services/generator';
import { getHashPuzzle, validate, clearHash } from './services/import-export';
import { scheduleSave as persistScheduleSave, saveImmediate, load as loadPersistence, clear as clearPersistence } from './services/persistence';
import { recordGameStart, recordWin, recordLoss } from './services/statistics';
import { getTodayStatus, getTodayPuzzle, loadProgress, saveProgress, clearProgress, recordCompletion, getShareText } from './services/daily';
import { $btn } from './ui/dom-helpers';
import { announce } from './ui/accessibility';
import { init as initUI, renderBoard, setDigitCounts, setMistakes, setTimer, setActiveDigitButton, showHint as showHintUI, hideHint, showModal, flashCell, on, _closeSettingsDrawer, clearHintHighlights } from './ui/ui';
import { init as initStatisticsCtrl } from './controllers/statistics-controller';
import { init as initAnalysisCtrl, invalidate as invalidateAnalysis } from './controllers/analysis-controller';
import { init as initImportCtrl } from './controllers/import-controller';
import { init as initLibraryCtrl } from './controllers/library-controller';
import { init as initDailyCtrl, updateBadge as updateDailyBadge } from './controllers/daily-controller';
import { init as initStepSolverCtrl } from './controllers/step-solver-controller';

type Board = number[];
type CandidateGrid = Set<number>[];



const MAX_MISTAKES = 3;
const DIFFICULTIES = ["easy", "medium", "hard", "expert"];
let currentDifficulty = "medium";

// ─── state ────────────────────────────────────────────────────────────────

interface Snapshot { board: Board; candidates: CandidateGrid; }

let board: Board       = new Array(81).fill(0);
let solution: Board    = new Array(81).fill(0);
let givens: Board      = new Array(81).fill(0);
let candidates: CandidateGrid = Array.from({ length: 81 }, () => new Set<number>());
let selectedIdx: number | null = null;
let activeDigit: number | null = null;
let pencilMode  = false;
let mistakes    = 0;
let timerSeconds = 0;
let timerHandle: ReturnType<typeof setInterval> | null = null;
let gameOver     = false;
let gameWon      = false;
let emptyMode    = false;
let hintsUsedThisGame = 0;
let dailyMode    = false;
let activeDailyDateKey: string | null = null;
let puzzleSource = "generated";

// undo / redo stacks store snapshots of mutable state
let history: Snapshot[] = [];
let future: Snapshot[]  = [];

// ─── snapshot helpers ────────────────────────────────────────────────────

function snapshot(): Snapshot {
  return {
    board: board.slice(),
    candidates: candidates.map((s) => new Set(s)),
  };
}

function pushHistory() {
  history.push(snapshot());
  future = [];
  if (history.length > 100) history.shift();
}

function restoreSnapshot(snap: Snapshot) {
  board = snap.board.slice();
  candidates = snap.candidates.map((s: Set<number>) => new Set(s));
}

// ─── analysis cache ────────────────────────────────────────────────────────

// ─── persistence helpers ──────────────────────────────────────────────────

/** Collect all game state into a plain object for saving. */
function getState() {
  return {
    board: board,
    solution: solution,
    givens: givens,
    candidates: candidates,
    pencilMode: pencilMode,
    mistakes: mistakes,
    timerSeconds: timerSeconds,
    gameOver: gameOver,
    gameWon: gameWon,
    emptyMode: emptyMode,
    currentDifficulty: currentDifficulty,
    hintsUsedThisGame: hintsUsedThisGame,
    history: history,
    future: future,
  };
}

/**
 * Schedule a debounced save. Passes getState as a thunk so the debounce
 * always serializes the live state at write time, not a stale snapshot.
 * Routes to daily progress save when in daily mode.
 */
function scheduleSave() {
  if (dailyMode) {
    saveDailyProgress();
  } else {
    persistScheduleSave(getState);
  }
}

// ─── conflict detection ───────────────────────────────────────────────────

/**
 * Returns a Set of cell indices that have a conflicting digit
 * (same digit appears in a peer cell).
 */
function computeConflicts() {
  const conflicts = new Set<number>();
  for (let i = 0; i < 81; i++) {
    if (board[i] === 0) continue;
    for (const p of PEERS[i]) {
      if (board[p] === board[i]) {
        conflicts.add(i);
        conflicts.add(p);
      }
    }
  }
  return conflicts;
}

// ─── candidate auto-fill ──────────────────────────────────────────────────

/**
 * Rebuild all pencil marks from scratch (only legal candidates).
 */
function rebuildCandidates() {
  candidates = buildCandidates(board);
}

/**
 * Remove `digit` from candidates of all peers of `idx`.
 */
function propagateCandidate(idx: number, digit: number) {
  for (const p of PEERS[idx]) {
    candidates[p].delete(digit);
  }
  candidates[idx] = new Set<number>(); // cell is filled
}

// ─── render ───────────────────────────────────────────────────────────────

function render() {
  const conflicts = computeConflicts();
  renderBoard(board, givens, candidates, selectedIdx, activeDigit, conflicts);
  setDigitCounts(board);
  setMistakes(mistakes, MAX_MISTAKES);
  // Update undo/redo button states
  const undoBtn = $btn("btn-undo");
  const redoBtn = $btn("btn-redo");
  if (undoBtn) undoBtn.disabled = history.length === 0;
  if (redoBtn) redoBtn.disabled = future.length === 0;
  // Update pencil mode button
  const pencilBtn = document.getElementById("btn-pencil");
  if (pencilBtn) pencilBtn.classList.toggle("active", pencilMode);
  // Update digit button active state
  setActiveDigitButton(activeDigit);
}

// ─── timer ────────────────────────────────────────────────────────────────

let timerCheckpointHandle: ReturnType<typeof setInterval> | null = null;

function startTimer() {
  stopTimer();
  timerHandle = setInterval(() => {
    if (!gameOver && !gameWon) {
      timerSeconds++;
      setTimer(timerSeconds);
      if (timerSeconds % 60 === 0 && timerSeconds > 0) {
        const m = Math.floor(timerSeconds / 60);
        announce(`Elapsed: ${m} minute${m !== 1 ? 's' : ''}.`, 'polite');
      }
    }
  }, 1000);
  // Checkpoint save every 60s — ensures timer value survives mobile tab kills
  timerCheckpointHandle = setInterval(() => {
    if (!gameOver && !gameWon) {
      if (dailyMode) {
        saveDailyProgress();
      } else {
        saveImmediate(getState());
      }
    }
  }, 60000);
}

function stopTimer() {
  if (timerHandle) clearInterval(timerHandle);
  timerHandle = null;
  if (timerCheckpointHandle) clearInterval(timerCheckpointHandle);
  timerCheckpointHandle = null;
}

function resetTimer() {
  stopTimer();
  timerSeconds = 0;
  setTimer(0);
}

// ─── game setup ───────────────────────────────────────────────────────────

/**
 * Start a new game with the given difficulty.
 */
function newGame(difficulty = currentDifficulty) {
  currentDifficulty = difficulty;
  emptyMode = false;
  dailyMode = false;
  activeDailyDateKey = null;

  // Show generating state
  var badge = document.getElementById("difficulty-badge");
  if (badge) badge.textContent = "Generating...";

  // Use async difficulty-aware generator
  var targetLabel = difficulty.charAt(0).toUpperCase() + difficulty.slice(1);

  generate(targetLabel, function (genResult) {
    board     = genResult.puzzle.slice();
    solution  = genResult.solution.slice();
    givens    = genResult.puzzle.slice();
    candidates = Array.from({ length: 81 }, function () { return new Set<number>(); });
    selectedIdx = null;
    activeDigit = null;
    mistakes    = 0;
    gameOver    = false;
    gameWon     = false;
    hintsUsedThisGame = 0;
    puzzleSource = "generated";
    history     = [];
    future      = [];
    clearPersistence();
    resetTimer();
    startTimer();
    hideHint();
    render();
    updateDifficultyButtons();
    scheduleSave();
    recordGameStart(difficulty);
    computeActualDifficulty();
    invalidateAnalysis();

    // Log generation diagnostics in debug mode
    if (typeof console !== "undefined" && console.debug) {
      console.debug("[Generator]", {
        requested: targetLabel,
        actual: genResult.actualDifficulty,
        exact: genResult.exact,
        attempts: genResult.attempts,
        timeMs: genResult.timeMs,
        clueCount: genResult.clueCount,
        hardest: genResult.difficultyResult ? genResult.difficultyResult.hardestTechnique : "N/A",
        score: genResult.difficultyResult ? genResult.difficultyResult.score : 0
      });
    }
  });
}

/**
 * Load an empty grid (free-play / puzzle entry mode).
 */
function loadEmptyGrid() {
  emptyMode = true;
  puzzleSource = "empty";
  board     = new Array(81).fill(0);
  solution  = new Array(81).fill(0);
  givens    = new Array(81).fill(0);
  candidates = Array.from({ length: 81 }, () => new Set<number>());
  selectedIdx = null;
  activeDigit = null;
  mistakes    = 0;
  gameOver    = false;
  gameWon     = false;
  hintsUsedThisGame = 0;
  history     = [];
  future      = [];
  clearPersistence();
  resetTimer();
  hideHint();
  render();
  scheduleSave();
}

// ─── import puzzle ────────────────────────────────────────────────────────

/**
 * Load an imported puzzle board array into the game.
 * Exits daily mode if active. Solves for the solution if unique.
 */
function importPuzzle(boardArray: Board) {
  dailyMode = false;
  activeDailyDateKey = null;
  emptyMode = false;
  puzzleSource = "imported";

  board = boardArray.slice();
  givens = boardArray.slice();
  candidates = Array.from({ length: 81 }, function () { return new Set<number>(); });
  selectedIdx = null;
  activeDigit = null;
  pencilMode = false;
  mistakes = 0;
  hintsUsedThisGame = 0;
  gameOver = false;
  gameWon = false;
  history = [];
  future = [];

  // Attempt to solve for the known solution (for mistake detection)
  var solved = solve(boardArray);
  solution = solved ? solved : new Array(81).fill(0);

  currentDifficulty = "imported"; // Not a standard difficulty — flagged for UI
  clearPersistence();
  resetTimer();
  startTimer();
  hideHint();
  render();
  updateDifficultyButtons();
  scheduleSave();
  clearHash();
  computeActualDifficulty();
  invalidateAnalysis();
}

// ─── daily challenge ──────────────────────────────────────────────────────

/**
 * Start or resume today's daily challenge.
 */
function startDaily() {
  // Check if already completed today
  if (getTodayStatus() === "completed") {
    showModal({
      title: "Daily Complete ✓",
      body: "You've already completed today's challenge! Come back tomorrow for a new one.",
      buttons: [{ label: "OK", primary: true }]
    });
    return;
  }

  dailyMode = true;
  emptyMode = false;
  puzzleSource = "daily";

  // Try to resume in-progress daily
  var progress = loadProgress();
  var daily = getTodayPuzzle();

  // Capture dateKey now — it won't change even if midnight UTC rolls over mid-game
  activeDailyDateKey = daily.dateKey;

  board     = progress ? progress.board : daily.puzzle.slice();
  solution  = daily.solution.slice();
  givens    = daily.puzzle.slice();
  candidates = progress
    ? progress.candidates
    : Array.from({ length: 81 }, function () { return new Set<number>(); });
  selectedIdx = null;
  activeDigit = null;
  pencilMode  = progress ? progress.pencilMode : false;
  mistakes    = progress ? progress.mistakes : 0;
  timerSeconds = progress ? progress.timerSeconds : 0;
  hintsUsedThisGame = progress ? (progress.hintsUsed || 0) : 0;
  gameOver    = false;
  gameWon     = false;
  history     = progress && progress.history ? progress.history : [];
  future      = progress && progress.future ? progress.future : [];
  currentDifficulty = daily.difficulty;

  resetTimer();
  setTimer(timerSeconds);
  startTimer();
  hideHint();
  render();
  updateDifficultyButtons();
  updateDailyBadge();
  computeActualDifficulty();
  invalidateAnalysis();
}

/** Save daily progress (called by scheduleSave when in dailyMode). */
function saveDailyProgress() {
  saveProgress({
    board: board,
    candidates: candidates,
    mistakes: mistakes,
    timerSeconds: timerSeconds,
    hintsUsed: hintsUsedThisGame,
    pencilMode: pencilMode,
    history: history.slice(-20),
    future: future.slice(-20)
  });
}

function updateDifficultyButtons() {
  document.querySelectorAll(".difficulty-btn").forEach((btn) => {
    var el = btn as any;
    el.classList.toggle("active", el.dataset.difficulty === currentDifficulty);
  });
  // Also update the badge in the stats bar
  const badge = document.getElementById("difficulty-badge");
  if (badge) {
    badge.textContent = currentDifficulty.charAt(0).toUpperCase() + currentDifficulty.slice(1);
  }
}

/**
 * Compute actual difficulty from the logical solve path and update the badge.
 * Runs asynchronously via setTimeout to avoid blocking game start.
 */
function computeActualDifficulty() {
  setTimeout(function () {
    var path = computePath(givens);
    var result = analyze(path);
    var badge = document.getElementById("difficulty-badge");
    if (badge) {
      var generated = currentDifficulty.charAt(0).toUpperCase() + currentDifficulty.slice(1);
      if (result.label !== generated) {
        badge.textContent = generated + " → " + result.label;
        badge.title = "Generated: " + generated + " | Actual: " + result.label + " (hardest: " + result.hardestTechnique + ", " + result.stepCount + " steps)";
      } else {
        badge.textContent = result.label;
        badge.title = result.hardestTechnique + " • " + result.stepCount + " steps";
      }
    }
  }, 100); // Defer to avoid blocking initial render
}

// ─── cell selection ───────────────────────────────────────────────────────

function selectCell(idx: number) {
  if (idx < 0 || idx > 80) return;
  selectedIdx = idx;
  // If there is a digit in this cell, activate that digit on the pad
  if (board[idx] !== 0) {
    activeDigit = board[idx];
  }
  render();
}

// ─── digit placement ──────────────────────────────────────────────────────

/**
 * Place or toggle a digit in the selected cell.
 * If pencilMode, toggles a pencil mark instead.
 */
function placeDigit(digit: number) {
  if (selectedIdx === null) return;
  const idx = selectedIdx;

  // In empty mode every cell is editable
  if (!emptyMode && givens[idx] !== 0) return; // can't change a given

  if (pencilMode) {
    // ── pencil mark ──
    pushHistory();
    if (board[idx] !== 0) return; // can't pencil a filled cell
    if (candidates[idx].has(digit)) {
      candidates[idx].delete(digit);
    } else {
      candidates[idx].add(digit);
    }
    const row = Math.floor(idx / 9) + 1;
    const col = (idx % 9) + 1;
    const added = candidates[idx].has(digit); // true if just added, false if just removed
    announce(`Candidate ${digit} ${added ? "added" : "removed"} at Row ${row}, Column ${col}`);
    render();
    scheduleSave();
    return;
  }

  // ── normal placement ──

  // Toggle off if same digit clicked again
  if (board[idx] === digit) {
    pushHistory();
    board[idx] = 0;
    rebuildCandidatesAround(idx);
    render();
    scheduleSave();
    return;
  }

  pushHistory();
  board[idx] = digit;
  candidates[idx] = new Set<number>(); // clear pencil marks on this cell
  propagateCandidate(idx, digit);

  // Mistake detection (only in game mode with a known solution)
  if (!emptyMode && solution[idx] !== 0 && solution[idx] !== digit) {
    mistakes++;
    flashCell(idx, "wrong");
    setMistakes(mistakes, MAX_MISTAKES);
    const row = Math.floor(idx / 9) + 1;
    const col = (idx % 9) + 1;
    announce(`Wrong. ${digit} at Row ${row}, Column ${col}. Mistake ${mistakes} of ${MAX_MISTAKES}.`);
    if (mistakes >= MAX_MISTAKES) {
      endGame(false);
      return;
    }
  } else {
    const row = Math.floor(idx / 9) + 1;
    const col = (idx % 9) + 1;
    announce(`${digit} placed at Row ${row}, Column ${col}`);
  }

  render();
  scheduleSave();
  checkWin();
}

/**
 * After erasing a cell, rebuild candidates for that cell and its peers
 * rather than doing a full rebuild (performance optimisation).
 */
function rebuildCandidatesAround(idx: number) {
  // Rebuild candidates for the erased cell
  if (board[idx] === 0) {
    const used = new Set(
      PEERS[idx].map((p) => board[p]).filter(Boolean)
    );
    candidates[idx] = new Set<number>();
    for (let d = 1; d <= 9; d++) {
      if (!used.has(d)) candidates[idx].add(d);
    }
  }
  // Peers may now have more candidates — rebuild them too
  for (const p of PEERS[idx]) {
    if (board[p] === 0) {
      const used = new Set(
        PEERS[p].map((pp) => board[pp]).filter(Boolean)
      );
      candidates[p] = new Set<number>();
      for (let d = 1; d <= 9; d++) {
        if (!used.has(d)) candidates[p].add(d);
      }
    }
  }
}

// ─── eraser ───────────────────────────────────────────────────────────────

function eraseCell(idx: number | null = selectedIdx) {
  if (idx === null) return;
  if (!emptyMode && givens[idx] !== 0) return;
  pushHistory();
  board[idx] = 0;
  candidates[idx] = new Set<number>();
  rebuildCandidatesAround(idx);
  const row = Math.floor(idx / 9) + 1;
  const col = (idx % 9) + 1;
  announce(`Row ${row}, Column ${col} cleared`);
  render();
  scheduleSave();
}

// ─── undo / redo ─────────────────────────────────────────────────────────

function undo() {
  if (history.length === 0) return;
  future.push(snapshot());
  restoreSnapshot(history.pop()!);
  render();
  scheduleSave();
}

function redo() {
  if (future.length === 0) return;
  history.push(snapshot());
  restoreSnapshot(future.pop()!);
  render();
  scheduleSave();
}

// ─── auto-candidates ──────────────────────────────────────────────────────

function autoFillCandidates() {
  pushHistory();
  rebuildCandidates();
  render();
  scheduleSave();
}

// ─── hint ─────────────────────────────────────────────────────────────────

function showHint() {
  const hint = getHint(board, candidates);
  if (!hint) {
    showModal({
      title: "No Hint Available",
      body: "No logical technique could be applied to the current state. Try auto-filling candidates first.",
      buttons: [{ label: "OK", primary: true }],
    });
    return;
  }
  hintsUsedThisGame++;
  showHintUI(hint);
}

// ─── win / lose ───────────────────────────────────────────────────────────

function checkWin() {
  if (board.every((v, i) => v === solution[i])) {
    endGame(true);
  }
  // Also allow win when all cells filled and no conflicts (empty mode)
  if (emptyMode && board.every((v) => v !== 0) && computeConflicts().size === 0) {
    endGame(true);
  }
}

function endGame(won: boolean) {
  stopTimer();
  gameOver = true;
  gameWon = won;

  if (dailyMode) {
    clearProgress();
  } else {
    clearPersistence();
  }

  // Record statistics (skip empty mode — no tracked difficulty)
  if (!emptyMode && !dailyMode) {
    if (won) {
      recordWin(currentDifficulty, timerSeconds, hintsUsedThisGame);
    } else {
      recordLoss(currentDifficulty, timerSeconds, hintsUsedThisGame);
    }
  }

  // Record daily completion
  if (dailyMode && won) {
    recordCompletion(activeDailyDateKey!, timerSeconds, mistakes, hintsUsedThisGame);
    updateDailyBadge();
  }

  const m = Math.floor(timerSeconds / 60).toString().padStart(2, "0");
  const s = (timerSeconds % 60).toString().padStart(2, "0");

  // Announce the outcome before showing the modal
  const mistakeWord = mistakes === 1 ? "mistake" : "mistakes";
  if (won) {
    announce(`Puzzle solved! Time: ${m}:${s}. ${mistakes} ${mistakeWord}.`);
  } else {
    announce(`Game over. ${MAX_MISTAKES} mistakes.`);
  }

  if (dailyMode && won) {
    // Daily win — show share option
    var shareText = getShareText(activeDailyDateKey!, timerSeconds, mistakes, hintsUsedThisGame);
    showModal({
      title: "🎉 Daily Complete!",
      body: `You solved today's daily challenge in <strong>${m}:${s}</strong> with <strong>${mistakes}</strong> mistake${mistakes !== 1 ? "s" : ""}.<br><br><code style="font-size:12px;white-space:pre-wrap">${shareText}</code>`,
      buttons: [
        {
          label: "📋 Share",
          primary: true,
          onClick: function () {
            try {
              navigator.clipboard.writeText(shareText);
            } catch (e) {
              // Fallback: select text for manual copy
              prompt("Copy your result:", shareText);
            }
          },
        },
        {
          label: "New Game",
          primary: false,
          onClick: function () { dailyMode = false; newGame(currentDifficulty); },
        },
        { label: "Close", primary: false },
      ],
    });
  } else if (won) {
    showModal({
      title: "🎉 Puzzle Solved!",
      body: `Congratulations! You completed the puzzle in <strong>${m}:${s}</strong> with <strong>${mistakes}</strong> mistake${mistakes !== 1 ? "s" : ""}.`,
      buttons: [
        {
          label: "New Puzzle",
          primary: true,
          onClick: () => newGame(currentDifficulty),
        },
        { label: "Close", primary: false },
      ],
    });
  } else {
    showModal({
      title: "❌ Game Over",
      body: `You made ${MAX_MISTAKES} mistakes. Better luck next time!`,
      buttons: [
        {
          label: dailyMode ? "Retry Daily" : "Try Again",
          primary: true,
          onClick: function () {
            if (dailyMode) {
              clearProgress();
              startDaily();
            } else {
              newGame(currentDifficulty);
            }
          },
        },
        { label: "Close", primary: false },
      ],
    });
  }
}

// ─── solve button ─────────────────────────────────────────────────────────

function solveBoard() {
  if (emptyMode) {
    // In empty mode, validate and solve whatever the user typed
    if (!isValid(board)) {
      showModal({
        title: "Invalid Board",
        body: "The current board has conflicts and cannot be solved.",
        buttons: [{ label: "OK", primary: true }],
      });
      return;
    }
    const solved = solve(board);
    if (!solved) {
      showModal({
        title: "No Solution",
        body: "This puzzle has no valid solution.",
        buttons: [{ label: "OK", primary: true }],
      });
      return;
    }
    pushHistory();
    board = solved;
    candidates = Array.from({ length: 81 }, () => new Set<number>());
  } else {
    pushHistory();
    board = solution.slice();
    candidates = Array.from({ length: 81 }, () => new Set<number>());
  }
  stopTimer();
  clearPersistence();
  render();
}

// ─── UI event wiring ─────────────────────────────────────────────────────

function wireUI() {
  // Cell click → select
  on("cellClick", (idx: number) => {
    if (gameOver) return;
    selectCell(idx);
  });

  // Keyboard digit input from focused cell
  on("digitInput", ({ idx, digit }: { idx: number; digit: number }) => {
    if (gameOver) return;
    selectCell(idx);
    placeDigit(digit);
  });

  // Erase from keyboard
  on("erase", (idx: number) => {
    if (gameOver) return;
    eraseCell(idx);
  });

  // Hint sidebar closed
  on("hintClose", () => {
    // nothing extra needed
  });

  // Hint panel actions
  on("hintApply", (hintResult: any) => {
    if (gameOver) return;
    if (!hintResult.eliminations || !hintResult.eliminations.length) return;
    pushHistory();
    for (const { idx, digit } of hintResult.eliminations) {
      candidates[idx].delete(digit);
    }
    hideHint();
    render();
    scheduleSave();
  });

  on("hintResolve", (hintResult: any) => {
    if (gameOver) return;
    if (!hintResult.placement) return;
    const { idx, digit } = hintResult.placement;
    pushHistory();
    board[idx] = digit;
    candidates[idx] = new Set<number>();
    propagateCandidate(idx, digit);
    hideHint();
    render();
    scheduleSave();
    checkWin();
  });

  // Digit pad buttons
  on("digitButtonClick", (digit: number) => {
    if (gameOver) return;
    if (activeDigit === digit && selectedIdx === null) {
      // Toggle off
      activeDigit = null;
      render();
      return;
    }
    activeDigit = digit;
    if (selectedIdx !== null) {
      placeDigit(digit);
    } else {
      // Just highlight matching cells
      render();
    }
  });

  // Toolbar buttons
  bindBtn("btn-undo",    undo);
  bindBtn("btn-redo",    redo);
  bindBtn("btn-eraser",  () => eraseCell());
  bindBtn("btn-pencil",  () => { pencilMode = !pencilMode; render(); });
  bindBtn("btn-hint",    showHint);
  bindBtn("btn-auto-candidates", autoFillCandidates);
  bindBtn("btn-solve",   () => {
    showModal({
      title: "Reveal Solution?",
      body: "This will show the complete solution. Are you sure?",
      buttons: [
        { label: "Yes, Reveal", primary: true, onClick: solveBoard },
        { label: "Cancel", primary: false },
      ],
    });
  });

  // New puzzle buttons (difficulty chips)
  DIFFICULTIES.forEach((diff) => {
    const btn = document.querySelector(`[data-difficulty="${diff}"]`);
    if (btn) {
      btn.addEventListener("click", () => {
        // Selecting a chip just changes the active difficulty without starting a game
        currentDifficulty = diff;
        updateDifficultyButtons();
      });
    }
  });

  // Load empty grid
  bindBtn("btn-empty", () => {
    showModal({
      title: "Load Empty Grid",
      body: "This clears the board so you can enter your own puzzle. Continue?",
      buttons: [
        { label: "Load", primary: true, onClick: loadEmptyGrid },
        { label: "Cancel", primary: false },
      ],
    });
  });

  // New game button (uses currentDifficulty, already set by difficulty chips)
  bindBtn("btn-new-game", () => {
    showModal({
      title: "New Puzzle",
      body: `Start a new <strong>${currentDifficulty}</strong> puzzle? Your current progress will be lost.`,
      buttons: [
        {
          label: "Start",
          primary: true,
          onClick: () => {
            newGame(currentDifficulty);
            // Close the settings drawer after starting
            if (typeof _closeSettingsDrawer === "function") {
              _closeSettingsDrawer();
            }
          },
        },
        { label: "Cancel", primary: false },
      ],
    });
  });

  // ─── Daily challenge panel (delegated to DailyController) ───────────────

  initDailyCtrl({
    startDaily: startDaily
  });

  // ─── Import / Export (delegated to ImportController) ───────────────────

  initImportCtrl({
    importPuzzle: importPuzzle,
    getGivens: function () { return givens; }
  });

  // ─── Step Solver (delegated to StepSolverController) ──────────────────

  initStepSolverCtrl({
    getBoard: function () { return board; },
    getCandidates: function () { return candidates; },
    getGivens: function () { return givens; },
    restoreState: function (b, c) { board = b; candidates = c; },
    render: render,
    computeConflicts: computeConflicts
  });

  // ─── Puzzle Analysis panel (delegated to AnalysisController) ────────────

  initAnalysisCtrl({
    getGivens: function () { return givens; },
    getCurrentDifficulty: function () { return currentDifficulty; },
    getPuzzleSource: function () { return puzzleSource; }
  });

  // ─── Puzzle Library panel (delegated to LibraryController) ──────────────

  initLibraryCtrl({
    getGivens: function () { return givens; },
    getPuzzleSource: function () { return puzzleSource; },
    getCurrentDifficulty: function () { return currentDifficulty; },
    isGameCompleted: function () { return gameOver && gameWon; },
    loadPuzzle: importPuzzle
  });

  // ─── Statistics panel (delegated to StatisticsController) ─────────────

  initStatisticsCtrl();

  // Global keyboard shortcuts
  document.addEventListener("keydown", (e) => {
    var tgt = e.target as any;
    if (tgt.tagName === "BUTTON" || tgt.tagName === "INPUT") return;
    const key = e.key;

    if (key >= "1" && key <= "9") {
      activeDigit = +key;
      if (selectedIdx !== null) placeDigit(+key);
      else render();
    } else if (key === "0" || key === "Backspace" || key === "Delete") {
      eraseCell();
    } else if ((e.ctrlKey || e.metaKey) && key === "z") {
      e.preventDefault();
      if (e.shiftKey) redo();
      else undo();
    } else if ((e.ctrlKey || e.metaKey) && key === "y") {
      e.preventDefault();
      redo();
    } else if (key === "p" || key === "P") {
      pencilMode = !pencilMode;
      render();
    } else if (key === "h" || key === "H") {
      showHint();
    }
  });
}

function bindBtn(id: string, fn: () => void) {
  const el = document.getElementById(id);
  if (el) el.addEventListener("click", fn);
}

// ─── bootstrap ───────────────────────────────────────────────────────────

export function init() {
  initUI();
  wireUI();

  // Check URL hash for shared puzzle
  var hashBoard = getHashPuzzle();
  if (hashBoard) {
    var validation = validate(hashBoard);
    if (validation.valid && validation.solvable) {
      showModal({
        title: "Shared Puzzle",
        body: "A puzzle was shared with you via link. Load it?",
        buttons: [
          { label: "Load", primary: true, onClick: function () { importPuzzle(hashBoard!); } },
          { label: "Cancel", primary: false, onClick: function () { clearHash(); } }
        ]
      });
      // Still load a game in background so the UI isn't blank
      newGame("medium");
      return;
    } else {
      // Invalid hash — clear it silently
      clearHash();
    }
  }

  // Attempt to restore saved game; fall back to new game
  const saved = loadPersistence();
  if (saved && !saved.gameOver && !saved.gameWon) {
    // Restore all state from save
    board             = saved.board;
    solution          = saved.solution;
    givens            = saved.givens;
    candidates        = saved.candidates;
    selectedIdx       = null;  // ephemeral — not persisted
    activeDigit       = null;  // ephemeral — not persisted
    pencilMode        = saved.pencilMode;
    mistakes          = saved.mistakes;
    timerSeconds      = saved.timerSeconds;
    gameOver          = saved.gameOver;
    gameWon           = saved.gameWon;
    emptyMode         = saved.emptyMode;
    currentDifficulty = saved.currentDifficulty;
    hintsUsedThisGame = saved.hintsUsedThisGame || 0;
    history           = saved.history;
    future            = saved.future;

    // Resume timer from saved position (no scheduleSave here — state unchanged)
    setTimer(timerSeconds);
    startTimer();
    render();
    updateDifficultyButtons();
  } else {
    // No valid save or game was already finished — start fresh
    newGame("medium");
  }
}

// Save state immediately before page unload (catches rapid close)
if (typeof window !== 'undefined') {
  window.addEventListener("beforeunload", function () {
    if (!gameOver && !gameWon) {
      if (dailyMode) {
        saveDailyProgress();
      } else {
        saveImmediate(getState());
      }
    }
  });
}

