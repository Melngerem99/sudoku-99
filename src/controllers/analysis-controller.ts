/**
 * analysis-controller.ts — Puzzle analysis panel controller.
 */

import { computePath } from '../core/step-solver';
import { analyze } from '../core/difficulty';
import { setText } from '../ui/dom-helpers';
import { _closeSettingsDrawer } from '../ui/ui';

type Board = number[];

// ─── Injected accessors ─────────────────────────────────────────────────────

let getGivens: () => Board = () => [];
let getCurrentDifficulty: () => string = () => "medium";
let getPuzzleSource: () => string = () => "generated";

// ─── Cache ──────────────────────────────────────────────────────────────────

let cache: any = null;
let cacheKey: string | null = null;

export function invalidate(): void {
  cache = null;
  cacheKey = null;
}

// ─── Compute ────────────────────────────────────────────────────────────────

function getCacheKey(): string {
  return getGivens().join("");
}

function compute(): any {
  const key = getCacheKey();
  if (cache && cacheKey === key) return cache;

  const givens = getGivens();
  const path = computePath(givens);
  const diff = analyze(path);

  let totalElim = 0, totalPlace = 0;
  for (let s = 0; s < path.steps.length; s++) {
    if (path.steps[s].placement) totalPlace++;
    totalElim += (path.steps[s].eliminations ? path.steps[s].eliminations.length : 0);
  }

  const firstTech = path.steps.length > 0 ? path.steps[0].technique : "—";
  const lastTech = path.steps.length > 0 ? path.steps[path.steps.length - 1].technique : "—";

  cache = {
    difficultyResult: diff,
    pathResult: path,
    source: getPuzzleSource(),
    generatedDifficulty: getCurrentDifficulty(),
    actualDifficulty: diff.label,
    totalEliminations: totalElim,
    totalPlacements: totalPlace,
    firstTechnique: firstTech,
    lastTechnique: lastTech,
  };
  cacheKey = key;
  return cache;
}

// ─── Panel open / close ─────────────────────────────────────────────────────

let prevFocus: Element | null = null;

export function open(): void {
  const analysis = compute();
  populate(analysis);

  prevFocus = document.activeElement;

  const panel = document.getElementById("analysis-panel");
  const scrim = document.getElementById("analysis-scrim");
  if (panel) { panel.classList.add("open"); panel.setAttribute("aria-hidden", "false"); }
  if (scrim) { scrim.classList.add("visible"); scrim.setAttribute("aria-hidden", "false"); }
  if (typeof _closeSettingsDrawer === "function") _closeSettingsDrawer();

  const closeBtn = document.getElementById("btn-analysis-close");
  if (closeBtn) closeBtn.focus();

  if (typeof console !== "undefined" && console.debug) {
    console.debug("[Analysis]", {
      source: analysis.source,
      score: analysis.difficultyResult.score,
      hardestTechnique: analysis.difficultyResult.hardestTechnique,
      techniqueCounts: analysis.difficultyResult.techniqueCounts,
      stepCount: analysis.difficultyResult.stepCount,
      complete: analysis.pathResult.complete,
    });
  }
}

export function close(): void {
  const panel = document.getElementById("analysis-panel");
  const scrim = document.getElementById("analysis-scrim");
  if (panel) { panel.classList.remove("open"); panel.setAttribute("aria-hidden", "true"); }
  if (scrim) { scrim.classList.remove("visible"); scrim.setAttribute("aria-hidden", "true"); }
  if (prevFocus && (prevFocus as HTMLElement).focus) {
    (prevFocus as HTMLElement).focus();
    prevFocus = null;
  }
}

// ─── Populate ───────────────────────────────────────────────────────────────

function populate(analysis: any): void {
  const d = analysis.difficultyResult;
  const source = analysis.source;

  const genEl = document.getElementById("analysis-generated");
  const actEl = document.getElementById("analysis-actual");
  const mismatchEl = document.getElementById("analysis-mismatch");

  let sourceLabel: string;
  if (source === "imported") sourceLabel = "Imported Puzzle";
  else if (source === "empty") sourceLabel = "Empty Grid";
  else if (source === "daily") {
    const diff = analysis.generatedDifficulty;
    sourceLabel = "Daily " + (diff.charAt(0).toUpperCase() + diff.slice(1));
  } else {
    sourceLabel = analysis.generatedDifficulty.charAt(0).toUpperCase() + analysis.generatedDifficulty.slice(1);
  }

  if (genEl) genEl.textContent = sourceLabel;
  if (actEl) actEl.textContent = d.label;

  if (mismatchEl) {
    const showMismatch = (source === "generated" || source === "daily") &&
      sourceLabel.indexOf(d.label) === -1 && d.label !== sourceLabel;
    if (showMismatch) {
      mismatchEl.textContent = "⚠️ Intended difficulty does not match actual logical difficulty.";
      mismatchEl.style.display = "block";
    } else {
      mismatchEl.style.display = "none";
    }
  }

  setText("analysis-score", d.score);
  setText("analysis-steps", d.stepCount);
  setText("analysis-placements", analysis.totalPlacements);
  setText("analysis-eliminations", analysis.totalEliminations);
  setText("analysis-hardest", d.hardestTechnique);
  setText("analysis-first", analysis.firstTechnique);
  setText("analysis-last", analysis.lastTechnique);
  setText("analysis-complete", analysis.pathResult.complete ? "Yes ✓" : "No (" + analysis.pathResult.stuckAt + " remaining)");
  setText("analysis-guessing", analysis.pathResult.complete ? "No" : "Yes");

  const listEl = document.getElementById("analysis-techniques");
  if (listEl) {
    const counts = d.techniqueCounts;
    const keys = Object.keys(counts);
    const total = d.stepCount || 1;
    keys.sort((a, b) => counts[b] - counts[a]);

    let html = '<table class="analysis-tech-table" role="table" aria-label="Technique breakdown">';
    html += '<thead><tr><th scope="col">Technique</th><th scope="col">Count</th><th scope="col">%</th><th scope="col" aria-hidden="true"></th></tr></thead>';
    html += '<tbody>';
    for (const name of keys) {
      const count = counts[name];
      const pct = Math.round((count / total) * 100);
      html += '<tr>';
      html += '<td class="analysis-tech-name">' + name + '</td>';
      html += '<td class="analysis-tech-count">×' + count + '</td>';
      html += '<td class="analysis-tech-pct">' + pct + '%</td>';
      html += '<td aria-hidden="true"><div class="analysis-tech-bar"><div class="analysis-tech-bar-fill" style="width:' + pct + '%"></div></div></td>';
      html += '</tr>';
    }
    html += '</tbody></table>';
    listEl.innerHTML = html;
  }
}

// ─── Event wiring ───────────────────────────────────────────────────────────

export interface AnalysisInitOpts {
  getGivens: () => Board;
  getCurrentDifficulty: () => string;
  getPuzzleSource: () => string;
}

export function init(opts: AnalysisInitOpts): void {
  getGivens = opts.getGivens;
  getCurrentDifficulty = opts.getCurrentDifficulty;
  getPuzzleSource = opts.getPuzzleSource;

  const analyzeBtn = document.getElementById("btn-analyze");
  if (analyzeBtn) analyzeBtn.addEventListener("click", open);

  const closeBtn = document.getElementById("btn-analysis-close");
  if (closeBtn) closeBtn.addEventListener("click", close);

  const scrim = document.getElementById("analysis-scrim");
  if (scrim) scrim.addEventListener("click", close);
}
