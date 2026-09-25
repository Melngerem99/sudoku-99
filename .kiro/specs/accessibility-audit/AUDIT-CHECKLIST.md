# Accessibility Audit Checklist

Derived from requirements.md. Each item maps to a specific acceptance criterion.
Use this checklist during the manual audit session to record Pass / Fail / N/A for each check.

---

## Domain 1: Keyboard Navigation (Req 1)

### 1A — Grid keyboard model (AC1)
- [ ] Arrow keys navigate between cells correctly (Right +1, Left −1, Down +9, Up −9)
- [ ] Digit keys 1–9 place a digit in the focused cell
- [ ] Backspace / Delete / 0 erase the focused cell
- [ ] Tab reaches the grid from the header / stats bar

### 1B — Focus visible on cells (AC2)
- [ ] `.cell:focus-visible` renders inset accent box-shadow in light theme
- [ ] `.cell:focus-visible` renders inset accent box-shadow in dark theme
- [ ] Focus ring is visible against both `--cell-bg` and `--hl-selected` backgrounds

### 1C — Tab order across page sections (AC3)
- [ ] Tab moves: Header → Stats → Grid → Numpad → Toolbar (logical top-to-bottom)
- [ ] No element is skipped or appears out of reading sequence

### 1D — Arrow key boundary behavior (AC4)
- [ ] Pressing ArrowRight at cell 80 stays at 80 (does not wrap or throw error)
- [ ] Pressing ArrowLeft at cell 0 stays at 0
- [ ] Pressing ArrowDown at row 9 (cells 72–80) stays in place
- [ ] Pressing ArrowUp at row 1 (cells 0–8) stays in place
- [ ] Behavior is classified against ARIA `role="grid"` wrapping expectations

### 1E — Drawer and Modal keyboard behavior (AC5)
- [ ] Settings drawer: focus moves in on open, Focus Trap present, Escape closes
- [ ] Hint panel: focus moves in on open, Focus Trap present (or classified absent), Escape closes
- [ ] Statistics panel: focus moves in, trap present, Escape closes
- [ ] Daily challenge panel: focus moves in, trap present, Escape closes
- [ ] Step Solver panel: focus moves in, trap present, Escape closes
- [ ] Analysis panel: focus moves in, trap present, Escape closes
- [ ] Library panel: focus moves in, trap present, Escape closes
- [ ] Import modal (`#import-overlay`): focus moves in, trap present, Escape closes
- [ ] General modal (`#modal-overlay`): focus moves in, trap present, Escape closes

### 1F — Focus return on Escape (AC6)
- [ ] Closing Settings → focus returns to `#btn-settings`
- [ ] Closing Hint panel → focus returns to `#btn-hint`
- [ ] Closing Statistics → focus returns to `#btn-stats`
- [ ] Closing Daily → focus returns to `#btn-daily`
- [ ] Closing Step Solver → focus returns to `#btn-step-solve`
- [ ] Closing Analysis → focus returns to `#btn-analyze`
- [ ] Closing Library → focus returns to `#btn-library`
- [ ] Closing Import → focus returns to `#btn-import`
- [ ] Closing General Modal → focus returns to the triggering button

### 1G — Numpad and Toolbar keyboard operability (AC7)
- [ ] All 9 digit buttons reachable by Tab and operable by Enter/Space
- [ ] Undo, Redo, Erase, Pencil, Hint, Fill, Steps — all Tab-reachable
- [ ] Disabled state of Undo/Redo communicated to keyboard users (not just visually greyed)

### 1H — Global keydown BUTTON/INPUT guard (AC8)
- [ ] Pressing digit "5" while a numpad button has focus: does NOT route through global handler
- [ ] Pressing "P" (pencil) while a button has focus: does NOT toggle pencil via global handler
- [ ] Pressing Ctrl+Z while a button has focus: does NOT trigger undo via global handler
- [ ] Classify: does this guard create any keyboard inaccessibility for game operation?

### 1I — Step Solver navigation (AC9)
- [ ] First/Prev/Play/Next/Last buttons are each Tab-reachable
- [ ] All five buttons start disabled before path is computed
- [ ] After auto-play completes, focus is managed to a meaningful control (not lost to body)

---

## Domain 2: Screen Reader Support (Req 2)

### 2A — Cell ARIA state (AC1)
- [ ] `aria-label` on each cell reflects current digit or "empty" (or is static — classify)
- [ ] `aria-selected="true"` toggled on the selected cell
- [ ] `aria-invalid="true"` or equivalent set on conflict cells
- [ ] Given-clue status is communicated (e.g., via aria-readonly or aria-label text)

