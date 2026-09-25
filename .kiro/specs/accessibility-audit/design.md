# Technical Design — Accessibility Initiative

## Overview

This document describes the technical design for achieving WCAG 2.1 AA compliance across
Sudoku-99. It is grounded in the completed requirements.md and the 9 confirmed source-analysis
gaps. It specifies the exact code changes required across all affected files, defines the ARIA
strategy, keyboard model, screen reader announcement design, testing plan, and a phased rollout
with effort estimates.

No implementation is included here — this document drives the tasks.md backlog.

---

---

## Architecture

The accessibility remediation is structured as a cross-cutting concern layered over the existing
three-tier architecture (HTML markup → UI layer → game logic). A new shared module
`src/ui/accessibility.ts` is introduced as the sole new file. All other changes are additive
modifications to existing files.

```
┌─────────────────────────────────────────────────────────────┐
│  web/index.html          — static ARIA markup, meta tags     │
├─────────────────────────────────────────────────────────────┤
│  src/ui/accessibility.ts — NEW: FocusTrap, announce(),       │
│                            setAppAriaHidden()                │
├─────────────────────────────────────────────────────────────┤
│  src/ui/ui.ts            — DOM build, render, panel open/    │
│                            close, modal, focus management    │
├─────────────────────────────────────────────────────────────┤
│  src/controllers/*.ts    — panel lifecycle, badge updates    │
├─────────────────────────────────────────────────────────────┤
│  src/game-controller.ts  — game logic, announcement calls   │
├─────────────────────────────────────────────────────────────┤
│  web/style.css           — touch targets, contrast tokens   │
└─────────────────────────────────────────────────────────────┘
```

---

## Components and Interfaces

### `FocusTrap` class (`src/ui/accessibility.ts`)

```typescript
interface FocusTrapOptions {
  container: HTMLElement;
  onEscape?: () => void;
}

class FocusTrap {
  constructor(opts: FocusTrapOptions);
  activate(): void;   // focuses first element, attaches keydown handler
  deactivate(): void; // removes keydown handler
}
```

Used by: `ui.ts` (hint panel, modal), all panel controllers (settings, stats, daily,
step-solver, analysis, library, import).

### `announce()` function (`src/ui/accessibility.ts`)

```typescript
function announce(msg: string, politeness?: 'assertive' | 'polite'): void;
```

Updates `#sr-announce` (assertive, default) or `#sr-status` (polite) live regions.
Uses `requestAnimationFrame` double-write to force re-announcement of identical strings.

Used by: `game-controller.ts` (digit placement, erase, game end), `ui.ts` (timer).

### `setAppAriaHidden()` function (`src/ui/accessibility.ts`)

```typescript
function setAppAriaHidden(hidden: boolean): void;
```

Sets `aria-hidden` on `#app` when a modal/dialog is open, hiding background content from AT.

---

## Data Models

### Cell ARIA State Model

Each `div.cell[role="gridcell"]` carries the following attributes after every `updateCell` call:

```
aria-label    = "Row {R}, Column {C}: {digit|empty}[, candidates: {d1 d2 ...}]"
aria-selected = "true" | "false"
aria-invalid  = "true"  (present only when conflict; removed otherwise)
aria-readonly = "true"  (present only when isGiven)
tabindex      = "0"     (selected or default cell) | "-1" (all others)
```

### Live Region Registry

| Element ID | `aria-live` | `aria-atomic` | Trigger source |
|-----------|-------------|---------------|----------------|
| `#sr-announce` | `assertive` | `true` | `announce()` from game-controller |
| `#sr-status` | `polite` | `true` | `announce(..., 'polite')` for timer |
| `#mistake-count` | `polite` | `true` | `setMistakes()` in ui.ts (existing) |
| `#difficulty-badge` | `polite` | `true` | native textContent assignment |
| `#hint-technique-name` | `polite` | — | `showHintPanel()` (existing) |
| `#hint-explanation` | `polite` | — | `showHintPanel()` (existing) |
| `#step-explanation` | `polite` | — | step-solver-controller (existing) |
| `#import-status` | `polite` | — | import-controller (existing) |

### Panel Lifecycle State Model

Each panel follows an identical open/close lifecycle:

```
Open:
  1. panel.classList.add("open")
  2. panel.setAttribute("aria-hidden", "false")
  3. scrim.classList.add("visible")
  4. setAppAriaHidden(true)
  5. focusTrap.activate()  → focuses first element

Close:
  1. focusTrap.deactivate()
  2. panel.classList.remove("open")
  3. panel.setAttribute("aria-hidden", "true")
  4. scrim.classList.remove("visible")
  5. setAppAriaHidden(false)
  6. triggerElement.focus()
```

---

## 1. Accessibility Architecture Overview

### 1.1 Accessibility Module Boundaries

The application currently has three distinct layers that affect accessibility:

```
┌─────────────────────────────────────────────────────────────┐
│  web/index.html          — static ARIA markup, meta tags     │
├─────────────────────────────────────────────────────────────┤
│  src/ui/ui.ts            — DOM build, render, panel open/    │
│                            close, modal, focus management    │
├─────────────────────────────────────────────────────────────┤
│  src/controllers/*.ts    — panel lifecycle (open/close/      │
│                            populate), badge updates          │
├─────────────────────────────────────────────────────────────┤
│  src/game-controller.ts  — game logic, keydown wiring,       │
│                            announcement trigger points       │
├─────────────────────────────────────────────────────────────┤
│  web/style.css           — focus rings, reduced-motion,      │
│                            touch targets, contrast tokens    │
└─────────────────────────────────────────────────────────────┘
```

A new thin module will be introduced:

```
src/ui/accessibility.ts   — shared utilities: focus trap,
                            live-region announcer, ARIA state
                            helpers for cells
```

This keeps accessibility concerns from scattering further across game-controller.ts and ui.ts.

---

### 1.2 Keyboard Navigation Model

The page follows a linear Tab order matching visual reading sequence:

```
Header buttons → Stats bar (non-interactive) → Grid (single Tab stop) →
Numpad (toolbar roving tabindex) → Toolbar (toolbar roving tabindex)
```

**Grid tab stop:** The grid receives a single Tab stop. Arrow keys drive intra-grid navigation.
The `tabindex="0"` on each cell is replaced by a roving tabindex: only the selected (or
default first) cell carries `tabindex="0"`, all others carry `tabindex="-1"`. This prevents
users from having to Tab through 81 cells.

**Numpad and Toolbar:** Both sections have `role="toolbar"`. The ARIA toolbar pattern uses
roving tabindex so only one button at a time is in the Tab order. Arrow Left/Right moves within
the toolbar. This already aligns with the current implementation — no structural change needed,
but `tabindex` management must be added.

**Open panels:** When any panel opens, all background content receives `aria-hidden="true"` (or
`inert`) and focus is sent into the panel. Tab/Shift+Tab is constrained within the panel via a
focus trap. When closed, focus is explicitly returned to the trigger element.

---

### 1.3 Focus Management Model

A single reusable `FocusTrap` utility is designed once and applied to all nine panels:

```typescript
// src/ui/accessibility.ts

export interface FocusTrapOptions {
  container: HTMLElement;
  onEscape?: () => void;
}

export class FocusTrap {
  private container: HTMLElement;
  private handler: (e: KeyboardEvent) => void;

  constructor(opts: FocusTrapOptions) { ... }
  activate(): void { /* focus first element, attach keydown */ }
  deactivate(): void { /* remove keydown */ }
}
```

