/**
 * ui.ts — Pure UI layer (no game logic).
 */

import { PEERS } from '../core/solver';
import { FocusTrap, setAppAriaHidden } from './accessibility';

type Board = number[];
type CandidateGrid = Set<number>[];

interface ModalButton { label: string; primary?: boolean; onClick?: () => void; }
interface ModalOpts { title?: string; body?: string; buttons?: ModalButton[]; }
interface HintResultLike {
  technique: string;
  description: string;
  highlights: { cause?: number[]; affected?: number[]; result?: number[] };
  eliminations?: { idx: number; digit: number }[];
  placement?: { idx: number; digit: number } | null;
}

// ─── Internal state ─────────────────────────────────────────────────────────

export const cells: any[] = [];
const handlers: Record<string, Function[]> = {};

// Module-level FocusTrap instance for the hint panel
let hintTrap: FocusTrap | null = null;

// ─── Event emitter ──────────────────────────────────────────────────────────

function emit(event: string, data?: any): void {
  (handlers[event] || []).forEach((fn) => fn(data));
}

export function on(event: string, fn: Function): void {
  if (!handlers[event]) handlers[event] = [];
  handlers[event].push(fn);
}

// ─── Dark mode ──────────────────────────────────────────────────────────────

export function isDarkMode(): boolean {
  return document.documentElement.classList.contains("dark");
}

export function toggleDarkMode(): void {
  document.documentElement.classList.toggle("dark");
  const isDark = isDarkMode();
  localStorage.setItem("sudoku-dark", isDark ? "1" : "0");
  const btn = document.getElementById("btn-dark");
  if (btn) btn.setAttribute("aria-pressed", String(isDark));
  emit("darkModeChange", isDark);
}

function initDarkMode(): void {
  const saved = localStorage.getItem("sudoku-dark");
  const prefersDark = saved !== null
    ? saved === "1"
    : window.matchMedia("(prefers-color-scheme: dark)").matches;
  if (prefersDark) document.documentElement.classList.add("dark");
  const btn = document.getElementById("btn-dark");
  if (btn) btn.setAttribute("aria-pressed", String(prefersDark));
}

// ─── Grid builder ───────────────────────────────────────────────────────────

function buildGrid(): void {
  const container = document.getElementById("sudoku-grid");
  if (!container) return;
  container.innerHTML = "";
  cells.length = 0;

  for (let i = 0; i < 81; i++) {
    const cell = document.createElement("div");
    cell.className = "cell";
    cell.dataset.idx = String(i);
    cell.setAttribute("tabindex", "0");
    cell.setAttribute("role", "gridcell");
    cell.setAttribute("aria-label", `Row ${Math.floor(i / 9) + 1}, Column ${(i % 9) + 1}`);

    const marks = document.createElement("div");
    marks.className = "pencil-marks";
    marks.setAttribute("aria-hidden", "true");
    for (let d = 1; d <= 9; d++) {
      const m = document.createElement("span");
      m.className = "mark";
      m.dataset.digit = String(d);
      m.setAttribute("aria-hidden", "true");
      marks.appendChild(m);
    }

    const digit = document.createElement("span");
    digit.className = "cell-digit";

    cell.appendChild(marks);
    cell.appendChild(digit);
    container.appendChild(cell);
    cells.push(cell);

    cell.addEventListener("click", () => emit("cellClick", i));
    cell.addEventListener("keydown", (e) => {
      const key = e.key;
      if (key >= "1" && key <= "9") emit("digitInput", { idx: i, digit: +key });
      else if (key === "Backspace" || key === "Delete" || key === "0") emit("erase", i);
      else if (key === "ArrowRight") emit("cellClick", i + 1 < 81 ? i + 1 : i);
      else if (key === "ArrowLeft")  emit("cellClick", i - 1 >= 0 ? i - 1 : i);
      else if (key === "ArrowDown")  emit("cellClick", i + 9 < 81 ? i + 9 : i);
      else if (key === "ArrowUp")    emit("cellClick", i - 9 >= 0 ? i - 9 : i);
    });
  }
}

// ─── Digit buttons ──────────────────────────────────────────────────────────

function buildDigitButtons(): void {
  const container = document.getElementById("numpad");
  if (!container) return;
  for (let d = 1; d <= 9; d++) {
    const btn = document.createElement("button");
    btn.className = "digit-btn";
    btn.dataset.digit = String(d);
    btn.setAttribute("aria-label", `Digit ${d}`);
    const badge = document.createElement("span");
    badge.className = "digit-badge";
    badge.id = `badge-${d}`;
    badge.setAttribute("aria-hidden", "true");
    btn.appendChild(document.createTextNode(String(d)));
    btn.appendChild(badge);
    container.appendChild(btn);
    btn.addEventListener("click", () => emit("digitButtonClick", d));
  }
}