### 2B — Digit placement announcement (AC2)
- [ ] A dedicated `aria-live="assertive"` region exists in the HTML
- [ ] Region content is updated by `placeDigit` with digit value + position
- [ ] Mistake detection result is included in the announcement
- [ ] If no region exists — classify as WCAG 4.1.3 failure

### 2C — Pencil mark discoverability (AC3)
- [ ] `.pencil-marks` container has `role` appropriate for its content
- [ ] Active `.mark` spans have `aria-label` or accessible text indicating the digit
- [ ] SR user can distinguish "candidate 3 is active" vs. "digit 3 is placed"

### 2D — Mistake count live region (AC4)
- [ ] `#mistake-count` (`class="sr-only" aria-live="polite"`) is present in DOM
- [ ] Text updates to "N of 3 mistakes" when `setMistakes(N, 3)` is called
- [ ] Update fires within 100ms of wrong digit placement

### 2E — Timer live region (AC5)
- [ ] `#timer` has `aria-live="polite"` — confirm present
- [ ] Timer announces every 1 second (confirm whether this is perceptible noise in NVDA/VoiceOver)
- [ ] Classify against WCAG 4.1.3 (over-announcement)
- [ ] Proposed fix noted: `aria-live="off"` + 60-second announcement interval

### 2F — Difficulty badge (AC6)
- [ ] `#difficulty-badge` has no `aria-live` — confirm absence
- [ ] "Generating…" state change is silent to SR (classify as WCAG 4.1.3 gap)
- [ ] "Generated → Actual" state change is silent to SR (classify as WCAG 4.1.3 gap)

### 2G — Panel accessible names and aria-modal (AC7)
- [ ] `#hint-panel`: `aria-label` present, `role="complementary"` (not "dialog") — classify
- [ ] `#settings-drawer`: `aria-label="Settings"`, `role="dialog"`, `aria-modal="true"`
- [ ] `#stats-panel`: `aria-label="Player statistics"`, `role="dialog"`, `aria-modal="true"`
- [ ] `#daily-panel`: `aria-label="Daily challenge"`, `role="dialog"`, `aria-modal="true"`
- [ ] `#step-solver-panel`: `aria-label` present, `role="dialog"`, `aria-modal="true"`
- [ ] `#analysis-panel`: `aria-labelledby` present, `role="dialog"`, `aria-modal="true"`
- [ ] `#library-panel`: `aria-labelledby="library-panel-title"`, `role="dialog"`, `aria-modal="true"`
- [ ] `#import-overlay`: `aria-labelledby="import-title"`, `role="dialog"`, `aria-modal="true"`
- [ ] `#modal-overlay`: `aria-labelledby="modal-title"`, `role="dialog"`, `aria-modal="true"`

### 2H — Drawer close button labels (AC8)
- [ ] `#btn-settings-close`: `aria-label="Close settings"`
- [ ] `#btn-stats-close`: `aria-label="Close statistics"`
- [ ] `#btn-daily-close`: `aria-label="Close daily challenge"`
- [ ] `#btn-step-close`: `aria-label="Exit step solver"`
- [ ] `#btn-analysis-close`: `aria-label="Close analysis"`
- [ ] `#btn-library-close`: `aria-label="Close library"`
- [ ] `#hint-close`: descriptive `aria-label` present

### 2I — Hint Panel announcements (AC9)
- [ ] `#hint-technique-name` (`aria-live="polite"`) fires when hint opens
- [ ] `#hint-explanation` (`aria-live="polite"`) fires with description
- [ ] `#hint-btn-dismiss` label clearly implies "close without acting"
- [ ] `#hint-btn-apply` label clearly implies "remove marked candidates"
- [ ] `#hint-btn-resolve` label clearly implies "place the digit"

### 2J — Grid ARIA structure (AC10)
- [ ] `#sudoku-grid` has `role="grid"`, `aria-rowcount="9"`, `aria-colcount="9"`
- [ ] No `role="row"` wrappers — cells are direct children of the grid section
- [ ] Test with NVDA/VoiceOver: does the SR announce row/col coordinates correctly?
- [ ] Classify absence of row wrappers against WCAG 1.3.1

### 2K — Numpad toolbar role and badge (AC11)
- [ ] `#numpad` has `role="toolbar"` and `aria-label="Digit input"`
- [ ] `.digit-badge` span read as part of button name (e.g., "Digit 5 3")
- [ ] `digit-complete` state change (opacity) is communicated beyond visual means