Each panel's `open()` function calls `trap.activate()` after adding the `open` class.
Each panel's `close()` function calls `trap.deactivate()`, removes the `open` class, and
calls `triggerElement.focus()`.

The settings drawer in `ui.ts` already does this correctly (focuses `#btn-settings-close` on
open, returns to `#btn-settings` on close). This pattern is the reference implementation to
replicate for all other panels.

**Panels missing trigger-return focus (confirmed from source):**
- `library-controller.ts` → `close()` does not restore focus
- `step-solver-controller.ts` → `close()` does not restore focus
- `ui.ts` → `hideModal()` does not restore focus
- `ui.ts` → `showHintPanel()` / `hideHintPanel()` — no focus restoration

**Panels already implementing correct focus return:**
- `daily-controller.ts` → `close()` focuses `#btn-daily` ✓
- `statistics-controller.ts` → `close()` focuses `#btn-stats` ✓
- `ui.ts` `closeSettingsDrawer` → focuses `#btn-settings` ✓

---

### 1.4 Screen Reader Support Model

Screen reader support is built on three complementary mechanisms:

**1. Static ARIA markup (index.html):** Roles, labels, and structural semantics declared at
authoring time. These include `role="grid"`, `aria-rowcount`, `aria-colcount`, panel
`aria-label`, `aria-modal`, and `aria-labelledby` attributes.

**2. Dynamic ARIA state (ui.ts → updateCell):** Attributes that change as game state changes —
`aria-label` (cell value), `aria-selected` (selected cell), `aria-invalid` (conflict cells) —
updated on every `updateCell` call.

**3. Live region announcements (accessibility.ts):** Programmatic announcements for events that
have no corresponding DOM change visible to AT — digit placement, mistakes, puzzle completion,
timer summary.

---

### 1.5 Live Region Strategy

Three live regions are designed:

| Region ID | `aria-live` | `aria-atomic` | Purpose |
|-----------|-------------|---------------|---------|
| `#sr-announce` | `"assertive"` | `"true"` | Digit placement, wrong moves, game over |
| `#mistake-count` | `"polite"` | `"true"` | Mistake count updates (already exists) |
| `#sr-status` | `"polite"` | `"false"` | Difficulty badge changes, timer summary |

`#sr-announce` is a new element. It uses `assertive` because digit-placement feedback is
immediate and action-relevant — the user needs to know if they placed the wrong digit without
waiting for the polite queue.

`#timer` is changed from `aria-live="polite"` to `aria-live="off"`. A separate `#sr-status`
polite region announces the elapsed time once per minute via `setInterval`.

`#difficulty-badge` is given `aria-live="polite"` so the "Generating…" and "→ Actual" states
are announced automatically when `textContent` changes.

---

### 1.6 Modal / Dialog Accessibility Strategy

All nine panels use `role="dialog"` and `aria-modal="true"`. The exception — `#hint-panel`
which uses `role="complementary"` — is changed to `role="dialog" aria-modal="true"` because
it (a) overlays all other content, (b) receives focus on open, and (c) has action buttons that
affect game state. `complementary` is semantically incorrect for a modal overlay.

When any panel opens:
1. `aria-hidden="true"` is set on `#app` (the main content wrapper).
2. The panel's `aria-hidden` is set to `"false"`.
3. `FocusTrap.activate()` is called.
4. Focus is sent to the first interactive element inside the panel.

When any panel closes:
1. `aria-hidden` on `#app` is restored to `"false"`.
2. The panel's `aria-hidden` is set to `"true"`.
3. `FocusTrap.deactivate()` is called.
4. Focus is returned to the trigger element.

The `inert` attribute is the modern alternative to `aria-hidden` on background content, but
for maximum browser compatibility, `aria-hidden="true"` on `#app` is used.

---

## 2. Gap-by-Gap Design

### Gap 1 — Cell ARIA state never updated after initial build

**Current behavior:**
`buildGrid` sets `aria-label="Row R, Column C"` at creation time. `updateCell` rebuilds
CSS classes, updates `digitSpan.textContent`, and toggles `.pencil-marks` display — but
never touches any ARIA attribute. A screen reader user cannot determine the cell's current
digit, selected state, or conflict state from AT properties alone.

**Target behavior:**
After every `updateCell` call:
- `aria-label` = `"Row R, Column C: <digit or empty>"` (e.g., `"Row 3, Column 7: 5"`,
  `"Row 3, Column 7: empty"`)
- `aria-selected` = `"true"` when `isSelected`, `"false"` otherwise
- `aria-invalid` = `"true"` when cell index is in the `conflicts` Set, removed otherwise
- `aria-readonly` = `"true"` when `isGiven` (given clues cannot be changed)

**Files affected:**
- `src/ui/ui.ts` → `updateCell` function

**Implementation approach:**
```typescript
// Inside updateCell, after computing val, isGiven, isSelected, conflicts:
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
```

The pencil-mark text appended to `aria-label` addresses Gap 5 simultaneously — when a cell
has candidates, the label reads "Row 3, Column 7: empty, candidates: 1 3 5".

**Risk level:** Low. `updateCell` is called for every cell on every render. Attribute writes
are O(1) DOM operations. No behavioral change — purely additive.

**Testing strategy:**
- Unit test: call `updateCell` with various states, assert `aria-label`, `aria-selected`,
  `aria-invalid` on the cell element.
- Property test: for all i in 0..80, parse label → recover row/col → confirm index round-trip.
- Manual: VoiceOver / NVDA — navigate to a cell, confirm announcement includes value and position.

---

### Gap 2 — No live region for digit-placement announcements

**Current behavior:**
When `placeDigit` is called in `game-controller.ts`, no announcement reaches screen readers.
The only feedback is visual: the digit appears in the cell, and optionally a `wrong` animation
fires. The `#mistake-count` region only announces when a wrong digit is placed, not correct ones.

**Target behavior:**
On every digit placement, `#sr-announce` (assertive live region) is updated with:
- Correct placement: `"5 placed at Row 3, Column 7"`
- Wrong placement: `"Wrong. 5 at Row 3, Column 7. Mistake 2 of 3."`
- Pencil mark add: `"Candidate 5 added at Row 3, Column 7"`
- Pencil mark remove: `"Candidate 5 removed at Row 3, Column 7"`
- Erase: `"Row 3, Column 7 cleared"`
- Puzzle complete: `"Puzzle solved! Time: 04:32. 1 mistake."`
- Game over: `"Game over. 3 mistakes."`

**Files affected:**
- `web/index.html` → add `#sr-announce` element
- `src/ui/accessibility.ts` → `announce(msg: string): void` utility
- `src/game-controller.ts` → call `announce()` in `placeDigit`, `eraseCell`, `endGame`

**Implementation approach:**
```html
<!-- web/index.html — add before </body> -->
<div id="sr-announce"
     role="status"
     aria-live="assertive"
     aria-atomic="true"
     class="sr-only"></div>
```

```typescript
// src/ui/accessibility.ts
let announceEl: HTMLElement | null = null;

export function announce(msg: string): void {
  if (!announceEl) announceEl = document.getElementById("sr-announce");
  if (!announceEl) return;
  // Clear then set — forces re-announcement even if same text
  announceEl.textContent = "";
  requestAnimationFrame(() => { announceEl!.textContent = msg; });
}
```

