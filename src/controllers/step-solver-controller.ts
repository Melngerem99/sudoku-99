/**
 * step-solver-controller.ts — Step solver panel controller.
 */

import { computePath, type PathResult } from '../core/step-solver';
import { analyze } from '../core/difficulty';
import { setText, $btn } from '../ui/dom-helpers';
import { showModal, clearHintHighlights, renderBoard, cells } from '../ui/ui';
import { FocusTrap, setAppAriaHidden } from '../ui/accessibility';

type Board = number[];
type CandidateGrid = Set<number>[];

// ─── Injected callbacks ─────────────────────────────────────────────────────

let getBoard: () => Board = () => [];
let getCandidates: () => CandidateGrid = () => [];
let getGivens: () => Board = () => [];
let restoreStateFn: (board: Board, candidates: CandidateGrid) => void = () => {};
let renderGame: () => void = () => {};
let computeConflictsFn: () => Set<number> = () => new Set();

// ─── Internal state ─────────────────────────────────────────────────────────

let active = false;
let path: PathResult | null = null;
let stepIndex = -1;
let autoPlayHandle: ReturnType<typeof setInterval> | null = null;
let speed = 2000;
let originalBoard: Board | null = null;
let originalCandidates: CandidateGrid | null = null;
let trap: FocusTrap | null = null;

const SPEEDS: Record<string, number> = { slow: 3000, normal: 2000, fast: 800 };

// ─── Panel open / close ─────────────────────────────────────────────────────

export function open(): void {
  const board = getBoard();
  let emptyCount = 0;
  for (let i = 0; i < 81; i++) { if (board[i] === 0) emptyCount++; }
  if (emptyCount === 0) {
    showModal({ title: "Already Solved", body: "This puzzle is already complete.", buttons: [{ label: "OK", primary: true }] });
    return;
  }

  originalBoard = board.slice();
  originalCandidates = getCandidates().map(s => new Set(s));

  path = computePath(board);
  stepIndex = -1;
  active = true;

  const panel = document.getElementById("step-solver-panel");
  const scrim = document.getElementById("step-solver-scrim");
  if (panel) { panel.classList.add("open"); panel.setAttribute("aria-hidden", "false"); }
  if (scrim) { scrim.classList.add("visible"); scrim.setAttribute("aria-hidden", "false"); }

  setText("step-total", path.steps.length);
  renderStepState();
  updateButtons();

  const summaryEl = document.getElementById("step-summary");
  if (summaryEl) summaryEl.style.display = "none";

  const explEl = document.getElementById("step-explanation");
  if (explEl) {
    if (path.steps.length === 0) {
      explEl.innerHTML = "No logical steps could be found. The puzzle may require guessing.";
    } else {
      explEl.innerHTML = "Ready. Use ▶ to step through " + path.steps.length + " logical step" + (path.steps.length !== 1 ? "s" : "") + ".";
    }
  }

  const panelEl = document.getElementById("step-solver-panel");
  if (panelEl) {
    setAppAriaHidden(true);
    trap = new FocusTrap({ container: panelEl, onEscape: close });
    trap.activate();
  }
}

export function close(): void {
  trap?.deactivate();
  trap = null;

  stopAutoPlay();
  active = false;

  if (originalBoard && originalCandidates) {
    restoreStateFn(originalBoard, originalCandidates);
    originalBoard = null;
    originalCandidates = null;
  }

  const panel = document.getElementById("step-solver-panel");
  const scrim = document.getElementById("step-solver-scrim");
  if (panel) { panel.classList.remove("open"); panel.setAttribute("aria-hidden", "true"); }
  if (scrim) { scrim.classList.remove("visible"); scrim.setAttribute("aria-hidden", "true"); }

  clearHintHighlights();
  renderGame();

  setAppAriaHidden(false);
  document.getElementById("btn-step-solve")?.focus();
}

export function isActive(): boolean {
  return active;
}

// ─── Navigation ─────────────────────────────────────────────────────────────

function goToStep(idx: number): void {
  if (!path || !path.steps.length) return;
  idx = Math.max(-1, Math.min(idx, path.steps.length - 1));
  stepIndex = idx;
  renderStepState();
  updateButtons();

  if (idx === path.steps.length - 1) {
    showSummary();
  } else {
    const summaryEl = document.getElementById("step-summary");
    if (summaryEl) summaryEl.style.display = "none";
  }
}

// ─── Render ─────────────────────────────────────────────────────────────────

function renderStepState(): void {
  const techEl = document.getElementById("step-technique-name");
  const explEl = document.getElementById("step-explanation");
  const givens = getGivens();

  if (stepIndex < 0) {
    setText("step-current", "0");
    if (techEl) techEl.textContent = "—";
    clearHintHighlights();
    const conflicts = computeConflictsFn();
    renderBoard(originalBoard!, givens, originalCandidates!, null, null, conflicts);
    return;
  }

  const step = path!.steps[stepIndex];
  setText("step-current", step.stepNumber);
  if (techEl) techEl.textContent = step.technique;
  if (explEl) explEl.innerHTML = step.description;

  const noConflicts: Set<number> = new Set();
  renderBoard(step.boardAfter, givens, step.candidatesAfter, null, null, noConflicts);

  clearHintHighlights();
  if (step.highlights) {
    if (step.highlights.cause) {
      step.highlights.cause.forEach((i) => { if (cells[i]) cells[i].classList.add("hint-blue"); });
    }
    if (step.highlights.result) {
      step.highlights.result.forEach((i) => { if (cells[i]) cells[i].classList.add("hint-yellow"); });
    }
    if (step.highlights.affected) {
      step.highlights.affected.forEach((i) => { if (cells[i]) cells[i].classList.add("hint-purple"); });
    }
  }
}