// ─── Cell rendering ─────────────────────────────────────────────────────────

export function flashCell(idx: number, cls: string, durationMs = 600): void {
  const cell = cells[idx];
  if (!cell) return;
  cell.classList.add(cls);
  setTimeout(() => cell.classList.remove(cls), durationMs);
}

export function updateCell(idx: number, board: Board, givens: Board, candidates: CandidateGrid, selectedIdx: number | null, activeDigit: number | null, conflicts: Set<number> | null): void {
  const cell = cells[idx];
  if (!cell) return;

  const val = board[idx];
  const isGiven = givens[idx] !== 0;
  const isSelected = idx === selectedIdx;
  const cands = candidates ? candidates[idx] : null;

  // ARIA state attributes (Requirements 2.1, 6.7)
  const row = Math.floor(idx / 9) + 1;
  const col = (idx % 9) + 1;
  const valueText = val !== 0 ? String(val) : "empty";
  const pencilText = (val === 0 && cands && cands.size > 0)
    ? `, candidates: ${[...cands].sort().join(" ")}`
    : "";
  cell.setAttribute("aria-label", `Row ${row}, Column ${col}: ${valueText}${pencilText}`);
  cell.setAttribute("aria-selected", String(isSelected));
  if (conflicts && conflicts.has(idx)) {
    cell.setAttribute("aria-invalid", "true");
  } else {
    cell.removeAttribute("aria-invalid");
  }
  cell.setAttribute("aria-readonly", String(isGiven));

  const classes = ["cell"];
  if (isGiven) classes.push("given");
  if (isSelected) classes.push("selected");

  if (selectedIdx !== null && selectedIdx !== undefined) {
    const peers = PEERS[selectedIdx];
    if (peers.includes(idx)) classes.push("peer");
  }

  if (activeDigit && val === activeDigit) classes.push("same-digit");
  if (activeDigit && val === 0 && cands && cands.has && cands.has(activeDigit)) classes.push("candidate-highlight");
  if (conflicts && conflicts.has(idx)) classes.push("conflict");

  cell.className = classes.join(" ");

  const r = Math.floor(idx / 9), c = idx % 9;
  if (c % 3 === 0 && c !== 0) cell.classList.add("box-border-left");
  if (r % 3 === 0 && r !== 0) cell.classList.add("box-border-top");

  const digitSpan = cell.querySelector(".cell-digit") as HTMLElement;
  digitSpan.textContent = val !== 0 ? String(val) : "";
  if (!isGiven && val !== 0) { digitSpan.classList.add("user-digit"); digitSpan.classList.remove("given-digit"); }
  else if (isGiven) { digitSpan.classList.add("given-digit"); digitSpan.classList.remove("user-digit"); }
  else { digitSpan.className = "cell-digit"; }

  const marksDiv = cell.querySelector(".pencil-marks") as HTMLElement;
  if (val === 0 && cands && cands.size > 0) {
    marksDiv.style.display = "grid";
    digitSpan.style.display = "none";
    marksDiv.querySelectorAll(".mark").forEach((m: any) => {
      const d = +m.dataset.digit;
      m.textContent = cands.has(d) ? String(d) : "";
      m.classList.toggle("mark-highlight", !!(activeDigit && cands.has(d) && d === activeDigit));
    });
  } else {
    marksDiv.style.display = "none";
    digitSpan.style.display = "";
  }

  if (!isGiven && val !== 0) {
    cell.classList.add("pop");
    cell.addEventListener("animationend", () => cell.classList.remove("pop"), { once: true });
  }
}

export function renderBoard(board: Board, givens: Board, candidates: CandidateGrid, selectedIdx: number | null, activeDigit: number | null, conflicts: Set<number> | null): void {
  for (let i = 0; i < 81; i++) {
    updateCell(i, board, givens, candidates, selectedIdx, activeDigit, conflicts);
  }
}

// ─── Timer ──────────────────────────────────────────────────────────────────

export function setTimer(totalSeconds: number): void {
  const el = document.getElementById("timer");
  if (!el) return;
  const m = Math.floor(totalSeconds / 60).toString().padStart(2, "0");
  const s = (totalSeconds % 60).toString().padStart(2, "0");
  el.textContent = `${m}:${s}`;
}

// ─── Mistake counter ────────────────────────────────────────────────────────

export function setMistakes(count: number, max: number): void {
  const el = document.getElementById("mistake-count");
  if (el) el.textContent = `Mistakes: ${count}/${max}`;
  document.querySelectorAll(".mistake-pip").forEach((pip, i) => {
    pip.classList.toggle("filled", i < count);
  });
}

// ─── Digit count badges ─────────────────────────────────────────────────────