```typescript
// src/game-controller.ts — inside placeDigit, after board[idx] = digit
const row = Math.floor(idx / 9) + 1;
const col = (idx % 9) + 1;
if (pencilMode) {
  const added = candidates[idx].has(digit);
  announce(`Candidate ${digit} ${added ? "added" : "removed"} at Row ${row}, Column ${col}`);
} else if (!emptyMode && solution[idx] !== 0 && solution[idx] !== digit) {
  announce(`Wrong. ${digit} at Row ${row}, Column ${col}. Mistake ${mistakes} of ${MAX_MISTAKES}.`);
} else {
  announce(`${digit} placed at Row ${row}, Column ${col}`);
}
```

**Risk level:** Low. `announce()` is purely additive. The requestAnimationFrame double-write
pattern is the standard technique to force re-announcement of identical strings.

**Testing strategy:**
- Unit test: spy on `#sr-announce.textContent`, call `placeDigit` with correct/wrong/pencil
  digit, assert text content within 100ms.
- Property test: for all d in 1..9 and sampled i in 0..80, assert announcement fires.
- Manual: NVDA/VoiceOver — place a digit, confirm announcement.

---

### Gap 3 — `#difficulty-badge` has no `aria-live`

**Current behavior:**
`newGame` sets `badge.textContent = "Generating..."`. `computeActualDifficulty` (deferred 100ms)
sets the final label. Neither change is announced to screen readers because `#difficulty-badge`
has no `aria-live` attribute.

**Target behavior:**
All three text states ("Medium", "Generating...", "Medium → Hard") are announced politely
when `textContent` changes.

**Files affected:**
- `web/index.html` → add `aria-live="polite"` and `aria-atomic="true"` to `#difficulty-badge`

**Implementation approach:**
```html
<!-- Before -->
<div id="difficulty-badge" aria-label="Current difficulty">Medium</div>

<!-- After -->
<div id="difficulty-badge"
     aria-live="polite"
     aria-atomic="true"
     aria-label="Current difficulty">Medium</div>
```

No JavaScript changes needed. The existing `badge.textContent` assignments in
`updateDifficultyButtons` and `computeActualDifficulty` will trigger the live region automatically.

**Risk level:** Low. Single HTML attribute addition.

**Testing strategy:**
- Unit test: assert `#difficulty-badge` has `aria-live="polite"` in HTML.
- Manual: VoiceOver — start a new game, confirm "Generating..." then actual difficulty are
  announced.

---

### Gap 4 — Hint Panel uses `role="complementary"` instead of `role="dialog"`

**Current behavior:**
`#hint-panel` is declared as `<aside role="complementary">`. Screen readers do not expect
a focus trap in complementary landmarks, so AT users can Tab out of the panel while it is open.
No `aria-modal` is present, so VoiceOver in browse mode may expose background content.

**Target behavior:**
`#hint-panel` uses `role="dialog" aria-modal="true"`. A focus trap is activated on open and
deactivated on close. Focus returns to `#btn-hint` when dismissed.

**Files affected:**
- `web/index.html` → change role and add aria-modal on `#hint-panel`
- `src/ui/ui.ts` → `showHintPanel` and `hideHintPanel` — add FocusTrap, fix focus restoration
- `src/ui/accessibility.ts` → FocusTrap utility (new)

**Implementation approach:**
```html
<!-- Before -->
<aside id="hint-panel" aria-hidden="true" aria-label="Hint details" role="complementary">

<!-- After -->
<aside id="hint-panel"
       aria-hidden="true"
       aria-label="Hint details"
       role="dialog"
       aria-modal="true">
```

```typescript
// src/ui/ui.ts — showHintPanel
import { FocusTrap, announce } from './accessibility';
let hintTrap: FocusTrap | null = null;

function showHintPanel(hintResult: HintResultLike): void {
  // ... existing content setup ...
  panel.classList.add("open");
  panel.setAttribute("aria-hidden", "false");
  document.getElementById("app")?.setAttribute("aria-hidden", "true");

  hintTrap = new FocusTrap({
    container: panel,
    onEscape: () => { hideHintPanel(); emit("hintClose"); }
  });
  hintTrap.activate();
}

function hideHintPanel(): void {
  hintTrap?.deactivate();
  hintTrap = null;
  panel.classList.remove("open");
  panel.setAttribute("aria-hidden", "true");
  document.getElementById("app")?.setAttribute("aria-hidden", "false");
  document.getElementById("btn-hint")?.focus();
}
```

**Risk level:** Medium. Changing `role="complementary"` to `role="dialog"` changes AT
virtual-cursor behavior. Requires testing with VoiceOver, NVDA, and JAWS to confirm no
regression in hint content reading.

**Testing strategy:**
- Automated: assert `#hint-panel` has `role="dialog"` and `aria-modal="true"`.
- Focus trap test: open hint panel, Tab from last button → focus moves to first button (not body).
- Escape test: open panel, press Escape → panel closes, focus returns to `#btn-hint`.
- Manual: VoiceOver — open hint panel, confirm description is announced, buttons are reachable.

---

### Gap 5 — Pencil mark spans have no accessible text

**Current behavior:**
`.mark` spans are visible children of `.pencil-marks`. Each `span.mark` has `data-digit`
and its `textContent` is set to the digit string when active, or `""` when inactive.
Screen readers read the `.pencil-marks` container as an undifferentiated group of text nodes.
A cell with candidates 1, 3, 5 active reads as "1 3 5" with no context, immediately after
the cell's `aria-label`.

**Target behavior:**
The pencil-mark state is communicated via the cell `aria-label` (addressed in Gap 1):
`"Row 3, Column 7: empty, candidates: 1 3 5"`.
The `.pencil-marks` container and individual `.mark` spans are hidden from the AT tree
with `aria-hidden="true"`, so they do not double-announce.

**Files affected:**
- `web/index.html` → n/a (marks are built dynamically)
- `src/ui/ui.ts` → `buildGrid`: add `aria-hidden="true"` to `.pencil-marks` container and
  each `.mark` span at build time

**Implementation approach:**
```typescript
// src/ui/ui.ts — buildGrid
const marks = document.createElement("div");
marks.className = "pencil-marks";
marks.setAttribute("aria-hidden", "true");   // ← ADD

for (let d = 1; d <= 9; d++) {
  const m = document.createElement("span");
  m.className = "mark";
  m.dataset.digit = String(d);
  m.setAttribute("aria-hidden", "true");     // ← ADD (redundant but explicit)
  marks.appendChild(m);
}
```

The cell `aria-label` (Gap 1) then carries all candidate information. No visible change.

**Risk level:** Low. Adding `aria-hidden` to purely visual sub-elements.

**Testing strategy:**
- Unit test: after `buildGrid`, assert every `.pencil-marks` has `aria-hidden="true"`.
- Unit test: after `updateCell` with candidates `{1,3,5}`, assert `aria-label` contains
  "candidates: 1 3 5".
- Manual: VoiceOver — navigate to cell with pencil marks, confirm no double-announcement.

---

### Gap 6 — Daily calendar cells have no `aria-label`

