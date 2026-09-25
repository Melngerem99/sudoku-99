/**
 * library-controller.ts — Puzzle library panel controller.
 */

import { filter as libraryFilter, get, save, remove, toggleFavorite, markPlayed } from '../services/library';
import { parse, exportGivens as exportGivensStr } from '../services/import-export';
import { computePath } from '../core/step-solver';
import { analyze } from '../core/difficulty';
import { $select, $input } from '../ui/dom-helpers';
import { showModal, _closeSettingsDrawer } from '../ui/ui';
import { FocusTrap, setAppAriaHidden } from '../ui/accessibility';

type Board = number[];

let trap: FocusTrap | null = null;

// ─── Injected callbacks ─────────────────────────────────────────────────────

let getGivens: () => Board = () => [];
let getPuzzleSource: () => string = () => "generated";
let getCurrentDifficulty: () => string = () => "medium";
let isGameCompleted: () => boolean = () => false;
let loadPuzzleFn: (board: Board) => void = () => {};

// ─── Panel open / close ─────────────────────────────────────────────────────

export function open(): void {
  populate();
  const panel = document.getElementById("library-panel");
  const scrim = document.getElementById("library-scrim");
  if (panel) { panel.classList.add("open"); panel.setAttribute("aria-hidden", "false"); }
  if (scrim) { scrim.classList.add("visible"); scrim.setAttribute("aria-hidden", "false"); }
  if (typeof _closeSettingsDrawer === "function") _closeSettingsDrawer();
  const panelEl = document.getElementById("library-panel");
  if (panelEl) {
    setAppAriaHidden(true);
    trap = new FocusTrap({ container: panelEl, onEscape: close });
    trap.activate();
  }
}

export function close(): void {
  trap?.deactivate();
  trap = null;
  const panel = document.getElementById("library-panel");
  const scrim = document.getElementById("library-scrim");
  if (panel) { panel.classList.remove("open"); panel.setAttribute("aria-hidden", "true"); }
  if (scrim) { scrim.classList.remove("visible"); scrim.setAttribute("aria-hidden", "true"); }
  setAppAriaHidden(false);
  document.getElementById("btn-library")?.focus();
}

// ─── Filters ────────────────────────────────────────────────────────────────

function getFilters(): any {
  const diffEl = $select("library-filter-diff");
  const srcEl = $select("library-filter-source");
  const sortEl = $select("library-sort");
  const favEl = $input("library-filter-fav");
  const unsolvedEl = $input("library-filter-unsolved");
  return {
    difficulty: diffEl ? diffEl.value || null : null,
    source: srcEl ? srcEl.value || null : null,
    sort: sortEl ? sortEl.value : "newest",
    favorite: favEl && favEl.checked ? true : null,
    completed: unsolvedEl && unsolvedEl.checked ? false : null,
  };
}

// ─── Populate ───────────────────────────────────────────────────────────────