export function setDigitCounts(board: Board): void {
  const counts = new Array(10).fill(0);
  board.forEach((v) => { if (v !== 0) counts[v]++; });
  for (let d = 1; d <= 9; d++) {
    const badge = document.getElementById(`badge-${d}`);
    if (!badge) continue;
    const remaining = 9 - counts[d];
    badge.textContent = remaining > 0 ? String(remaining) : "";
    const btn = badge.closest(".digit-btn") as HTMLElement | null;
    if (btn) {
      btn.classList.toggle("digit-complete", remaining === 0);
      btn.setAttribute("aria-label",
        remaining > 0 ? `Digit ${d}, ${remaining} remaining` : `Digit ${d}, complete`
      );
    }
  }
}

// ─── Hint panel ─────────────────────────────────────────────────────────────

const HINT_CLASSES = ["hint-blue", "hint-yellow", "hint-purple"];

function applyHintHighlights(hintResult: HintResultLike): void {
  clearHintHighlights();
  const { cause = [], result = [], affected = [] } = hintResult.highlights;
  cause.forEach((i) => cells[i]?.classList.add("hint-blue"));
  result.forEach((i) => cells[i]?.classList.add("hint-yellow"));
  affected.forEach((i) => cells[i]?.classList.add("hint-purple"));

  if (hintResult.eliminations && hintResult.eliminations.length) {
    const elimMap = new Map<number, Set<number>>();
    for (const { idx, digit } of hintResult.eliminations) {
      if (!elimMap.has(idx)) elimMap.set(idx, new Set());
      elimMap.get(idx)!.add(digit);
    }
    elimMap.forEach((digits, cellIdx) => {
      const cell = cells[cellIdx];
      if (!cell) return;
      cell.querySelectorAll(".mark").forEach((m: any) => {
        if (digits.has(+m.dataset.digit)) m.classList.add("hint-elim");
      });
    });
  }
}

export function clearHintHighlights(): void {
  cells.forEach((c) => {
    c.classList.remove(...HINT_CLASSES);
    c.querySelectorAll(".mark.hint-elim").forEach((m: any) => m.classList.remove("hint-elim"));
  });
}

function showHintPanel(hintResult: HintResultLike): void {
  const panel = document.getElementById("hint-panel");
  if (!panel) return;

  const nameEl = document.getElementById("hint-technique-name");
  const expl = document.getElementById("hint-explanation");
  if (nameEl) nameEl.textContent = hintResult.technique;
  if (expl) expl.innerHTML = hintResult.description;

  const resolveBtn = document.getElementById("hint-btn-resolve") as HTMLButtonElement | null;
  if (resolveBtn) resolveBtn.disabled = !hintResult.placement;

  const applyBtn = document.getElementById("hint-btn-apply") as HTMLButtonElement | null;
  if (applyBtn) applyBtn.disabled = !(hintResult.eliminations && hintResult.eliminations.length);

  applyHintHighlights(hintResult);

  panel.classList.add("open");
  panel.setAttribute("aria-hidden", "false");
  setAppAriaHidden(true);
  hintTrap = new FocusTrap({
    container: panel,
    onEscape: () => { hideHintPanel(); emit("hintDismiss"); }
  });
  hintTrap.activate();
  const hs = document.getElementById("hint-scrim");
  if (hs) { hs.classList.add("visible"); hs.setAttribute("aria-hidden", "false"); }

  _rewireHintButton("hint-btn-apply", () => emit("hintApply", hintResult));
  _rewireHintButton("hint-btn-resolve", () => emit("hintResolve", hintResult));
  _rewireHintButton("hint-btn-dismiss", () => { hideHintPanel(); emit("hintDismiss"); });
}

function _rewireHintButton(id: string, handler: () => void): void {
  const old = document.getElementById(id);
  if (!old) return;
  const fresh = old.cloneNode(true) as HTMLElement;
  old.parentNode!.replaceChild(fresh, old);
  fresh.addEventListener("click", handler);
}

function hideHintPanel(): void {
  hintTrap?.deactivate();
  hintTrap = null;
  const panel = document.getElementById("hint-panel");
  if (panel) { panel.classList.remove("open"); panel.setAttribute("aria-hidden", "true"); }
  const hs = document.getElementById("hint-scrim");
  if (hs) { hs.classList.remove("visible"); hs.setAttribute("aria-hidden", "true"); }
  clearHintHighlights();
  setAppAriaHidden(false);
  document.getElementById("btn-hint")?.focus();
}

export const showHint = showHintPanel;
export const hideHint = hideHintPanel;

// ─── Modal ──────────────────────────────────────────────────────────────────