**Current behavior:**
`daily-controller.ts → populate` creates each `.daily-cal-cell` with `cell.setAttribute("title", key)`
and class-based coloring (`.completed`, `.in-progress`). No `aria-label` is set. Screen readers
receive the day-of-month number as text content with no date or status context.

**Target behavior:**
Each calendar cell has an `aria-label` encoding date and status:
- `"August 10, 2026 — Completed"`
- `"August 13, 2026 — In progress"`
- `"August 5, 2026 — Not started"`

**Files affected:**
- `src/controllers/daily-controller.ts` → `populate` function

**Implementation approach:**
```typescript
// src/controllers/daily-controller.ts — inside populate, cell creation
const statusMap: Record<string, string> = {
  completed: "Completed",
  "in-progress": "In progress",
  "": "Not started"
};
const statusClass = history.completions[key]
  ? "completed"
  : (key === dateKey && status === "in_progress" ? "in-progress" : "");
const statusLabel = statusMap[statusClass] || "Not started";

// Format date for accessibility (e.g., "August 10, 2026")
const fullDate = d.toLocaleDateString(undefined, {
  year: "numeric", month: "long", day: "numeric"
});
cell.setAttribute("aria-label", `${fullDate} — ${statusLabel}`);
```

**Risk level:** Low. Additive attribute only.

**Testing strategy:**
- Unit test: render calendar, assert every `.daily-cal-cell` has non-empty `aria-label`
  matching pattern `"<month> <day>, <year> — <status>"`.
- Manual: VoiceOver — open Daily panel, navigate calendar, confirm date + status announced.

---

### Gap 7 — Drawer close buttons are 32×32 px (below 44×44 px minimum)

**Current behavior:**
All drawer close buttons (e.g., `#btn-settings-close`) have `width: 32px; height: 32px` in
`style.css`. This applies to Settings, Stats, Daily, Step Solver, Analysis, Library, and Hint
close buttons. The 32×32 px size is 12 px below the WCAG 2.5.5 minimum.

**Target behavior:**
All close buttons have an effective touch target of ≥ 44×44 CSS pixels. The visual size
can remain 32×32 px (to preserve the header layout), but a transparent padding or negative-margin
expansion brings the tappable area to 44×44 px.

**Files affected:**
- `web/style.css` → close button rules

**Implementation approach:**
The cleanest technique for preserving layout while expanding touch target is transparent
padding with overflow:visible, or a ::after pseudo-element:

```css
/* style.css — replace existing close button size rule */

/* All drawer / panel close buttons share this pattern */
#btn-settings-close,
#btn-stats-close,
#btn-daily-close,
#btn-step-close,
#btn-analysis-close,
#btn-library-close,
#hint-close {
  position: relative;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: var(--btn-bg);
  color: var(--btn-text);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
}

/* Transparent touch expansion — does not affect layout */
#btn-settings-close::before,
#btn-stats-close::before,
#btn-daily-close::before,
#btn-step-close::before,
#btn-analysis-close::before,
#btn-library-close::before,
#hint-close::before {
  content: "";
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 44px;
  height: 44px;
  border-radius: 50%;
  /* Invisible — for touch target only */
}
```

For `.library-item-btn` (28×28 px), the same `::before` technique expands to 44×44 px.

**Risk level:** Low. Visual appearance unchanged. `::before` expansion does not affect layout flow.

**Testing strategy:**
- Automated: render at 375px viewport, assert `getComputedStyle` or `getBoundingClientRect`
  of each close button (including pseudo-element) ≥ 44×44.
- Manual: iOS Safari — tap close buttons at edge of hitbox, confirm reliable dismissal.

---

### Gap 8 — Digit badge span creates confusing button accessible name

**Current behavior:**
`buildDigitButtons` creates each numpad button as:
```html
<button aria-label="Digit 5"><span class="digit-badge" id="badge-5">3</span></button>
```
The explicit `aria-label="Digit 5"` overrides the computed accessible name, so the badge
text "3" is NOT included in the button name. Screen readers announce "Digit 5" and the badge
"3" is read separately as unnamed text content. When the digit is complete, `digit-complete`
class reduces opacity — no non-color indicator.

**Target behavior:**
- The badge span is hidden from AT with `aria-hidden="true"` (it is a visual convenience, not
  essential AT information).
- The button `aria-label` is updated dynamically to include remaining count:
  `"Digit 5, 3 remaining"` or `"Digit 5, complete"`.

**Files affected:**
- `src/ui/ui.ts` → `buildDigitButtons`: add `aria-hidden="true"` to badge span
- `src/ui/ui.ts` → `setDigitCounts`: update button `aria-label` with count

**Implementation approach:**
```typescript
// buildDigitButtons
const badge = document.createElement("span");
badge.className = "digit-badge";
badge.id = `badge-${d}`;
badge.setAttribute("aria-hidden", "true");   // ← ADD

// setDigitCounts
const remaining = 9 - counts[d];
badge.textContent = remaining > 0 ? String(remaining) : "";
const btn = badge.closest(".digit-btn") as HTMLElement | null;
if (btn) {
  btn.classList.toggle("digit-complete", remaining === 0);
  // Update accessible name to include count
  btn.setAttribute("aria-label",
    remaining > 0 ? `Digit ${d}, ${remaining} remaining` : `Digit ${d}, complete`
  );
}
```

**Risk level:** Low. The `aria-label` override already controls the announced name.

**Testing strategy:**
- Unit test: call `setDigitCounts` with board where 6 fives are placed, assert button for "5"
  has `aria-label="Digit 5, 3 remaining"`.
- Unit test: call `setDigitCounts` with board where all 9 fives placed, assert
  `aria-label="Digit 5, complete"`.
- Manual: VoiceOver — navigate numpad, confirm announced name includes count.

---

### Gap 9 — `#btn-dark` icon rendered via CSS `::before` only

**Current behavior:**
`#btn-dark` has no text content. Its icon is rendered via:
```css
#btn-dark::before       { content: "🌙"; }
html.dark #btn-dark::before { content: "☀️"; }
```
CSS pseudo-element content is not in the DOM and is not accessible to AT. The button has
`aria-label="Toggle dark mode"` which provides an accessible name, satisfying WCAG 4.1.2.
However, `aria-pressed` is set on initialization but never updated when `toggleDarkMode` runs
imperatively via `document.documentElement.classList.toggle`.

**Target behavior:**
- `aria-pressed` is kept in sync with the actual dark-mode state on every toggle.
- The existing `aria-label="Toggle dark mode"` is sufficient for WCAG 2.5.3.
- The `aria-pressed` update in `toggleDarkMode` already exists in `ui.ts` — this gap is
  a partial pass. The only fix needed is confirming the `aria-pressed` update fires reliably.

**Files affected:**
- `src/ui/ui.ts` → `toggleDarkMode` and `initDarkMode` — verify `aria-pressed` is set

**Implementation approach:**
```typescript
// toggleDarkMode — already correct, verify:
const btn = document.getElementById("btn-dark");
if (btn) btn.setAttribute("aria-pressed", String(isDark));

// initDarkMode — already correct, verify:
if (btn) btn.setAttribute("aria-pressed", String(prefersDark));
```

The existing code already does this. The gap is classified as a low-risk verification item,
not a code change. The design calls for a regression test to lock in this behavior.

**Risk level:** Very low. Verification only.

