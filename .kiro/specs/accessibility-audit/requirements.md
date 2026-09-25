# Requirements Document

## Introduction

This feature delivers a comprehensive WCAG 2.1 AA accessibility audit and remediation plan for
Sudoku-99, a Progressive Web App Sudoku game. The audit covers four domains: keyboard navigation,
screen reader support, color and visual accessibility, and touch accessibility. The output is a
prioritised findings report — severity-ranked, WCAG-mapped, and effort-estimated — that will drive
a structured remediation backlog. No code changes are included in this spec; implementation tasks
will reference these requirements.

The game presents a 9×9 Sudoku grid, a digit numpad, a toolbar of game actions, a settings drawer,
a hint panel, and six additional bottom-sheet panels (Statistics, Daily Challenge, Step Solver,
Puzzle Analysis, Puzzle Library, Import). Accessibility deficiencies in any of these surfaces are
in scope.

---

## Glossary

- **WCAG 2.1 AA**: Web Content Accessibility Guidelines version 2.1, Level AA — the international
  standard for web accessibility adopted by most regulatory frameworks.
- **Grid**: The 9×9 `#sudoku-grid` element containing 81 individual cell `div` elements.
- **Cell**: One of the 81 interactive `div[role="gridcell"]` elements in the Grid.
- **Numpad**: The `#numpad` section containing digit buttons 1–9 with `role="toolbar"`.
- **Toolbar**: The `#toolbar` section containing Undo, Redo, Erase, Pencil, Hint, Fill, and Steps
  buttons, with `role="toolbar"`.
- **Drawer / Panel**: A bottom-sheet overlay (`<aside role="dialog" aria-modal="true">`) used for
  Settings, Hint, Statistics, Daily, Step Solver, Analysis, and Library.
- **Modal**: The centred `#modal-overlay` dialog (`role="dialog" aria-modal="true"`) used for
  win/loss/confirm states.
- **Scrim**: A translucent backdrop element that sits behind each Drawer or Modal.
- **Focus Trap**: The pattern of constraining keyboard Tab/Shift+Tab focus within an open dialog
  so that focus cannot move to elements outside it without explicitly closing it. A correctly
  implemented focus trap is observable: Tab from the last focusable element inside the dialog must
  move focus to the first focusable element inside the dialog, and Shift+Tab from the first must
  move focus to the last — never to elements outside.
- **Live Region**: An element with `aria-live` that causes screen readers to announce content
  changes automatically.
- **Pencil Mark**: A candidate digit displayed in the 3×3 sub-grid of a Cell via `.pencil-marks
  .mark` spans.
- **Difficulty Badge**: The `#difficulty-badge` pill in the stats bar showing current puzzle
  difficulty.
- **Daily Badge**: The `#daily-status-badge` dot indicator on the `#btn-daily` button.
- **Contrast Ratio**: The WCAG relative-luminance ratio between foreground and background colors;
  AA requires ≥ 4.5:1 for normal text and ≥ 3:1 for large text / UI components.
- **Touch Target**: The interactive region that must be at least 44×44 CSS pixels per WCAG 2.5.5.
- **EARS Format**: Easy Approach to Requirements Syntax — uses keywords WHERE, WHILE, WHEN, IF,
  THEN, THE, SHALL to express precise, testable requirements.

---

## Requirements

### Requirement 1: Keyboard Navigation Audit

**User Story:** As an accessibility auditor, I want a complete audit of keyboard navigation across
all interactive surfaces, so that I can identify every failure of WCAG 2.1 success criteria
2.1.1 (Keyboard) and 2.1.2 (No Keyboard Trap).

#### Acceptance Criteria

1. THE Audit SHALL document the keyboard interaction model for the Grid, including: arrow-key
   navigation (ArrowRight, ArrowLeft, ArrowDown, ArrowUp), digit input (keys 1–9), erase
   (Backspace/Delete/0), and the Tab stop position of the grid within the page's overall focus
   order.
2. WHEN a Grid Cell receives focus via Tab or arrow keys, THE Audit SHALL record whether a
   visible focus indicator is rendered and whether it meets WCAG 2.4.7 (Focus Visible) — the
   expected indicator is the `inset 0 0 0 3px var(--accent)` box-shadow applied by the
   `.cell:focus-visible` rule; the Audit SHALL confirm this rule fires correctly in both themes.
