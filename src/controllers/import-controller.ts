/**
 * import-controller.ts — Import modal, export, and URL sharing controller.
 */

import { parse, validate, exportGivens as exportGivensStr, generateURL, copyToClipboard } from '../services/import-export';
import { $input, $btn } from '../ui/dom-helpers';
import { showModal, _closeSettingsDrawer } from '../ui/ui';

type Board = number[];

// ─── Injected callbacks ─────────────────────────────────────────────────────

let importPuzzleFn: (board: Board) => void = () => {};
let getGivens: () => Board = () => [];

// ─── Import modal state ─────────────────────────────────────────────────────

let overlay: HTMLElement | null = null;
let input: HTMLInputElement | null = null;
let status: HTMLElement | null = null;
let btnLoad: HTMLButtonElement | null = null;
let pendingBoard: Board | null = null;

// ─── Import modal ───────────────────────────────────────────────────────────

export function open(): void {
  if (overlay) {
    overlay.classList.add("active");
    overlay.setAttribute("aria-hidden", "false");
    if (input) { input.value = ""; input.focus(); }
    if (status) { status.textContent = ""; status.className = "import-status"; }
    if (btnLoad) btnLoad.disabled = true;
    pendingBoard = null;
  }
  if (typeof _closeSettingsDrawer === "function") _closeSettingsDrawer();
}

export function close(): void {
  if (overlay) {
    overlay.classList.remove("active");
    overlay.setAttribute("aria-hidden", "true");
  }
  pendingBoard = null;
}

function validateInput(): void {
  if (!input || !status || !btnLoad) return;
  const result = parse(input.value);
  if ('error' in result) {
    status.textContent = result.error;
    status.className = "import-status error";
    btnLoad.disabled = true;
    pendingBoard = null;
    return;
  }
  const validation = validate(result.board);
  if (!validation.valid) {
    status.textContent = validation.error;
    status.className = "import-status error";
    btnLoad.disabled = true;
    pendingBoard = null;
    return;
  }
  if (!validation.solvable) {
    status.textContent = validation.error;
    status.className = "import-status error";
    btnLoad.disabled = true;
    pendingBoard = null;
    return;
  }
  if (!validation.unique) {
    status.textContent = "⚠️ " + validation.error + " You can still load it.";
    status.className = "import-status warning";
    btnLoad.disabled = false;
    pendingBoard = result.board;
    return;
  }
  status.textContent = "✓ Valid puzzle with a unique solution.";
  status.className = "import-status success";
  btnLoad.disabled = false;
  pendingBoard = result.board;
}

function loadPuzzle(): void {
  if (!pendingBoard) return;
  importPuzzleFn(pendingBoard);
  close();
}

// ─── Export / Share ─────────────────────────────────────────────────────────

function exportGivens(): void {
  const givens = getGivens();
  const puzzleStr = exportGivensStr(givens);
  copyToClipboard(puzzleStr,
    () => { showModal({ title: "Exported!", body: "<code style='font-size:12px;word-break:break-all'>" + puzzleStr + "</code><br><br>Copied to clipboard.", buttons: [{ label: "OK", primary: true }] }); },
    (text) => { prompt("Copy this puzzle string:", text); }
  );
  if (typeof _closeSettingsDrawer === "function") _closeSettingsDrawer();
}

function shareURL(): void {
  const givens = getGivens();
  const url = generateURL(givens);
  copyToClipboard(url,
    () => { showModal({ title: "Link Copied!", body: "Share this link and others will get the same puzzle.", buttons: [{ label: "OK", primary: true }] }); },
    (text) => { prompt("Copy this share link:", text); }
  );
  if (typeof _closeSettingsDrawer === "function") _closeSettingsDrawer();
}

// ─── Event wiring ───────────────────────────────────────────────────────────

export interface ImportInitConfig {
  importPuzzle: (board: Board) => void;
  getGivens: () => Board;
}

export function init(config: ImportInitConfig): void {
  importPuzzleFn = config.importPuzzle;
  getGivens = config.getGivens;

  overlay = document.getElementById("import-overlay");
  input = $input("import-input");
  status = document.getElementById("import-status");
  btnLoad = $btn("import-btn-load");

  const importBtn = document.getElementById("btn-import");
  if (importBtn) importBtn.addEventListener("click", open);

  const cancelBtn = document.getElementById("import-btn-cancel");
  if (cancelBtn) cancelBtn.addEventListener("click", close);

  const validateBtn = document.getElementById("import-btn-validate");
  if (validateBtn) validateBtn.addEventListener("click", validateInput);

  const loadBtn = document.getElementById("import-btn-load");
  if (loadBtn) loadBtn.addEventListener("click", loadPuzzle);

  if (overlay) {
    const ov = overlay;
    ov.addEventListener("click", (e) => { if (e.target === ov) close(); });
  }

  const exportBtn = document.getElementById("btn-export");
  if (exportBtn) exportBtn.addEventListener("click", exportGivens);

  const shareBtn = document.getElementById("btn-share-url");
  if (shareBtn) shareBtn.addEventListener("click", shareURL);
}