**Testing strategy:**
- Unit test: call `toggleDarkMode`, assert `#btn-dark` has `aria-pressed="true"`, call again,
  assert `aria-pressed="false"`.
- Unit test: call `initDarkMode` with localStorage `"sudoku-dark"="1"`, assert `aria-pressed="true"`.

---

## 3. Code Impact Analysis

### 3.1 `web/index.html`
| Change | Gap | Notes |
|--------|-----|-------|
| Add `aria-live="polite" aria-atomic="true"` to `#difficulty-badge` | 3 | One attribute |
| Change `#hint-panel` `role="complementary"` → `role="dialog" aria-modal="true"` | 4 | Role change |
| Add `<div id="sr-announce" ...>` before `</body>` | 2 | New element |
| Add `<div id="sr-status" ...>` before `</body>` | Timer | New element |

### 3.2 `src/ui/ui.ts`
| Change | Gap | Scope |
|--------|-----|-------|
| `updateCell`: add 4 `setAttribute` calls | 1 | Medium — inside hot render path |
| `buildGrid`: add `aria-hidden="true"` to `.pencil-marks` and `.mark` | 5 | Small |
| `buildDigitButtons`: add `aria-hidden="true"` to badge span | 8 | Small |
| `setDigitCounts`: update `aria-label` on each digit button | 8 | Small |
| `showHintPanel` / `hideHintPanel`: add FocusTrap, fix focus return | 4 | Medium |
| `setTimer`: change `#timer` to `aria-live="off"`, update `#sr-status` at 60s | Timer | Small |
| Import and use `announce` from `accessibility.ts` | 2 | Small |

### 3.3 `src/ui/accessibility.ts` (new file)
| Export | Used by |
|--------|---------|
| `class FocusTrap` | `ui.ts`, all controller open/close methods |
| `function announce(msg)` | `game-controller.ts`, `ui.ts` |
| `function setAppAriaHidden(hidden)` | `ui.ts`, all controller open/close methods |

### 3.4 `src/game-controller.ts`
| Change | Gap | Scope |
|--------|-----|-------|
| Import `announce` from `accessibility.ts` | 2 | Trivial |
| Call `announce()` in `placeDigit` (correct, wrong, pencil) | 2 | Small |
| Call `announce()` in `eraseCell` | 2 | Small |
| Call `announce()` in `endGame` (win/loss messages) | 2 | Small |

### 3.5 `src/controllers/daily-controller.ts`
| Change | Gap | Scope |
|--------|-----|-------|
| `populate`: add `aria-label` to each `.daily-cal-cell` | 6 | Small |
| `close`: already restores focus correctly ✓ | — | No change needed |

### 3.6 `src/controllers/library-controller.ts`
| Change | Gap | Scope |
|--------|-----|-------|
| `close`: add `document.getElementById("btn-library")?.focus()` | Focus | Small |
| `open`: add `setAppAriaHidden(true)` | Modal | Small |
| `close`: add `setAppAriaHidden(false)` | Modal | Small |
| `populate`: add FocusTrap integration | Focus | Medium |

### 3.7 `src/controllers/step-solver-controller.ts`
| Change | Gap | Scope |
|--------|-----|-------|
| `close`: add `document.getElementById("btn-step-solve")?.focus()` | Focus | Small |
| `open` / `close`: add FocusTrap | Focus | Medium |
| After auto-play complete: focus `#step-btn-play` | Focus | Small |

### 3.8 `web/style.css`
| Change | Gap | Scope |
|--------|-----|-------|
| Add `::before` touch expansion for all close buttons | 7 | Small |
| Add `::before` touch expansion for `.library-item-btn` | 7 | Small |
| Change `#timer` `aria-live` (handled in HTML, no CSS change) | Timer | — |

---

## 4. ARIA Design

### 4.1 Cell ARIA Attribute Specification

```
div.cell[role="gridcell"]
  aria-label     = "Row {R}, Column {C}: {value|empty}[, candidates: {sorted digits}]"
  aria-selected  = "true" | "false"
  aria-invalid   = "true"  (present only when conflict)
  aria-readonly  = "true"  (present only when given)
  tabindex       = "0" (selected/default cell) | "-1" (all others)
```

### 4.2 Live Region Map

```
#sr-announce    aria-live="assertive"  aria-atomic="true"   class="sr-only"
  → Updated by: announce() in game-controller.ts
  → Triggers: digit placed, wrong digit, erase, puzzle won/lost

#mistake-count  aria-live="polite"     aria-atomic="true"   class="sr-only"
  → Updated by: setMistakes() in ui.ts  (already works)
  → Triggers: mistake count changes

#sr-status      aria-live="polite"     aria-atomic="false"  class="sr-only"
  → Updated by: 60-second timer interval, difficulty badge change fallback
  → Triggers: every 60 seconds with "Elapsed: MM:SS"

#difficulty-badge  aria-live="polite"  aria-atomic="true"
  → Updated by: existing textContent assignments (no code change)
  → Triggers: "Generating…", final difficulty label

#hint-technique-name  aria-live="polite"  (already present)
#hint-explanation     aria-live="polite"  (already present)
#step-explanation     aria-live="polite"  (already present)
#step-counter         aria-live="polite"  (already present)
```

### 4.3 Panel ARIA Semantics

| Panel | role | aria-modal | Accessible Name Source |
|-------|------|-----------|------------------------|
| `#hint-panel` | `dialog` | `true` | `aria-label="Hint details"` |
| `#settings-drawer` | `dialog` | `true` | `aria-label="Settings"` |
| `#stats-panel` | `dialog` | `true` | `aria-label="Player statistics"` |
| `#daily-panel` | `dialog` | `true` | `aria-label="Daily challenge"` |
| `#step-solver-panel` | `dialog` | `true` | `aria-label="Step-by-step solver"` |
| `#analysis-panel` | `dialog` | `true` | `aria-labelledby="analysis-panel-title"` |
| `#library-panel` | `dialog` | `true` | `aria-labelledby="library-panel-title"` |
| `#import-overlay` | `dialog` | `true` | `aria-labelledby="import-title"` |
| `#modal-overlay` | `dialog` | `true` | `aria-labelledby="modal-title"` |

### 4.4 Focus Restoration Map

| Panel | Open — focus sent to | Close — focus returned to |
|-------|---------------------|--------------------------|
| `#hint-panel` | `#hint-btn-dismiss` | `#btn-hint` |
| `#settings-drawer` | `#btn-settings-close` | `#btn-settings` ✓ (already) |
| `#stats-panel` | `#btn-stats-close` | `#btn-stats` ✓ (already) |
| `#daily-panel` | `#btn-daily-close` | `#btn-daily` ✓ (already) |
| `#step-solver-panel` | `#btn-step-close` | `#btn-step-solve` (missing — add) |
| `#analysis-panel` | `#btn-analysis-close` | `#btn-analyze` (missing — add) |
| `#library-panel` | `#btn-library-close` | `#btn-library` (missing — add) |
| `#import-overlay` | `#import-btn-cancel` | `#btn-import` (missing — add) |
| `#modal-overlay` | first `.btn` in footer | trigger button (missing — add) |

---

## 5. Keyboard Design

### 5.1 Tab Order

