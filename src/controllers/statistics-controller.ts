/**
 * statistics-controller.ts — Statistics panel UI controller.
 */

import { getStats, formatTime, winRate, avgTime, reset } from '../services/statistics';
import { setText } from '../ui/dom-helpers';
import { showModal } from '../ui/ui';

// ─── Panel open / close ─────────────────────────────────────────────────────

export function open(): void {
  refresh();
  const panel = document.getElementById("stats-panel");
  const scrim = document.getElementById("stats-scrim");
  if (panel) { panel.classList.add("open"); panel.setAttribute("aria-hidden", "false"); }
  if (scrim) { scrim.classList.add("visible"); scrim.setAttribute("aria-hidden", "false"); }
  const closeBtn = document.getElementById("btn-stats-close");
  if (closeBtn) closeBtn.focus();
}

export function close(): void {
  const panel = document.getElementById("stats-panel");
  const scrim = document.getElementById("stats-scrim");
  if (panel) { panel.classList.remove("open"); panel.setAttribute("aria-hidden", "true"); }
  if (scrim) { scrim.classList.remove("visible"); scrim.setAttribute("aria-hidden", "true"); }
  const statsBtn = document.getElementById("btn-stats");
  if (statsBtn) statsBtn.focus();
}

// ─── Populate ───────────────────────────────────────────────────────────────

export function refresh(): void {
  const s = getStats();
  let totalWon = 0, totalLost = 0;
  const difficulties = ["easy", "medium", "hard", "expert"];
  for (const d of difficulties) {
    const pd = s.perDifficulty[d];
    totalWon += pd.won;
    totalLost += pd.lost;
    setText("stats-" + d + "-won", pd.won);
    setText("stats-" + d + "-lost", pd.lost);
    setText("stats-" + d + "-best", formatTime(pd.bestTime));
    setText("stats-" + d + "-avg", avgTime(pd.totalWinTime, pd.won));
  }
  const totalGames = totalWon + totalLost;
  setText("stats-total-games", totalGames);
  setText("stats-win-pct", winRate(totalWon, totalLost));
  setText("stats-current-streak", s.currentStreak);
  setText("stats-longest-streak", s.longestStreak);
  setText("stats-total-time", formatTime(s.totalPlayTime));
  setText("stats-hints-used", s.totalHintsUsed);
}

// ─── Event wiring ───────────────────────────────────────────────────────────

export function init(): void {
  const statsBtn = document.getElementById("btn-stats");
  if (statsBtn) statsBtn.addEventListener("click", open);

  const closeBtn = document.getElementById("btn-stats-close");
  if (closeBtn) closeBtn.addEventListener("click", close);

  const scrim = document.getElementById("stats-scrim");
  if (scrim) scrim.addEventListener("click", close);

  const resetBtn = document.getElementById("btn-stats-reset");
  if (resetBtn) {
    resetBtn.addEventListener("click", () => {
      showModal({
        title: "Reset Statistics?",
        body: "This will permanently delete all your game statistics. This cannot be undone.",
        buttons: [
          { label: "Reset", primary: true, onClick: () => { reset(); refresh(); } },
          { label: "Cancel", primary: false }
        ]
      });
    });
  }
}