function updateButtons(): void {
  const total = path ? path.steps.length : 0;
  const firstBtn = $btn("step-btn-first");
  const prevBtn = $btn("step-btn-prev");
  const nextBtn = $btn("step-btn-next");
  const lastBtn = $btn("step-btn-last");

  if (firstBtn) firstBtn.disabled = stepIndex <= -1;
  if (prevBtn) prevBtn.disabled = stepIndex <= -1;
  if (nextBtn) nextBtn.disabled = stepIndex >= total - 1;
  if (lastBtn) lastBtn.disabled = stepIndex >= total - 1;
}

// ─── Autoplay ───────────────────────────────────────────────────────────────

function startAutoPlay(): void {
  if (autoPlayHandle) return;
  const playBtn = document.getElementById("step-btn-play");
  if (playBtn) { playBtn.textContent = "⏸"; playBtn.classList.add("playing"); }

  autoPlayHandle = setInterval(() => {
    if (!path || stepIndex >= path.steps.length - 1) {
      stopAutoPlay();
      document.getElementById("step-btn-play")?.focus();
      return;
    }
    goToStep(stepIndex + 1);
  }, speed);
}

function stopAutoPlay(): void {
  if (autoPlayHandle) { clearInterval(autoPlayHandle); autoPlayHandle = null; }
  const playBtn = document.getElementById("step-btn-play");
  if (playBtn) { playBtn.textContent = "▶"; playBtn.classList.remove("playing"); }
}

function toggleAutoPlay(): void {
  if (autoPlayHandle) { stopAutoPlay(); }
  else {
    if (path && stepIndex >= path.steps.length - 1) {
      stepIndex = -1;
      renderStepState();
      updateButtons();
    }
    startAutoPlay();
  }
}

// ─── Summary ────────────────────────────────────────────────────────────────

function showSummary(): void {
  const summaryEl = document.getElementById("step-summary");
  const contentEl = document.getElementById("step-summary-content");
  if (!summaryEl || !contentEl || !path) return;

  stopAutoPlay();
  const diffResult = analyze(path);

  const lines: string[] = [];
  lines.push("<strong>Actual Difficulty:</strong> " + diffResult.label + " (score: " + diffResult.score + ")");
  lines.push("<strong>Total Steps:</strong> " + path.steps.length);
  lines.push("<strong>Computation:</strong> " + path.durationMs + "ms");
  lines.push("<strong>Hardest Technique:</strong> " + path.hardestTechnique);

  if (!path.complete) {
    lines.push("<strong>Status:</strong> ⚠️ Incomplete — " + path.stuckAt + " cells remaining (requires guessing)");
  } else {
    lines.push("<strong>Status:</strong> ✓ Fully solved logically");
  }

  lines.push("<br><strong>Techniques Used:</strong>");
  const counts = path.techniqueCounts;
  for (const name of Object.keys(counts)) {
    lines.push("  • " + name + ": " + counts[name]);
  }

  contentEl.innerHTML = lines.join("<br>");
  summaryEl.style.display = "block";
}

// ─── Event wiring ───────────────────────────────────────────────────────────

export interface StepSolverInitConfig {
  getBoard: () => Board;
  getCandidates: () => CandidateGrid;
  getGivens: () => Board;
  restoreState: (board: Board, candidates: CandidateGrid) => void;
  render: () => void;
  computeConflicts: () => Set<number>;
}

export function init(config: StepSolverInitConfig): void {
  getBoard = config.getBoard;
  getCandidates = config.getCandidates;
  getGivens = config.getGivens;
  restoreStateFn = config.restoreState;
  renderGame = config.render;
  computeConflictsFn = config.computeConflicts;

  const openBtn = document.getElementById("btn-step-solve");
  if (openBtn) openBtn.addEventListener("click", open);

  const closeBtn = document.getElementById("btn-step-close");
  if (closeBtn) closeBtn.addEventListener("click", close);

  const firstBtn = document.getElementById("step-btn-first");
  if (firstBtn) firstBtn.addEventListener("click", () => goToStep(-1));

  const prevBtn = document.getElementById("step-btn-prev");
  if (prevBtn) prevBtn.addEventListener("click", () => goToStep(stepIndex - 1));

  const nextBtn = document.getElementById("step-btn-next");
  if (nextBtn) nextBtn.addEventListener("click", () => goToStep(stepIndex + 1));

  const lastBtn = document.getElementById("step-btn-last");
  if (lastBtn) lastBtn.addEventListener("click", () => goToStep(path ? path.steps.length - 1 : 0));

  const playBtn = document.getElementById("step-btn-play");
  if (playBtn) playBtn.addEventListener("click", toggleAutoPlay);

  const scrim = document.getElementById("step-solver-scrim");
  if (scrim) scrim.addEventListener("click", close);

  document.querySelectorAll(".step-speed-btn").forEach((btn) => {
    const el = btn as HTMLElement;
    el.addEventListener("click", () => {
      document.querySelectorAll(".step-speed-btn").forEach((b) => b.classList.remove("active"));
      el.classList.add("active");
      speed = SPEEDS[el.dataset.speed!] || 2000;
      if (autoPlayHandle) { stopAutoPlay(); startAutoPlay(); }
    });
  });
}