```
[Tab]  #btn-daily → #btn-stats → #btn-settings → #btn-dark
       → #sudoku-grid (single stop, roving tabindex)
       → #numpad (toolbar, roving tabindex, first enabled button)
       → #toolbar (toolbar, roving tabindex, first button)
```

Stats bar elements (`#timer`, `#difficulty-badge`, mistake pips) are non-interactive —
they remain out of the Tab order (no `tabindex`).

### 5.2 Grid Roving Tabindex

On initial build, cell 0 gets `tabindex="0"`, all others `tabindex="-1"`.
On `selectCell(idx)`: set `cells[idx].tabindex = "0"`, set `cells[previousIdx].tabindex = "-1"`.

Arrow key navigation calls `cells[newIdx].focus()` directly, keeping roving tabindex in sync.

### 5.3 Arrow Key Behavior (Grid)

```
ArrowRight : i+1 ≤ 80 → go to i+1;  else stay (no wrap)
ArrowLeft  : i-1 ≥ 0  → go to i-1;  else stay (no wrap)
ArrowDown  : i+9 ≤ 80 → go to i+9;  else stay
ArrowUp    : i-9 ≥ 0  → go to i-9;  else stay
```

Current implementation already matches this spec. No change needed to navigation logic,
only the tabindex management needs to be added.

### 5.4 FocusTrap Implementation

```typescript
// src/ui/accessibility.ts

const FOCUSABLE = [
  'a[href]', 'button:not([disabled])', 'input:not([disabled])',
  'select:not([disabled])', 'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])'
].join(', ');

export class FocusTrap {
  private container: HTMLElement;
  private onEscape?: () => void;
  private handler: (e: KeyboardEvent) => void;

  constructor({ container, onEscape }: FocusTrapOptions) {
    this.container = container;
    this.onEscape = onEscape;
    this.handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); this.onEscape?.(); return; }
      if (e.key !== 'Tab') return;
      const focusable = Array.from(
        this.container.querySelectorAll<HTMLElement>(FOCUSABLE)
      ).filter(el => !el.closest('[aria-hidden="true"]'));
      if (focusable.length === 0) { e.preventDefault(); return; }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey) {
        if (document.activeElement === first) { e.preventDefault(); last.focus(); }
      } else {
        if (document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };
  }

  activate(): void {
    this.container.addEventListener('keydown', this.handler);
    const focusable = Array.from(
      this.container.querySelectorAll<HTMLElement>(FOCUSABLE)
    );
    if (focusable.length > 0) focusable[0].focus();
  }

  deactivate(): void {
    this.container.removeEventListener('keydown', this.handler);
  }
}
```

### 5.5 Escape Key Handling

The global `keydown` handler in `ui.ts` already calls `hideHint()`, `hideModal()`, and
clicks close buttons for each panel on Escape. This behavior is preserved. The FocusTrap
`onEscape` callback is an additional layer that ensures the same action fires even when focus
is within the panel (which the global handler might not catch if focus is on a button).

To avoid double-firing, the FocusTrap `onEscape` handler calls the same close function that
the close button calls — idempotency is required (`hideHintPanel` must be safe to call twice).

---

## 6. Screen Reader Design

### 6.1 Cell Announcement Format

When a user navigates to a cell (via arrow key or Tab), the cell's `aria-label` is announced:

| Cell state | Announced text |
|------------|---------------|
| Empty, unselected | `"Row 3, Column 7: empty"` |
| Empty with candidates 1,3,5 | `"Row 3, Column 7: empty, candidates: 1 3 5"` |
| Given digit 5 | `"Row 3, Column 7: 5"` (also aria-readonly communicated) |
| User digit 5 | `"Row 3, Column 7: 5"` |
| Conflict digit 5 | `"Row 3, Column 7: 5"` (aria-invalid triggers "invalid" in most SRs) |
| Selected | `aria-selected="true"` — most SRs prefix "selected" |

### 6.2 Digit Placement Announcement Format

Announced via `#sr-announce` (assertive) immediately after `placeDigit`:

| Action | Announcement |
|--------|-------------|
| Correct digit placed | `"5 placed at Row 3, Column 7"` |
| Wrong digit | `"Wrong. 5 at Row 3, Column 7. Mistake 2 of 3."` |
| Pencil mark added | `"Candidate 5 added at Row 3, Column 7"` |
| Pencil mark removed | `"Candidate 5 removed at Row 3, Column 7"` |
| Cell erased | `"Row 3, Column 7 cleared"` |

### 6.3 Puzzle-Complete Announcements

```
Win:  "Puzzle solved! Time: 04:32. 1 mistake."
      (followed by modal which is announced normally via dialog role)

Loss: "Game over. 3 mistakes."
      (followed by modal)
```

Both are announced via `#sr-announce` (assertive) before `showModal` is called,
ensuring the announcement is not swallowed by the dialog focus change.

### 6.4 Statistics Updates

Statistics panel content is populated before the panel opens. No live region is needed —
the panel's `role="dialog"` causes SRs to read the visible content on focus entry.

### 6.5 Error Announcements

| Scenario | Mechanism |
|----------|-----------|
| Wrong digit | `#sr-announce`: "Wrong. N at Row R, Col C. Mistake M of 3." |
| 3 mistakes (game over) | `#sr-announce`: "Game over. 3 mistakes." then modal |
| Import validation fail | `#import-status` already has `aria-live="polite"` ✓ |
| No hint available | Modal with `role="dialog"` — announced on focus ✓ |
| No solution | Modal — same ✓ |

### 6.6 Timer Strategy

```
Before: #timer aria-live="polite" → announces every second (broken)

After:
  #timer: aria-live="off" (or remove aria-live entirely)
  
  In startTimer():
    setInterval(() => {
      timerSeconds++;
      setTimer(timerSeconds);  // updates #timer visually (no SR announcement)
      if (timerSeconds % 60 === 0) {
        const m = Math.floor(timerSeconds / 60);
        announce(`Elapsed: ${m} minute${m !== 1 ? "s" : ""}.`, "polite");
      }
    }, 1000);
```

The `announce` function is extended with an optional `politeness` parameter:
```typescript
export function announce(msg: string, politeness: "assertive"|"polite" = "assertive"): void
```

For polite announcements, `#sr-status` is used instead of `#sr-announce`.

---

## 7. Accessibility Testing Plan

### 7.1 Automated Tests (Vitest)

| Requirement | Test file | What to test |
|-------------|-----------|-------------|
| Req 1 (Keyboard) | `tests/accessibility/keyboard.test.ts` | Arrow nav boundaries (PBT), tabindex management |
| Req 2 (Screen Reader) | `tests/accessibility/aria.test.ts` | Cell aria-label round-trip, aria-selected, aria-invalid |
| Req 2 (Announcements) | `tests/accessibility/announcements.test.ts` | #sr-announce content after placeDigit |
| Req 3 (Contrast) | `tests/accessibility/contrast.test.ts` | All CSS variable pairs ≥ 4.5:1 / 3:1 |
| Req 4 (Touch) | `tests/accessibility/touch-targets.test.ts` | offsetWidth/Height ≥ 44px at 375px viewport |
| Req 6 (PBT Keyboard) | `tests/accessibility/keyboard-pbt.test.ts` | fast-check all 81 cells × 4 directions |
| Req 7 (PBT Announce) | `tests/accessibility/announce-pbt.test.ts` | fast-check all 729 digit/cell combos |
| Req 8 (PBT Contrast) | `tests/accessibility/contrast-pbt.test.ts` | symmetry, identity, dark override coverage |
| Req 9 (PBT Touch) | `tests/accessibility/touch-pbt.test.ts` | 7 viewport widths × all controls |