### 2L — Daily status badge (AC12)
- [ ] `#daily-status-badge` with `✓` — SR announces "check mark"? Meaningful?
- [ ] With `•` — SR announces "bullet"? Meaningful?
- [ ] With empty string `""` — SR gives no indication? Button state unclear?
- [ ] Classify against WCAG 4.1.2

### 2M — Modal innerHTML content (AC13)
- [ ] `<strong>` in `#modal-body` announced with emphasis by SR
- [ ] `<code>` in daily win share text formatted accessibly
- [ ] Emoji in modal titles (🎉, ❌) are decorative or have accessible names
- [ ] `innerHTML` does not introduce orphaned ARIA references

### 2N — Daily calendar cell accessibility (AC14)
- [ ] Each `.daily-cal-cell` has non-empty `aria-label` with date + status
- [ ] Status is NOT communicated only through CSS color class
- [ ] Absent `aria-label` → classify as WCAG 1.4.1 + 4.1.2 failure

### 2O — Library list item accessibility (AC15)
- [ ] Each `role="listitem"` has readable text including difficulty, source, date, completion status
- [ ] All four attributes are accessible without requiring child navigation
- [ ] `innerHTML` build does not lose accessible text

---

## Domain 3: Color and Visual Accessibility (Req 3)

### 3A — Light theme text contrast (AC1)
Measure and record (target ≥ 4.5:1 for normal text):

| Pair | Foreground | Background | Ratio | Pass/Fail |
|------|-----------|-----------|-------|-----------|
| Given digit | #1c1c2e | #ffffff | | |
| User digit | #4361ee | #ffffff | | |
| Pencil mark | #8888aa | #ffffff | | |
| Selected text | (measure) | #dde4ff | | |
| Conflict digit | #d32f2f | #fde8ea | | |
| Hint-blue digit | #1565c0 | #dbeafe | | |
| Hint-yellow digit | #c15000 | #fff4e0 | | |
| Hint-purple digit | #6a1b9a | #f5e6ff | | |
| Difficulty badge | #4361ee | #dde4ff | | |
| Body text | #1c1c2e | #ffffff | | |
| Secondary text | #5a5a7a | #ffffff | | |

### 3B — Dark theme text contrast (AC2)
Repeat AC1 measurements using `html.dark` variable values.

### 3C — Contrast failures → severity (AC3)
- [ ] Any ratio < 4.5:1 for normal text → High severity, WCAG 1.4.3 failure
- [ ] Any ratio < 3:1 for UI components → High severity, WCAG 1.4.11 failure

### 3D — Conflict state color dependency (AC4)
- [ ] Verify non-color indicator exists alongside red background
- [ ] `--hl-conflict-txt` color change: is text color alone sufficient?
- [ ] Classify WCAG 1.4.1 pass or fail

### 3E — Selected cell color dependency (AC5)
- [ ] Verify `inset 0 0 0 2px var(--accent)` box-shadow is a non-color indicator
- [ ] Classify WCAG 1.4.1 pass or fail

### 3F — digit-complete state (AC6)
- [ ] `.digit-complete` uses muted color (`--pad-done`) as only state indicator
- [ ] No strikethrough, icon, text, or `disabled` attribute
- [ ] Classify as WCAG 1.4.1 failure if color is the sole indicator

