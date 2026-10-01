/**
 * daily-controller.ts — Daily challenge panel controller.
 */

import { getHistory, getTodayStatus, getDateKey, getDayNumber, getDifficultyForDate, loadMostRecentProgressBefore } from '../services/daily';
import { setText } from '../ui/dom-helpers';
import { FocusTrap } from '../ui/accessibility';

// ─── Injected callbacks ─────────────────────────────────────────────────────

let startDailyFn: () => void = () => {};
let continueDailyFn: (dateKey: string) => void = () => {};
let trap: FocusTrap | null = null;

// ─── Badge ──────────────────────────────────────────────────────────────────

export function updateBadge(): void {
  const badge = document.getElementById("daily-status-badge");
  if (!badge) return;
  const status = getTodayStatus();
  badge.className = "daily-badge daily-badge-" + status;
  badge.textContent = status === "completed" ? "✓" : status === "in_progress" ? "•" : "";
}

// ─── Panel open / close ─────────────────────────────────────────────────────

export function open(): void {
  populate();
  const panel = document.getElementById("daily-panel");
  const scrim = document.getElementById("daily-scrim");
  if (panel) { panel.classList.add("open"); panel.setAttribute("aria-hidden", "false"); }
  if (scrim) { scrim.classList.add("visible"); scrim.setAttribute("aria-hidden", "false"); }
  if (panel) {
    trap?.deactivate();
    trap = new FocusTrap({ container: panel, onEscape: close, isolateBackground: true, restoreFocus: true });
    trap.activate();
  }
}

export function close(): void {
  const panel = document.getElementById("daily-panel");
  const scrim = document.getElementById("daily-scrim");
  if (panel) { panel.classList.remove("open"); panel.setAttribute("aria-hidden", "true"); }
  if (scrim) { scrim.classList.remove("visible"); scrim.setAttribute("aria-hidden", "true"); }
  trap?.deactivate();
  trap = null;
}

// ─── Populate ───────────────────────────────────────────────────────────────

function populate(): void {
  const history = getHistory();
  const status = getTodayStatus();
  const dateKey = getDateKey();
  const dayNum = getDayNumber(dateKey);
  const difficulty = getDifficultyForDate(dateKey);

  const dayEl = document.getElementById("daily-day-number");
  const diffEl = document.getElementById("daily-difficulty");
  const statusEl = document.getElementById("daily-today-status");
  if (dayEl) dayEl.textContent = "#" + dayNum;
  if (diffEl) diffEl.textContent = difficulty.charAt(0).toUpperCase() + difficulty.slice(1);
  if (statusEl) {
    const statusText: Record<string, string> = { not_started: "Not started", in_progress: "In progress", completed: "Completed ✓" };
    statusEl.textContent = statusText[status] || "";
    statusEl.className = "daily-status daily-status-" + status;
  }

  const continueButton = document.getElementById("btn-daily-continue") as HTMLButtonElement | null;
  const previousProgress = loadMostRecentProgressBefore(dateKey);
  if (continueButton) {
    continueButton.hidden = !previousProgress;
    if (previousProgress) {
      const previousDate = previousProgress.dateKey.split("-").map(Number);
      const labelDate = new Date(Date.UTC(previousDate[0], previousDate[1] - 1, previousDate[2]));
      continueButton.textContent = "Continue " + labelDate.toLocaleDateString(undefined, { month: "short", day: "numeric" }) + " Daily";
      continueButton.dataset.dateKey = previousProgress.dateKey;
    }
  }

  setText("daily-current-streak", history.currentStreak);
  setText("daily-longest-streak", history.longestStreak);

  const calEl = document.getElementById("daily-calendar");
  if (calEl) {
    calEl.innerHTML = "";
    const today = new Date();
    for (let i = 27; i >= 0; i--) {
      const d = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() - i));
      const y = d.getUTCFullYear();
      const mo = String(d.getUTCMonth() + 1).padStart(2, "0");
      const da = String(d.getUTCDate()).padStart(2, "0");
      const key = y + "-" + mo + "-" + da;

      const cell = document.createElement("div");
      cell.className = "daily-cal-cell";
      cell.setAttribute("title", key);
      const statusClass = history.completions[key]
        ? "completed"
        : (key === dateKey && status === "in_progress" ? "in-progress" : "");
      if (statusClass) cell.classList.add(statusClass);
      const statusMap: Record<string, string> = {
        completed: "Completed",
        "in-progress": "In progress",
        "": "Not started"
      };
      const statusLabel = statusMap[statusClass] ?? "Not started";
      const fullDate = d.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
      cell.setAttribute("aria-label", `${fullDate} — ${statusLabel}`);
      cell.textContent = String(d.getUTCDate());
      calEl.appendChild(cell);
    }
  }
}

export const refresh = populate;

// ─── Event wiring ───────────────────────────────────────────────────────────

export interface DailyInitConfig {
  startDaily: () => void;
  continueDaily: (dateKey: string) => void;
}

export function init(config: DailyInitConfig): void {
  startDailyFn = config.startDaily;
  continueDailyFn = config.continueDaily || (() => {});

  const openBtn = document.getElementById("btn-daily");
  if (openBtn) openBtn.addEventListener("click", open);

  const closeBtn = document.getElementById("btn-daily-close");
  if (closeBtn) closeBtn.addEventListener("click", close);

  const playBtn = document.getElementById("btn-daily-play");
  if (playBtn) playBtn.addEventListener("click", () => { close(); startDailyFn(); });

  const continueBtn = document.getElementById("btn-daily-continue");
  if (continueBtn) continueBtn.addEventListener("click", () => {
    const dateKey = (continueBtn as HTMLElement).dataset.dateKey;
    if (dateKey) { close(); continueDailyFn(dateKey); }
  });

  const scrim = document.getElementById("daily-scrim");
  if (scrim) scrim.addEventListener("click", close);

  updateBadge();
}