### 7.2 Manual Tests (Checklist)

Each section of `AUDIT-CHECKLIST.md` maps to a manual test session:

| Session | Tool | Duration |
|---------|------|---------|
| Keyboard navigation audit | Chrome + keyboard only | 1h |
| Screen reader — macOS | VoiceOver + Safari | 1.5h |
| Screen reader — Windows | NVDA + Chrome | 1.5h |
| Color contrast — light theme | axe DevTools or manual WCAG calc | 0.5h |
| Color contrast — dark theme | axe DevTools or manual WCAG calc | 0.5h |
| Touch targets | Chrome DevTools device emulation (375px) | 0.5h |
| Focus trap testing | Keyboard + all 9 panels | 1h |

### 7.3 Acceptance Criteria per Requirement

| Req | Automated AC | Manual AC |
|-----|-------------|-----------|
| Req 1 | PBT: 0 failures for all 81×4 arrow combos; focus trap tests pass | All 9 panels pass checklist 1E |
| Req 2 | aria-label round-trip: 0 failures; announcement tests: 0 failures | NVDA/VoiceOver confirms digit announcements |
| Req 3 | 0 contrast pairs below 4.5:1 (text) or 3:1 (UI components) | axe DevTools: 0 contrast errors |
| Req 4 | 0 controls < 44px at any of 7 test viewports | iOS Safari: close buttons reliably tappable |
| Req 5 | n/a (report format) | Findings report generated and reviewed |
| Req 6 | All PBT keyboard properties pass | n/a |
| Req 7 | All PBT announcement properties pass | n/a |
| Req 8 | Contrast symmetry + identity properties pass; dark overrides pass | n/a |
| Req 9 | Touch target PBT: 0 failures across 7 viewports | n/a |

---

## 8. Rollout Strategy

### Phase 1 — Quick Wins (Est. 3–4h total)

High/Medium severity, Small effort. Zero risk of regression.

| Item | Gap | Effort | Files |
|------|-----|--------|-------|
| Add `aria-live` to `#difficulty-badge` | 3 | 0.25h | index.html |
| Add `#sr-announce` region to HTML | 2 (prep) | 0.25h | index.html |
| Add `aria-hidden="true"` to `.pencil-marks` and `.mark` spans | 5 | 0.5h | ui.ts |
| Add `aria-hidden="true"` to digit badge span | 8 | 0.25h | ui.ts |
| Update `aria-label` in `setDigitCounts` | 8 | 0.5h | ui.ts |
| Add `aria-label` to daily calendar cells | 6 | 0.5h | daily-controller.ts |
| Verify `#btn-dark` `aria-pressed` is kept in sync | 9 | 0.25h | ui.ts (verify) |
| Touch target expansion via `::before` for close buttons | 7 | 0.75h | style.css |
| Touch target expansion for `.library-item-btn` | 7 | 0.5h | style.css |

---

### Phase 2 — Screen Reader Core (Est. 4–6h total)

Medium complexity, high AT user impact.

| Item | Gap | Effort | Files |
|------|-----|--------|-------|
| `updateCell`: add `aria-label`, `aria-selected`, `aria-invalid`, `aria-readonly` | 1 | 2h | ui.ts |
| `game-controller.ts`: call `announce()` in `placeDigit`, `eraseCell`, `endGame` | 2 | 2h | game-controller.ts |
| Write `accessibility.ts` with `announce()` utility | 2 | 1h | accessibility.ts (new) |
| Fix timer: change to `aria-live="off"`, add 60s polite announcement | Timer | 1h | index.html, ui.ts |

---

### Phase 3 — Focus Management (Est. 5–7h total)

Medium risk. Requires testing with multiple AT tools.

| Item | Gap | Effort | Files |
|------|-----|--------|-------|
| Write `FocusTrap` class in `accessibility.ts` | 4 | 2h | accessibility.ts |
| Apply FocusTrap to Hint Panel + fix role + fix focus return | 4 | 1.5h | ui.ts, index.html |
| Fix focus return in `library-controller.ts` close | Focus | 0.5h | library-controller.ts |
| Fix focus return in `step-solver-controller.ts` close + after autoplay | Focus | 0.5h | step-solver-controller.ts |
| Fix focus return in `hideModal` (track trigger element) | Focus | 1h | ui.ts |
| Apply `setAppAriaHidden` to all panel open/close | Modal | 1h | ui.ts + controllers |

---

### Phase 4 — Color and Visual (Est. 3–4h total)

Low risk. CSS-only changes except color-only state gaps.

| Item | Gap | Effort | Files |
|------|-----|--------|-------|
| Measure and fix pencil mark contrast (likely: increase `--cell-pencil` luminance) | Contrast | 1h | style.css |
| Add non-color indicator to `digit-complete` state (strikethrough or `disabled`) | 6 (color) | 1h | style.css, ui.ts |
| Verify conflict cell non-color indicator (text color change sufficient or add icon) | Contrast | 0.5h | style.css |
| Verify all 22 contrast pairs in both themes; fix any failures | Contrast | 1.5h | style.css |

---

### Phase 5 — Grid Roving Tabindex (Est. 2h total)

Low risk. Improves keyboard UX significantly for all users.

| Item | Effort | Files |
|------|--------|-------|
| Implement roving tabindex in `buildGrid` and `selectCell` | 1.5h | ui.ts |
| Update arrow-key handlers to call `.focus()` on target cell | 0.5h | ui.ts |

---

### Effort Summary

| Phase | Description | Estimated effort |
|-------|-------------|-----------------|
| Phase 1 | Quick wins | 3–4h |
| Phase 2 | Screen reader core | 4–6h |
| Phase 3 | Focus management | 5–7h |
| Phase 4 | Color and visual | 3–4h |
| Phase 5 | Grid roving tabindex | 2h |
| **Total** | | **17–23h** |

---

## 9. New File: `src/ui/accessibility.ts`

This file is the sole new source file introduced by this initiative.