### 3G — Difficulty badge contrast (AC7)
- [ ] Light: `--accent` (#4361ee) on `--accent-light` (#dde4ff) — measure ratio
- [ ] Dark: corresponding dark variables — measure ratio
- [ ] Classify any failure

### 3H — Mistake pip contrast (AC8)
- [ ] Light: `--hl-wrong` (#ef5350) on `--surface` (#ffffff) — measure ratio
- [ ] Dark: `--hl-wrong` (#ef5350) on `--surface` (#1a1a2e) — measure ratio
- [ ] Classify against WCAG 1.4.11 (non-text component)

### 3I — Pencil mark contrast (AC9)
- [ ] Light: #8888aa on #ffffff — measure ratio (known likely fail ~2.9:1)
- [ ] Dark: #606088 on #1a1a2e — measure ratio
- [ ] Classify against WCAG 1.4.3 (pencil marks are functional text)

### 3J — Daily status classes (AC10)
- [ ] `.daily-status-completed` — measure text/bg contrast in both themes
- [ ] `.daily-status-in_progress` — measure contrast in both themes
- [ ] `.daily-status-not_started` — measure contrast in both themes
- [ ] Each status communicates via means other than color alone

### 3K — Hint highlight non-text contrast (AC11)
- [ ] `--hint-blue-bg` vs `--cell-bg` → measure ratio (target ≥ 3:1)
- [ ] `--hint-yellow-bg` vs `--cell-bg` → measure ratio
- [ ] `--hint-purple-bg` vs `--cell-bg` → measure ratio

### 3L — Reduced motion (AC12)
- [ ] `conflict-pulse` animation suppressed under `prefers-reduced-motion: reduce`
- [ ] `cell-pop` suppressed
- [ ] `cell-wrong` and `cell-shake` suppressed
- [ ] No perceptible animation remains under reduce media query

### 3M — Flash threshold (AC13)
- [ ] `cell.wrong` animation: duration 0.45s, flash is not > 3 Hz
- [ ] Only 1 cell flashes at a time — 25% viewport threshold not breached
- [ ] Classify WCAG 2.3.1 pass

### 3N — Focus ring contrast (AC14)
- [ ] Light: `--accent` (#4361ee) ring on `--cell-bg` (#ffffff) → measure (target ≥ 3:1)
- [ ] Dark: `--accent` (#7b8fff) ring on `--cell-bg` (#1a1a2e) → measure
- [ ] Button `outline: 3px solid var(--accent)` → same check
- [ ] Classify any failure against WCAG 1.4.11

---

## Domain 4: Touch Accessibility (Req 4)

### 4A — All controls at 375px viewport (AC1, AC2)

| Control | Expected size | Measured W | Measured H | Pass/Fail |
|---------|--------------|-----------|-----------|-----------|
| Grid cell | ~43px (444÷9−gap) | | | |
| Numpad digit btn | ~43px (aspect 1:1) | | | |
| Toolbar `.tool-btn` | min-width 44px | | | |
| `#btn-daily` | 38×38 | | | |
| `#btn-stats` | 38×38 | | | |
| `#btn-settings` | 38×38 | | | |
| `#btn-dark` | 38×38 | | | |
| `#btn-settings-close` | 32×32 | | | |
| Other drawer close btns | 32×32 | | | |
| `.hint-action-btn` | measure | | | |
| `.library-item-btn` | 28×28 | | | |
| `.daily-cal-cell` | measure | | | |

### 4B — Library item buttons (AC3)
- [ ] `.library-item-btn` rendered at 28×28 px → below minimum
- [ ] Check for padding or pseudo-element expansion to ≥ 44px
- [ ] Classify: Critical / Major / Minor

### 4C — Drawer close buttons (AC4)
- [ ] `#btn-settings-close` and equivalent 32×32 px close buttons → below minimum
- [ ] No touch expansion observed in CSS
- [ ] Classify: Major

### 4D — Scrim coverage (AC5)
- [ ] All 7 scrims use `position: fixed; inset: 0` → full viewport coverage
- [ ] No scrim is clipped or offset incorrectly

### 4E — Safe area insets (AC6)
- [ ] `#settings-drawer`: `padding-bottom: max(24px, env(safe-area-inset-bottom))`
- [ ] `#stats-panel`: same rule confirmed
- [ ] Remaining 5 panels: check for equivalent rule or classify gap

### 4F — viewport-fit=cover and env() pairing (AC7)
- [ ] `viewport-fit=cover` present in meta viewport tag — confirmed
- [ ] All `env(safe-area-inset-*)` usages in CSS — enumerate
- [ ] No interactive element positioned at top/bottom edge without safe-area padding

### 4G — Label in Name (AC8)
- [ ] `#btn-dark`: no visible text, `aria-label="Toggle dark mode"` — WCAG 2.5.3 compliant
- [ ] Each `.tool-btn`: visible `.tool-label` matches `aria-label` — verify
- [ ] Any icon-only button with no `aria-label` — classify WCAG 2.5.3 failure

### 4H — Daily calendar cell size and labels (AC9)
- [ ] Each `.daily-cal-cell` rendered ≥ 44×44 px at 375px viewport
- [ ] Each cell has `aria-label` with date + status text
- [ ] Any cell < 44px → Major; any cell without label → classify WCAG 4.1.2

### 4I — Zoom not blocked (AC10)
- [ ] `<meta name="viewport">` does not contain `user-scalable=no`
- [ ] `<meta name="viewport">` does not contain `maximum-scale=1` or lower
- [ ] Pinch-to-zoom works on iOS Safari and Android Chrome

---

## Output Checklist

- [ ] All findings documented with ID, title, description, affected components, WCAG criterion,
      severity (H/M/L), effort (S/M/L), and recommended fix
- [ ] Quick Wins section populated (High/Medium severity + Small effort)
- [ ] Recommended implementation order drafted (Phase 1→4)
- [ ] WCAG compliance summary table completed for all 13 criteria in scope
- [ ] Finding count summary: total High / Medium / Low / Grand total
- [ ] Theme-specific findings noted where applicable