export function showModal({ title = "", body = "", buttons = [] }: ModalOpts = {}): void {
  const overlay = document.getElementById("modal-overlay");
  const titleEl = document.getElementById("modal-title");
  const bodyEl = document.getElementById("modal-body");
  const footerEl = document.getElementById("modal-footer");
  if (!overlay) return;

  if (titleEl) titleEl.textContent = title;
  if (bodyEl) bodyEl.innerHTML = body;
  if (footerEl) {
    footerEl.innerHTML = "";
    buttons.forEach(({ label, primary, onClick }) => {
      const btn = document.createElement("button");
      btn.textContent = label;
      btn.className = primary ? "btn btn-primary" : "btn btn-secondary";
      btn.addEventListener("click", () => { hideModal(); if (onClick) onClick(); });
      footerEl.appendChild(btn);
    });
  }
  overlay.classList.add("active");
  overlay.setAttribute("aria-hidden", "false");
  const firstBtn = footerEl?.querySelector("button") as HTMLElement | null;
  if (firstBtn) firstBtn.focus();
}

export function hideModal(): void {
  const overlay = document.getElementById("modal-overlay");
  if (overlay) { overlay.classList.remove("active"); overlay.setAttribute("aria-hidden", "true"); }
}

// ─── Active digit button ────────────────────────────────────────────────────

export function setActiveDigitButton(digit: number | null): void {
  document.querySelectorAll(".digit-btn").forEach((btn) => {
    const el = btn as HTMLElement;
    el.classList.toggle("active", +el.dataset.digit! === digit);
  });
}

// ─── Init ───────────────────────────────────────────────────────────────────

// Mutable reference for settings drawer close (set during init, exposed on window.UI)
export let _closeSettingsDrawer: (() => void) | null = null;

export function init(): void {
  initDarkMode();
  buildGrid();
  buildDigitButtons();

  const darkBtn = document.getElementById("btn-dark");
  if (darkBtn) darkBtn.addEventListener("click", toggleDarkMode);

  const hintClose = document.getElementById("hint-close");
  if (hintClose) hintClose.addEventListener("click", () => { hideHint(); emit("hintClose"); });

  const hintScrim = document.getElementById("hint-scrim");
  if (hintScrim) hintScrim.addEventListener("click", () => { hideHintPanel(); emit("hintClose"); });

  function openSettingsDrawer() {
    const drawer = document.getElementById("settings-drawer");
    const scrim = document.getElementById("settings-scrim");
    if (drawer) { drawer.classList.add("open"); drawer.setAttribute("aria-hidden", "false"); }
    if (scrim) { scrim.classList.add("visible"); scrim.setAttribute("aria-hidden", "false"); }
    const closeBtn = document.getElementById("btn-settings-close");
    if (closeBtn) closeBtn.focus();
  }

  function closeSettingsDrawer() {
    const drawer = document.getElementById("settings-drawer");
    const scrim = document.getElementById("settings-scrim");
    if (drawer) { drawer.classList.remove("open"); drawer.setAttribute("aria-hidden", "true"); }
    if (scrim) { scrim.classList.remove("visible"); scrim.setAttribute("aria-hidden", "true"); }
    const settingsBtn = document.getElementById("btn-settings");
    if (settingsBtn) settingsBtn.focus();
  }

  _closeSettingsDrawer = closeSettingsDrawer;

  const btnSettings = document.getElementById("btn-settings");
  const btnSettingsClose = document.getElementById("btn-settings-close");
  const settingsScrim = document.getElementById("settings-scrim");
  if (btnSettings) btnSettings.addEventListener("click", openSettingsDrawer);
  if (btnSettingsClose) btnSettingsClose.addEventListener("click", closeSettingsDrawer);
  if (settingsScrim) settingsScrim.addEventListener("click", closeSettingsDrawer);

  const overlay = document.getElementById("modal-overlay");
  if (overlay) { overlay.addEventListener("click", (e) => { if (e.target === overlay) hideModal(); }); }

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      hideHint();
      hideModal();
      const drawer = document.getElementById("settings-drawer");
      if (drawer && drawer.classList.contains("open")) { document.getElementById("btn-settings-close")?.click(); }
      const statsPanel = document.getElementById("stats-panel");
      if (statsPanel && statsPanel.classList.contains("open")) { document.getElementById("btn-stats-close")?.click(); }
      const dailyPanel = document.getElementById("daily-panel");
      if (dailyPanel && dailyPanel.classList.contains("open")) { document.getElementById("btn-daily-close")?.click(); }
      const stepPanel = document.getElementById("step-solver-panel");
      if (stepPanel && stepPanel.classList.contains("open")) { document.getElementById("btn-step-close")?.click(); }
      const analysisPanel = document.getElementById("analysis-panel");
      if (analysisPanel && analysisPanel.classList.contains("open")) { document.getElementById("btn-analysis-close")?.click(); }
      const libraryPanel = document.getElementById("library-panel");
      if (libraryPanel && libraryPanel.classList.contains("open")) { document.getElementById("btn-library-close")?.click(); }
    }
  });
}