```typescript
/**
 * accessibility.ts — Shared accessibility utilities.
 *
 * Exports:
 *   FocusTrap     — keyboard focus trapping for dialogs
 *   announce      — assertive / polite live region announcer
 *   setAppAriaHidden — toggle aria-hidden on #app for modal layering
 */

// ─── Constants ───────────────────────────────────────────────────────────────

const FOCUSABLE_SELECTORS = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

// ─── Focus Trap ──────────────────────────────────────────────────────────────

export interface FocusTrapOptions {
  container: HTMLElement;
  onEscape?: () => void;
}

export class FocusTrap {
  private container: HTMLElement;
  private onEscape?: () => void;
  private boundHandler: (e: KeyboardEvent) => void;

  constructor({ container, onEscape }: FocusTrapOptions) {
    this.container = container;
    this.onEscape = onEscape;
    this.boundHandler = this._handleKeydown.bind(this);
  }

  private _focusable(): HTMLElement[] {
    return Array.from(
      this.container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTORS)
    ).filter(el => getComputedStyle(el).display !== 'none');
  }

  private _handleKeydown(e: KeyboardEvent): void {
    if (e.key === 'Escape') {
      e.preventDefault();
      this.onEscape?.();
      return;
    }
    if (e.key !== 'Tab') return;
    const focusable = this._focusable();
    if (focusable.length === 0) { e.preventDefault(); return; }
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (e.shiftKey) {
      if (document.activeElement === first) { e.preventDefault(); last.focus(); }
    } else {
      if (document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  }

  activate(): void {
    this.container.addEventListener('keydown', this.boundHandler);
    const focusable = this._focusable();
    if (focusable.length > 0) focusable[0].focus();
  }

  deactivate(): void {
    this.container.removeEventListener('keydown', this.boundHandler);
  }
}

// ─── Live region announcer ───────────────────────────────────────────────────

let assertiveEl: HTMLElement | null = null;
let politeEl: HTMLElement | null = null;

export function announce(
  msg: string,
  politeness: 'assertive' | 'polite' = 'assertive'
): void {
  const el = politeness === 'assertive'
    ? (assertiveEl ??= document.getElementById('sr-announce') as HTMLElement | null)
    : (politeEl ??= document.getElementById('sr-status') as HTMLElement | null);
  if (!el) return;
  // Clear first, then set — forces re-announcement of identical strings
  el.textContent = '';
  requestAnimationFrame(() => { el.textContent = msg; });
}

// ─── App aria-hidden ─────────────────────────────────────────────────────────

export function setAppAriaHidden(hidden: boolean): void {
  document.getElementById('app')?.setAttribute('aria-hidden', String(hidden));
}
```

---

## Correctness Properties

These are the testable invariants that must hold after all remediation is applied. They map
directly to Requirements 6–9 in requirements.md.

### P1 — Cell aria-label round-trip
For all i in 0..80, after `renderBoard(board, givens, candidates, i, null, null)`:
```
parse(cells[i].getAttribute("aria-label")) → row R, col C → (R-1)*9+(C-1) === i
```

### P2 — Arrow navigation bounds
For all i in 0..80 and all four directions:
```
ArrowRight: i < 80 → selectCell(i+1);  i = 80 → selectCell(80)
ArrowLeft:  i > 0  → selectCell(i-1);  i = 0  → selectCell(0)
ArrowDown:  i+9≤80 → selectCell(i+9);  else   → selectCell(i)
ArrowUp:    i-9≥0  → selectCell(i-9);  else   → selectCell(i)
```

### P3 — Focus trap Tab cycling
For all open panels p, for all focusable elements e in p:
```
Tab from last(p) → focus moves to first(p)
Shift+Tab from first(p) → focus moves to last(p)
```

### P4 — Focus restoration
For all panels p:
```
open(p) then close(p) → document.activeElement === triggerElement(p)
```

### P5 — Announcement fires on every placement
For all d in 1..9, i in 0..80:
```
placeDigit(d) with selectedIdx=i → #sr-announce.textContent !== "" within 100ms
```

### P6 — Contrast symmetry and identity
```
contrast(a, b) === contrast(b, a)  // symmetry
contrast(x, x) === 1.0             // identity
```

### P7 — All text pairs ≥ 4.5:1
For all (fg, bg) text pairs in the CSS variable set (both themes):
```
contrast(fg, bg) >= 4.5
```

### P8 — Touch targets ≥ 44px
For all interactive controls, at all viewports in {320, 360, 375, 390, 414, 430, 480}:
```
effectiveTouchWidth(control) >= 44 && effectiveTouchHeight(control) >= 44
```

---

## Error Handling

### FocusTrap edge cases

- **Empty container (no focusable elements):** `activate()` does not throw; `Tab` key is
  consumed but focus stays wherever it is. A console warning is emitted in development.
- **Container removed from DOM while trap active:** `deactivate()` is a no-op on removed
  element. No error thrown. Caller must call `deactivate()` before DOM removal.
- **Nested traps:** Not expected in this application (panels are mutually exclusive). If two
  traps were active simultaneously, the inner trap's `keydown` listener would fire first (event
  bubbling), which is correct behavior. No special handling needed.

### `announce()` edge cases

- **`#sr-announce` element not in DOM:** `announce()` returns silently. The game remains
  functional — SR announcements are a progressive enhancement layer.
- **Rapid repeated announcements (e.g., fast digit placement):** Each call clears then sets.
  The `requestAnimationFrame` delay means rapid calls may coalesce — only the last
  message within a single frame is announced. This is acceptable for fast auto-play scenarios.

### ARIA attribute errors

- **`aria-invalid="true"` on given cells:** Given cells cannot have conflicts (they are the
  source of truth), so `conflicts.has(givenIdx)` never fires in practice. The `aria-invalid`
  attribute is only set when the `conflicts` Set is non-null and contains the index.
- **`aria-label` on cell with both digit and candidates:** `updateCell` never shows candidates
  when `val !== 0` (the `pencil-marks` div is hidden). The aria-label format correctly omits
  the candidates suffix when `val !== 0`.

---

## Testing Strategy

See Section 7 (Accessibility Testing Plan) for the full test matrix.

**Test infrastructure requirements:**
- Vitest with jsdom for unit and property-based tests
- `fast-check` for property-based tests (already in project or to be added)
- CSS variable resolution in jsdom requires a mock helper (jsdom does not compute CSS vars)
- Touch target tests require `jsdom` with layout simulation or Playwright headless

**Test file layout:**
```
web/tests/accessibility/
  aria.test.ts          — cell ARIA attributes, panel semantics
  keyboard.test.ts      — arrow nav, Tab order, focus trap
  announcements.test.ts — live region content
  contrast.test.ts      — CSS color pair ratios
  touch-targets.test.ts — element dimensions
  keyboard-pbt.test.ts  — fast-check PBT for nav invariants
  announce-pbt.test.ts  — fast-check PBT for announcement coverage
  contrast-pbt.test.ts  — fast-check PBT for contrast properties
  touch-pbt.test.ts     — fast-check PBT for touch target coverage
```

---

## 10. HTML Additions (`web/index.html`)

Two new live region elements are added before `</body>`. Both use `class="sr-only"` so they
are invisible but available to AT:

```html
<!-- Assertive announcer — digit placement, mistakes, game over -->
<div id="sr-announce"
     role="status"
     aria-live="assertive"
     aria-atomic="true"
     class="sr-only"></div>

<!-- Polite status — timer, difficulty -->
<div id="sr-status"
     aria-live="polite"
     aria-atomic="true"
     class="sr-only"></div>
```

`#timer` attribute change:
```html
<!-- Before -->
<div id="timer" aria-live="polite" aria-label="Elapsed time">00:00</div>

<!-- After -->
<div id="timer" aria-live="off" aria-label="Elapsed time">00:00</div>
```

`#hint-panel` role change:
```html
<!-- Before -->
<aside id="hint-panel" aria-hidden="true" aria-label="Hint details" role="complementary">

<!-- After -->
<aside id="hint-panel" aria-hidden="true" aria-label="Hint details"
       role="dialog" aria-modal="true">
```

`#difficulty-badge` live region:
```html
<!-- Before -->
<div id="difficulty-badge" aria-label="Current difficulty">Medium</div>

<!-- After -->
<div id="difficulty-badge" aria-live="polite" aria-atomic="true"
     aria-label="Current difficulty">Medium</div>
```