3. THE Audit SHALL document whether Tab order follows a logical reading sequence
   (left-to-right, top-to-bottom) across the Header (#btn-daily, #btn-stats, #btn-settings,
   #btn-dark), Stats bar (#timer, #difficulty-badge, mistake pips), Grid (#sudoku-grid cells),
   Numpad (#numpad buttons), and Toolbar (#toolbar buttons).
4. THE Audit SHALL document whether arrow-key navigation stops at grid boundaries (index 0 and
   index 80 per the `buildGrid` handler) or wraps, and classify the stopping behavior against
   ARIA `role="grid"` best-practice expectations for boundary wrapping.
5. THE Audit SHALL document the keyboard behavior of each Drawer and Modal (Settings, Hint,
   Statistics, Daily, Step Solver, Analysis, Library, Import, General Modal), including: whether
   focus automatically moves into the panel on open, whether a Focus Trap (as defined above) is
   present, and whether the Escape key closes the panel.
6. WHEN the Escape key is pressed while a Drawer or Modal is open, THE Audit SHALL record whether
   focus is explicitly returned to the element that triggered the panel — the expected behavior is
   that each close handler calls `.focus()` on the originating button (e.g., `closeSettingsDrawer`
   calls `document.getElementById("btn-settings")?.focus()`); the Audit SHALL verify this for
   all seven drawers/modals and for the two modal types (#modal-overlay and #import-overlay).
7. THE Audit SHALL document whether the numpad digit buttons (1–9) and all Toolbar buttons
   (Undo, Redo, Erase, Pencil, Hint, Fill, Steps) are individually Tab-reachable and operable by
   pressing Enter or Space, and whether their disabled states (e.g., `btn-undo` and `btn-redo`
   start `disabled`) are communicated to keyboard users.
8. THE Audit SHALL document the global `keydown` handler in `game-controller.ts`, which skips
   processing when `e.target.tagName === "BUTTON"` or `"INPUT"`. The Audit SHALL classify
   whether this guard prevents any digit key (1–9) or shortcut key (P, H, Ctrl+Z) from reaching
   the game when keyboard focus is on a button — for example, pressing "5" while a numpad button
   has focus does not trigger `placeDigit` via the global handler.
9. THE Audit SHALL document the keyboard behavior of the Step Solver navigation controls
   (First/⏮, Prev/◀, Play/▶, Next/▶, Last/⏭), including: whether each button is Tab-reachable,
   whether `disabled` states are set correctly before a path is computed, and whether focus is
   managed to a meaningful element after auto-play completes (e.g., focus should move to the Last
   or Play button, not be lost to `<body>`).

---

### Requirement 2: Screen Reader Support Audit

**User Story:** As an accessibility auditor, I want a full audit of ARIA roles, labels, and live
regions across the application, so that I can identify every failure of WCAG 2.1 success criteria
1.3.1 (Info and Relationships), 4.1.2 (Name, Role, Value), and 4.1.3 (Status Messages).

#### Acceptance Criteria

1. THE Audit SHALL verify that each Grid Cell exposes its current value, given-clue status,
   selected state, and conflict state through accessible ARIA properties. Specifically: the cell
   `aria-label` (set at build time as `"Row R, Column C"` and never updated by `updateCell`)
   SHALL be evaluated to determine whether it reflects the current digit or "empty"; `aria-selected`
   SHALL be evaluated for presence and correct toggling when `selectedIdx` changes;
   `aria-invalid` or `aria-describedby` SHALL be evaluated for conflict signaling. The Audit
   SHALL classify any missing or stale attribute as a WCAG 4.1.2 failure.
2. WHEN a digit is placed in a Cell via `placeDigit`, THE Audit SHALL document whether a screen
   reader receives an announcement of the placement. The expected mechanism is a dedicated
   `aria-live="assertive"` region (or equivalent) that announces the triple: digit value, cell
   position (row/column), and mistake-detection result (correct / wrong / game-over). The Audit
   SHALL verify whether such a region exists in the HTML and whether `placeDigit` updates it.
3. THE Audit SHALL verify that Pencil Marks within a Cell are discoverable and distinguishable
   from placed digits by a screen reader user. The `.pencil-marks .mark` spans currently have no
   `aria-label` and the `.pencil-marks` container has no `role`. The Audit SHALL classify whether
   a screen reader user can determine which candidates are active in a cell without relying on
   visual layout.
4. THE Audit SHALL verify that the `#mistake-count` live region (currently `class="sr-only"
   aria-live="polite"`) announces mistake count changes as "N of 3 mistakes" each time
   `setMistakes` is called. The Audit SHALL confirm the `sr-only` element is present in the DOM
   and updated by `setMistakes`.
5. THE Audit SHALL verify that `#timer` (currently `aria-live="polite"`) does not announce to
   screen readers on every 1-second tick. The Audit SHALL document whether the current
   implementation causes per-second announcements in major screen readers (NVDA, JAWS, VoiceOver)
   and classify the behavior against WCAG 4.1.3. A conformant implementation would use
   `aria-live="off"` with explicit minute-interval announcements, or `role="timer"` with
   `aria-live="off"`.
6. THE Audit SHALL verify that `#difficulty-badge` (currently no `aria-live` attribute) correctly
   exposes its three dynamic text states to screen readers: (a) the initial difficulty label
   (e.g., "Medium"), (b) the "Generating..." transient state set in `newGame`, and (c) the
   "Generated → Actual" compound state set by `computeActualDifficulty`. The Audit SHALL
   classify the absence of `aria-live` as a WCAG 4.1.3 gap.
7. THE Audit SHALL verify that each Drawer and Modal has an accessible name and that
   `aria-modal="true"` is present. The Audit SHALL check each panel against the following
   expected markup: `aria-label` present on `#hint-panel`, `#settings-drawer`, `#stats-panel`,
   `#daily-panel`, `#step-solver-panel`, `#analysis-panel`; `aria-labelledby` pointing to the
   `.drawer-title` span on `#library-panel` and `#analysis-panel`; `aria-labelledby="import-title"`
   on `#import-overlay`; `aria-labelledby="modal-title"` on `#modal-overlay`. The Audit SHALL
   note that the Hint Panel uses `role="complementary"` rather than `role="dialog"`, and classify
   whether this is appropriate given that it traps focus.
8. THE Audit SHALL verify that each Drawer/Panel close button has a descriptive `aria-label`.
   The Audit SHALL check: `#btn-settings-close` (`aria-label="Close settings"`),
   `#btn-stats-close` (`aria-label="Close statistics"`), `#btn-daily-close`
   (`aria-label="Close daily challenge"`), `#btn-step-close` (`aria-label="Exit step solver"`),
   `#btn-analysis-close` (`aria-label="Close analysis"`), `#btn-library-close`
   (`aria-label="Close library"`). The Audit SHALL also verify the Hint Panel close button
   (`#hint-close`) has a descriptive label.
9. THE Audit SHALL verify that the Hint Panel announces the technique name and explanation when
   it opens. The `#hint-technique-name` span uses `aria-live="polite"` and `#hint-explanation`
   uses `aria-live="polite"` — the Audit SHALL verify these regions fire correctly when
   `showHintPanel` sets their `textContent` / `innerHTML`. The Audit SHALL also verify that
   `#hint-btn-apply` (`aria-label="Apply hint — remove candidates"`), `#hint-btn-resolve`
   (`aria-label="Resolve hint — place digit"`), and `#hint-btn-dismiss`
   (`aria-label="Dismiss hint"`) have labels sufficient for screen reader users to understand
   the consequence of each action.
10. THE Audit SHALL verify that the `#sudoku-grid` ARIA structure (`role="grid"`,
    `aria-rowcount="9"`, `aria-colcount="9"`) is sufficient for screen readers to understand the
    grid. The Audit SHALL document whether the absence of `role="row"` wrapper elements (cells
    are direct children of the grid `<section>`) prevents major screen readers from correctly
    interpreting row/column coordinates, and classify the finding against WCAG 1.3.1.
11. THE Audit SHALL verify that `#numpad` uses `role="toolbar"` and that each digit button's
    remaining-count badge (`<span class="digit-badge" id="badge-N">`) is accessible. The badge
    span is a visible child of the button and will be read by screen readers as part of the
    button's accessible name — the Audit SHALL verify whether this results in an appropriate
    name (e.g., "Digit 5 3" when 3 fives remain) or a confusing one, and whether the
    `digit-complete` state (all 9 placed) is communicated beyond CSS opacity change.
12. THE Audit SHALL verify that `#daily-status-badge` (a `<span class="daily-badge">` inside
    `#btn-daily`) communicates its three states (completed: `✓`, in-progress: `•`, empty: `""`)
    to screen readers. The badge text characters `✓` and `•` may be announced as "check mark"
    and "bullet" by screen readers — the Audit SHALL verify whether these announcements are
    meaningful, and whether an empty badge leaves the button's state unclear.
13. THE Audit SHALL verify that modal body content set via `bodyEl.innerHTML` (e.g., win message
    with `<strong>` and `<code>` elements) is rendered accessibly. The Audit SHALL confirm
    that `<strong>` emphasis and `<code>` formatting within `#modal-body` are exposed through
    AT-readable semantics, and that any emoji in titles (🎉, ❌) have appropriate accessible
    names or are decorative.
14. THE Audit SHALL verify that the Daily Calendar cells (rendered into `#daily-calendar` with
    `role="group"`) expose their completion status accessibly and not only through the CSS color
    classes `.daily-status-completed`, `.daily-status-in_progress`, `.daily-status-not_started`.
    Each cell SHALL have an `aria-label` that includes the date and the status as readable text
    (e.g., "2026-08-10 — Completed"). The Audit SHALL classify color-only status as a WCAG 1.4.1
    failure.
15. THE Audit SHALL verify that Library panel list items (rendered into `#library-list` with
    `role="list"`) expose all four key attributes accessibly: puzzle difficulty, puzzle source,
    date saved, and completion status. The Audit SHALL verify that each `role="listitem"` element
    has accessible text (via `aria-label` or inner text) that communicates all four attributes
    without requiring the user to navigate child elements, since the library item markup is built
    via `innerHTML`.

---

### Requirement 3: Color and Visual Accessibility Audit

**User Story:** As an accessibility auditor, I want a systematic contrast and color-dependency
audit for both light and dark themes, so that I can identify every failure of WCAG 2.1 success
criteria 1.4.1 (Use of Color), 1.4.3 (Contrast Minimum), 1.4.11 (Non-text Contrast), and
2.3.1 (Three Flashes).

#### Acceptance Criteria

1. THE Audit SHALL measure and document the contrast ratio of each distinct text
   foreground/background pair in the light theme, including:
   - Given digit (`--cell-given`: `#1c1c2e`) on cell background (`--cell-bg`: `#ffffff`)
   - User digit (`--cell-user`: `#4361ee`) on cell background (`#ffffff`)
   - Pencil mark (`--cell-pencil`: `#8888aa`) on cell background (`#ffffff`)
   - Selected-cell text on selected background (`--hl-selected`: `#dde4ff`)
   - Conflict digit (`--hl-conflict-txt`: `#d32f2f`) on conflict background
     (`--hl-conflict-bg`: `#fde8ea`)
   - Hint-blue digit (`--hint-blue`: `#1565c0`) on hint-blue background
     (`--hint-blue-bg`: `#dbeafe`)
   - Hint-yellow digit (`--hint-yellow`: `#c15000`) on hint-yellow background
     (`--hint-yellow-bg`: `#fff4e0`)
   - Hint-purple digit (`--hint-purple`: `#6a1b9a`) on hint-purple background
     (`--hint-purple-bg`: `#f5e6ff`)
   - Difficulty badge (`--accent`: `#4361ee`) on badge background (`--accent-light`: `#dde4ff`)
   - General body text (`--text`: `#1c1c2e`) on surface (`--surface`: `#ffffff`)
   - Secondary text (`--text-secondary`: `#5a5a7a`) on surface (`#ffffff`)
2. THE Audit SHALL measure and document the same contrast ratios for all pairs in the dark theme,
   using the overridden CSS variable values defined in `html.dark`.
3. WHERE any measured ratio falls below 4.5:1 for text rendered smaller than 18pt (24px) or
   14pt bold (~18.67px bold), THE Audit SHALL classify the finding as a WCAG 1.4.3 failure and
   assign High severity. WHERE any ratio falls below 3:1 for UI component foreground/background
   pairs, THE Audit SHALL classify the finding as a WCAG 1.4.11 failure and assign High severity.
4. THE Audit SHALL verify that conflict cells do not rely solely on `--hl-conflict-bg` (red
   background) to communicate the conflict state (WCAG 1.4.1). The existing `--hl-conflict-txt`
   color change is a secondary indicator — the Audit SHALL determine whether the text color change
   alone is sufficient, or whether an additional non-color indicator (e.g., pattern, icon,
   `aria-invalid`) is required.
5. THE Audit SHALL verify that the selected-cell state is not communicated solely through
   `--hl-selected` (blue background fill). The `inset 0 0 0 2px var(--accent)` box-shadow on
   `.cell.selected` is a secondary indicator — the Audit SHALL classify whether this meets
   WCAG 1.4.1 or whether a non-color indicator (e.g., border pattern, icon) is also required.
6. THE Audit SHALL verify that the `digit-complete` state of a numpad button (CSS class
   `.digit-complete`, `color: var(--pad-done)`) is not communicated solely through the reduced
   opacity / muted color change. The Audit SHALL classify this as a WCAG 1.4.1 failure if no
   non-color indicator (e.g., strikethrough, disabled attribute, accessible text) is present.
7. THE Audit SHALL measure the contrast ratio of `#difficulty-badge` text (`--accent` color) on
   its background (`--accent-light`) in both light and dark themes, and classify any failure
   against WCAG 1.4.3.
8. THE Audit SHALL measure the contrast ratio of filled mistake pip (`--hl-wrong`: `#ef5350`
   / `#ef5350`) against the stats bar background (`--surface`: `#ffffff` light,
   `--surface`: `#1a1a2e` dark) in both themes.
9. THE Audit SHALL measure the contrast ratio of pencil-mark text: `--cell-pencil` `#8888aa` on
   `#ffffff` (light theme) and `#606088` on `#1a1a2e` (dark theme), and classify any failure
   against WCAG 1.4.3 (pencil marks are functional text used to record candidates, not
   decorative).
10. THE Audit SHALL verify that the `.daily-status-completed`, `.daily-status-in_progress`, and
    `.daily-status-not_started` CSS classes meet contrast requirements for their text colors on
    their respective backgrounds in both themes, and that status is not communicated solely
    through color (WCAG 1.4.1).
11. THE Audit SHALL verify that the three hint cell highlight backgrounds (`.hint-blue-bg`,
    `.hint-yellow-bg`, `.hint-purple-bg`) achieve ≥ 3:1 non-text contrast against the default
    cell background (`--cell-bg`) to satisfy WCAG 1.4.11 for UI component states.
12. THE Audit SHALL verify that the `@media (prefers-reduced-motion: reduce)` block in `style.css`
    (which sets `animation-duration: 0.01ms` and `transition-duration: 0.01ms` universally)
    effectively suppresses the `conflict-pulse`, `cell-pop`, `cell-wrong` / `cell-shake`, and any
    `generating-pulse` animations. The Audit SHALL verify that no animation remains visually
    perceptible under this media query.
13. THE Audit SHALL verify that the `cell.wrong` animation (keyframes `cell-wrong` at 0.45s and
    `cell-shake` at 0.30s) does not flash at a rate exceeding 3 Hz (three flashes per second)
    and does not produce a "red flash" covering more than 25% of the viewport simultaneously,
    per WCAG 2.3.1. The Audit SHALL note that only 1 cell animates per wrong digit placement,
    making a 25%-of-viewport failure geometrically unlikely on typical displays.
14. THE Audit SHALL verify that the `.cell:focus-visible` focus ring (`inset 0 0 0 3px
    var(--accent)`) and the `button:focus-visible` outline (`3px solid var(--accent),
    outline-offset: 2px`) achieve ≥ 3:1 contrast against adjacent backgrounds in both light and
    dark themes, per WCAG 1.4.11.

---

### Requirement 4: Touch Accessibility Audit

**User Story:** As an accessibility auditor, I want an audit of touch target sizes and mobile
interaction patterns, so that I can identify every failure of WCAG 2.1 success criteria 2.5.5
(Target Size) and 2.5.3 (Label in Name).

#### Acceptance Criteria

1. THE Audit SHALL measure the rendered `offsetWidth` and `offsetHeight` of every interactive
   control at viewport width 375px (iPhone SE / standard mobile baseline) and document any
   control whose both dimensions are not ≥ 44 CSS pixels. Findings SHALL be classified as:
   Critical (< 24px in either dimension), Major (24–43px), Minor (≥ 44px but with inadequate
   spacing between adjacent targets).
2. THE Audit SHALL specifically measure and report rendered dimensions for: each Grid Cell
   (determined by `#grid-wrap` width ÷ 9 minus gap), each Numpad digit button (aspect-ratio 1:1
   within a 9-column grid), each Toolbar button (`.tool-btn` with `min-width: 44px` per CSS),
   each Header icon button (`#btn-daily`, `#btn-stats`, `#btn-settings`, `#btn-dark` — all set
   to 38×38px), each Drawer close button, and the Hint panel action buttons (`.hint-action-btn`
   with `padding: 12px 10px`).
3. THE Audit SHALL document whether `.library-item-btn` elements (currently 28×28 CSS pixels per
   their CSS definition) fall below the 44×44 px minimum, and classify the finding severity using
   the rubric from AC1. The Audit SHALL determine whether padding, margin, or pseudo-element
   touch expansion brings the effective target to ≥ 44×44 px.
4. THE Audit SHALL document whether `#btn-settings-close` (currently `width: 32px; height: 32px`
   per CSS) falls below the 44×44 px minimum, and apply the severity rubric from AC1. The same
   check SHALL apply to all other drawer close buttons that share the same 32×32 CSS dimensions.
5. THE Audit SHALL verify that Drawer scrims (`#hint-scrim`, `#settings-scrim`, `#stats-scrim`,
   `#daily-scrim`, `#step-solver-scrim`, `#analysis-scrim`, `#library-scrim`) cover the full
   viewport (`position: fixed; inset: 0`) when visible, making them reliably tappable as dismiss
   targets. The Audit SHALL classify any scrim that does not cover the full viewport as a
   usability failure.
6. THE Audit SHALL verify that all bottom-sheet Drawers use `padding-bottom: max(24px,
   env(safe-area-inset-bottom))` (as defined in the CSS for `#settings-drawer` and `#stats-panel`)
   to prevent controls from being obscured by home-indicator bars on iOS. The Audit SHALL check
   whether this padding rule is consistently applied to all seven drawers.
7. THE Audit SHALL verify that the `<meta name="viewport" content="width=device-width,
   initial-scale=1.0, viewport-fit=cover">` tag in `index.html` is correctly paired with
   `env(safe-area-inset-*)` usage in CSS. The Audit SHALL document each `env(safe-area-inset-*)`
   occurrence and verify that no interactive control is positioned where it could be obscured by
   notch or home-indicator areas on notched devices.
8. THE Audit SHALL document whether any interactive control lacks the two-path compliance
   required by WCAG 2.5.3 (Label in Name): either (a) a visible text label that matches or
   contains the accessible name, or (b) for icon-only controls, an `aria-label` whose text
   matches or begins with the visible label text. The Audit SHALL specifically check `#btn-dark`
   (no visible text, emoji rendered via CSS `::before`, `aria-label="Toggle dark mode"`) and
   each toolbar button (visible `.tool-label` text should match the `aria-label`).
9. THE Audit SHALL document whether the daily calendar cells (`.daily-cal-cell` rendered into
   `#daily-calendar`) have rendered dimensions ≥ 44×44 CSS pixels at 375px viewport and whether
   each cell has a non-empty `aria-label` attribute encoding the date and status (e.g.,
   "2026-08-10 — Completed"). The Audit SHALL classify any cell without an accessible label as
   a WCAG 4.1.2 failure.
10. THE Audit SHALL verify that the `<meta name="viewport">` tag does not include
    `user-scalable=no` or `maximum-scale` set to a value ≤ 1.0, both of which disable
    pinch-to-zoom and violate WCAG 1.4.4. The current value is `initial-scale=1.0,
    viewport-fit=cover` without a `maximum-scale` or `user-scalable` directive — the Audit SHALL
    confirm this does not block zoom in practice across iOS Safari and Android Chrome.

---

### Requirement 5: Findings Report Format

**User Story:** As a developer, I want the audit output structured as a prioritised findings
report, so that I can convert it directly into an implementation backlog.

#### Acceptance Criteria

1. THE Report SHALL include one entry per distinct accessibility issue found; duplicate instances
   of the same root failure on multiple components SHALL be grouped into a single finding with
   affected component list.
2. EACH finding SHALL include all of the following fields:
   - **ID**: A unique alphanumeric identifier (e.g., `KN-01`, `SR-03`, `CV-07`, `TA-02`)
   - **Title**: A short, action-oriented description (≤ 80 characters)
   - **Description**: The observed behavior and why it fails the WCAG criterion
   - **Affected components**: DOM element IDs or CSS selectors
   - **WCAG criterion**: The specific success criterion number and name
   - **Severity**: High / Medium / Low (per AC3)
   - **Effort**: Small (≤ 2h) / Medium (2–8h) / Large (> 8h)
   - **Recommended fix**: A concrete code-level change or pattern to apply
3. THE Report SHALL classify findings by severity using these definitions:
   - **High**: Blocks a core game interaction for a keyboard-only user, screen reader user, or
     user with a visual disability — the user cannot complete the task at all
   - **Medium**: Significantly degrades the experience or causes confusion, but the user can
     complete the task with difficulty or via an alternative path
   - **Low**: Cosmetic, minor, or enhancement-only; does not block any task completion
4. THE Report SHALL identify Quick Wins as a dedicated section: findings classified as High or
   Medium severity AND Small effort (≤ 2h). Quick Wins SHALL be listed in recommended
   implementation order within the section.
5. THE Report SHALL provide a recommended implementation order across all findings:
   Phase 1 — High severity (blocking issues); Phase 2 — Quick Wins not already in Phase 1;
   Phase 3 — remaining Medium findings; Phase 4 — Low findings.
6. THE Report SHALL include a WCAG 2.1 AA compliance summary table with one row per success
   criterion in scope, each row containing: criterion number, criterion name, and compliance
   status (Pass / Fail / Partial / Not Tested).
7. THE Report SHALL include a summary count of findings broken down by severity:
   total High, total Medium, total Low, and grand total.
8. WHERE a finding affects only one of the light or dark theme (e.g., a contrast failure that
   passes in light theme but fails in dark), THE Report SHALL note the affected theme in the
   finding description.

---

### Requirement 6: Keyboard Navigation Correctness Properties

**User Story:** As a developer, I want testable properties for keyboard navigation behavior, so
that automated tests can verify accessibility regressions are not introduced.

#### Acceptance Criteria

1. THE Keyboard_Navigation_Tests SHALL verify that for all valid cell indices i in 0..80,
   firing an ArrowRight `keydown` event on cell i causes `selectCell` to be called with argument
   `i + 1` when `i + 1 ≤ 80`, and with argument `i` (no move) when `i = 80`. This is a
   universal quantifier — the test SHALL exercise every value of i, not only edge cases.
2. THE Keyboard_Navigation_Tests SHALL verify that for all valid cell indices i in 0..80,
   firing an ArrowLeft `keydown` event on cell i causes `selectCell` to be called with argument
   `i - 1` when `i - 1 ≥ 0`, and with argument `i` (no move) when `i = 0`.
3. THE Keyboard_Navigation_Tests SHALL verify that for all valid cell indices i in 0..80,
   firing an ArrowDown `keydown` event on cell i causes `selectCell` to be called with argument
   `i + 9` when `i + 9 ≤ 80`, and with argument `i` (no move) when `i + 9 > 80`.
4. THE Keyboard_Navigation_Tests SHALL verify that for all valid cell indices i in 0..80,
   firing an ArrowUp `keydown` event on cell i causes `selectCell` to be called with argument
   `i - 9` when `i - 9 ≥ 0`, and with argument `i` (no move) when `i - 9 < 0`.
5. FOR ALL open dialog states d in {settings, hint, stats, daily, step-solver, analysis, library,
   import, modal}, THE Focus_Trap_Tests SHALL verify that pressing Tab from the last focusable
   element inside dialog d moves focus to the first focusable element inside dialog d (not to any
   element outside it), and pressing Shift+Tab from the first focusable element inside dialog d
   moves focus to the last focusable element inside dialog d.
6. FOR ALL open dialog states d (as enumerated in AC5), THE Focus_Trap_Tests SHALL verify that
   pressing Escape while dialog d is open: (a) removes the `open` / `active` CSS class from the
   dialog element, (b) sets `aria-hidden="true"` on the dialog element, and (c) restores focus
   to the exact DOM element that triggered the open action (i.e., `document.activeElement` after
   close equals the trigger button for dialog d).
7. THE ARIA_State_Tests SHALL verify a round-trip property: for every cell index i in 0..80,
   after `renderBoard` is called with any board state, the `aria-label` attribute of `cells[i]`
   SHALL contain both the row number `Math.floor(i / 9) + 1` and the column number
   `(i % 9) + 1`, such that parsing "Row R, Column C" from the label recovers the original
   index i as `(R - 1) * 9 + (C - 1)`.

---

### Requirement 7: Screen Reader Announcement Correctness Properties

**User Story:** As a developer, I want testable properties for screen reader announcements, so
that automated tests can verify that live regions fire on every relevant game state change.

#### Acceptance Criteria

1. FOR ALL digit placements d in 1..9 at cell index i in 0..80 (81 × 9 = 729 combinations),
   THE Live_Region_Tests SHALL verify that a live region element designated for digit-placement
   announcements has its `textContent` updated within 100ms of `placeDigit(d)` being called with
   cell i selected. The test SHALL verify the region content includes at minimum the digit value d
   and a position reference (row/column of i).
2. FOR ALL wrong-digit placements that increment `mistakes` to m in 1..3, THE Live_Region_Tests
   SHALL verify that `document.getElementById("mistake-count").textContent` is updated to the
   string `"${m} of 3 mistakes"` within 100ms of `setMistakes(m, 3)` being called.
3. THE Live_Region_Tests SHALL verify that `document.getElementById("timer")` has
   `aria-live="polite"` and that its `textContent` is updated on every 1-second interval by the
   timer. The test SHALL document this as a SR over-announcement failure (ticking every second
   is perceptible noise). A conformant fix replaces the current behavior with one of: (a) change
   `#timer` to `aria-live="off"` and add a separate `aria-live="polite"` element updated only
   at 60-second intervals, or (b) add `role="timer"` with `aria-live="off"` on `#timer`.
4. FOR ALL Drawer/Panel open events e in {settings, hint, stats, daily, step-solver, analysis,
   library, import, modal}, THE Focus_Management_Tests SHALL verify that within one animation
   frame (≤ 16ms after the CSS `open` / `active` class is added), `document.activeElement` is
   an element that is a descendant of the opened panel's root element.
5. FOR ALL Drawer/Panel close events e (same set as AC4), THE Focus_Management_Tests SHALL
   verify that after the close action completes, `document.activeElement` is exactly the DOM
   element that triggered the open event — not `document.body` and not any other element.

---

### Requirement 8: Contrast Ratio Correctness Properties

**User Story:** As a developer, I want computable contrast ratio checks for all CSS color pairs,
so that automated tests can catch regressions in color changes.

#### Acceptance Criteria

1. FOR ALL text color / background color pairs defined in the CSS `:root` variable set (see
   Requirement 3, AC1 for the enumerated pairs), THE Contrast_Tests SHALL compute the WCAG
   relative luminance contrast ratio using the formula `(L1 + 0.05) / (L2 + 0.05)` where L1 ≥ L2,
   and verify the result meets ≥ 4.5:1 for text rendered at less than 24px (18pt) or less than
   ~18.67px bold (14pt bold).
2. FOR ALL UI component foreground / background pairs (focus ring color `var(--accent)` against
   adjacent cell background, button border colors against button backgrounds, `.mistake-pip.filled`
   against stats bar background), THE Contrast_Tests SHALL verify a contrast ratio ≥ 3:1 per
   WCAG 1.4.11.
3. THE Contrast_Tests SHALL verify the symmetry property: `contrast(color_a, color_b) =
   contrast(color_b, color_a)` — i.e., the computed ratio is identical regardless of which color
   is passed as foreground vs. background. This is an algebraic identity that tests the
   correctness of the test utility itself.
4. THE Contrast_Tests SHALL verify the identity / edge-case property: when the same color is
   provided for both arguments, `contrast(color_x, color_x)` SHALL return exactly `1.0` (or `1:1`
   in ratio notation). This ensures the utility handles zero-difference inputs without
   division-by-zero or incorrect results.
5. FOR ALL dark-theme CSS variable overrides defined in `html.dark` (see Requirement 3, AC2 for
   the enumerated pairs), THE Contrast_Tests SHALL verify that each overridden color pair still
   meets the same WCAG threshold (4.5:1 for text, 3:1 for UI components) as the light-theme
   pair it replaces. A dark-theme override that regresses below threshold SHALL be classified as
   a new failure, not covered by the light-theme result.

---

### Requirement 9: Touch Target Correctness Properties

**User Story:** As a developer, I want testable size properties for interactive controls, so that
automated tests can detect touch target regressions.

#### Acceptance Criteria

1. FOR ALL interactive controls rendered at viewport width 375px (simulated via jsdom or a
   headless browser), THE Touch_Target_Tests SHALL verify that each control's `offsetWidth` and
   `offsetHeight` are each ≥ 44px, OR that a computed padding, `min-width` / `min-height`, or
   pseudo-element expansion brings the effective touch area to ≥ 44×44 CSS pixels. A control
   that fails both conditions SHALL be recorded as a touch target failure.
2. THE Touch_Target_Tests SHALL verify that `.library-item-btn` elements (CSS: `width: 28px;
   height: 28px`) have an effective touch target of ≥ 44×44 px via padding, negative margin,
   or `::after` pseudo-element with absolute positioning. IF the effective target is < 44×44 px,
   the test SHALL classify the finding as a Major failure per the rubric in Requirement 4, AC1.
3. THE Touch_Target_Tests SHALL verify that individual grid cells at viewport width 375px have
   a touch area ≥ 44×44 px, OR that the grid interaction model is documented as a
   tap-to-select-then-tap-digit pattern (two-step interaction) that reduces the minimum cell
   size requirement. IF cells are < 44×44 px and no alternative model is documented, the test
   SHALL classify the finding as a Major failure.
4. FOR ALL viewport widths w in {320, 360, 375, 390, 414, 430, 480} CSS pixels, THE
   Touch_Target_Tests SHALL verify that no interactive control has `offsetWidth < 44` or
   `offsetHeight < 44` due to `clamp()`-based font-size scaling, `aspect-ratio: 1/1` combined
   with a narrow grid column, or any other CSS rule that reduces rendered size below the minimum.
   The test SHALL iterate all widths and report the minimum observed dimension per control.

---

## Summary

**Total requirements: 9**
- Requirements 1–4: Audit scope and criteria (what to examine and how to classify findings)
- Requirement 5: Output format (structure of the findings report)
- Requirements 6–9: Testable correctness properties (property-based test specifications)

**WCAG 2.1 AA criteria in scope:**

| Criterion | Name | Domain |
|-----------|------|--------|
| 1.3.1 | Info and Relationships | Screen Reader |
| 1.4.1 | Use of Color | Color/Visual |
| 1.4.3 | Contrast (Minimum) | Color/Visual |
| 1.4.4 | Resize Text | Touch |
| 1.4.11 | Non-text Contrast | Color/Visual |
| 2.1.1 | Keyboard | Keyboard |
| 2.1.2 | No Keyboard Trap | Keyboard |
| 2.3.1 | Three Flashes or Below Threshold | Color/Visual |
| 2.4.7 | Focus Visible | Keyboard |
| 2.5.3 | Label in Name | Touch |
| 2.5.5 | Target Size | Touch |
| 4.1.2 | Name, Role, Value | Screen Reader |
| 4.1.3 | Status Messages | Screen Reader |

**Gaps and assumptions discovered during refinement:**

1. `updateCell` never updates `aria-label`, `aria-selected`, or `aria-invalid` — the initial
   build-time label is static. This is a confirmed High severity gap for screen reader users.
2. No dedicated live region for digit-placement announcements exists in the current HTML. The
   only live regions are `#mistake-count` (sr-only), `#timer` (over-announces), and the hint
   panel's `aria-live="polite"` spans.
3. `#difficulty-badge` has no `aria-live` attribute, making its dynamic state changes
   (Generating… → actual difficulty) silent to screen readers.
4. The Hint Panel uses `role="complementary"` rather than `role="dialog"`, which means no
   Focus Trap is expected by AT, yet the panel visually functions as a modal overlay.
5. Pencil mark `.mark` spans have no `role` or `aria-label`, making candidate state
   unreadable by screen readers.
6. The `#daily-calendar` cells appear to use color classes only with no `aria-label` per cell,
   failing WCAG 1.4.1 and 4.1.2.
7. All drawer close buttons are 32×32 px — below the 44×44 px WCAG 2.5.5 minimum.
8. The digit badge span inside each numpad button will be read as part of the button name
   (e.g., "Digit 5 3"), which may or may not be intuitive. No explicit `aria-hidden` suppresses it.
9. `#btn-dark` renders its icon via CSS `::before` pseudo-element — the icon is not in the DOM
   and is not readable by AT, relying entirely on `aria-label` for its accessible name.