function populate(): void {
  const filters = getFilters();
  const entries = libraryFilter(filters);
  const countEl = document.getElementById("library-count");
  const listEl = document.getElementById("library-list");

  if (countEl) countEl.textContent = entries.length + " puzzle" + (entries.length !== 1 ? "s" : "");
  if (!listEl) return;
  listEl.innerHTML = "";

  if (entries.length === 0) {
    listEl.innerHTML = '<div class="library-empty">No puzzles saved yet.<br>Use "Save to Library" to add puzzles.</div>';
    return;
  }

  for (const entry of entries) {
    const date = new Date(entry.savedAt);
    const dateStr = date.toLocaleDateString();
    const techStr = entry.hardestTechnique || "—";

    const item = document.createElement("div");
    item.className = "library-item";
    item.setAttribute("role", "listitem");
    item.setAttribute("tabindex", "0");
    item.dataset.id = entry.id;

    item.innerHTML =
      '<div class="library-item-info">' +
        '<div class="library-item-diff">' + (entry.actualDifficulty || "?") + (entry.completed ? ' ✓' : '') + '</div>' +
        '<div class="library-item-meta">' + entry.source + ' • ' + dateStr + ' • ' + techStr + '</div>' +
      '</div>' +
      '<div class="library-item-actions">' +
        '<button class="library-item-btn lib-fav-btn' + (entry.favorite ? ' favorited' : '') + '" data-id="' + entry.id + '" aria-label="Toggle favorite" title="Favorite">★</button>' +
        '<button class="library-item-btn lib-del-btn" data-id="' + entry.id + '" aria-label="Delete puzzle" title="Delete">✕</button>' +
      '</div>';

    listEl.appendChild(item);
  }

  listEl.onclick = (e) => {
    const target = e.target as HTMLElement;
    if (target.classList.contains("lib-fav-btn")) {
      const id = target.dataset.id!;
      toggleFavorite(id);
      target.classList.toggle("favorited");
      return;
    }
    if (target.classList.contains("lib-del-btn")) {
      const id2 = target.dataset.id!;
      showModal({
        title: "Delete Puzzle?",
        body: "Remove this puzzle from your library?",
        buttons: [
          { label: "Delete", primary: true, onClick: () => { remove(id2); populate(); } },
          { label: "Cancel", primary: false }
        ]
      });
      return;
    }
    const item = target.closest(".library-item") as HTMLElement | null;
    if (item && item.dataset.id) {
      const libEntry = get(item.dataset.id);
      if (libEntry) {
        markPlayed(item.dataset.id);
        const parsed = parse(libEntry.puzzleString);
        if (!('error' in parsed)) {
          loadPuzzleFn(parsed.board);
          close();
        }
      }
    }
  };
}

// ─── Save current puzzle ────────────────────────────────────────────────────

function saveCurrent(): void {
  const givens = getGivens();
  const puzzleStr = exportGivensStr(givens);
  if (puzzleStr === "0".repeat(81)) {
    showModal({ title: "Nothing to Save", body: "Load a puzzle first.", buttons: [{ label: "OK", primary: true }] });
    return;
  }
  const path = computePath(givens);
  const diff = analyze(path);
  save({
    puzzleString: puzzleStr,
    source: getPuzzleSource(),
    generatedDifficulty: getCurrentDifficulty(),
    actualDifficulty: diff.label,
    score: diff.score,
    hardestTechnique: diff.hardestTechnique,
    completed: isGameCompleted(),
  });
  if (typeof _closeSettingsDrawer === "function") _closeSettingsDrawer();
  showModal({ title: "Saved! 💾", body: "Puzzle added to your library.", buttons: [{ label: "OK", primary: true }] });
}

export const refresh = populate;

// ─── Event wiring ───────────────────────────────────────────────────────────

export interface LibraryInitConfig {
  getGivens: () => Board;
  getPuzzleSource: () => string;
  getCurrentDifficulty: () => string;
  isGameCompleted: () => boolean;
  loadPuzzle: (board: Board) => void;
}

export function init(config: LibraryInitConfig): void {
  getGivens = config.getGivens;
  getPuzzleSource = config.getPuzzleSource;
  getCurrentDifficulty = config.getCurrentDifficulty;
  isGameCompleted = config.isGameCompleted;
  loadPuzzleFn = config.loadPuzzle;

  const saveBtn = document.getElementById("btn-save-puzzle");
  if (saveBtn) saveBtn.addEventListener("click", saveCurrent);

  const openBtn = document.getElementById("btn-library");
  if (openBtn) openBtn.addEventListener("click", open);

  const closeBtn = document.getElementById("btn-library-close");
  if (closeBtn) closeBtn.addEventListener("click", close);

  const scrim = document.getElementById("library-scrim");
  if (scrim) scrim.addEventListener("click", close);

  ["library-filter-diff", "library-filter-source", "library-sort", "library-filter-fav", "library-filter-unsolved"].forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.addEventListener("change", populate);
  });
}
