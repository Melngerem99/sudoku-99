# Implementation Plan: Accessibility Initiative (WCAG 2.1 AA)

## Overview

Implement accessibility remediation across Sudoku-99 in five ordered phases, progressing from
zero-risk HTML/CSS quick wins through screen-reader announcements, focus management, contrast
fixes, and finally roving tabindex. Each phase is independently deployable and builds on the
previous. All code is TypeScript/HTML/CSS; tests use Vitest + fast-check.

---

## Tasks

- [x] 1. Phase 1 — Quick Wins
  - [x] 1.1 Add live-region attributes to `#difficulty-badge` and add `#sr-announce` / `#sr-status` elements in `web/index.html`
    - In `web/index.html`, add `aria-live="polite"` and `aria-atomic="true"` to the existing `#difficulty-badge` element.
    - Before `</body>`, add the `#sr-announce` div (`role="status"`, `aria-live="assertive"`, `aria-atomic="true"`, `class="sr-only"`).
    - Before `</body>`, add the `#sr-status` div (`aria-live="polite"`, `aria-atomic="true"`, `class="sr-only"`).
    - These elements are prerequisites for Phase 2 announcement wiring.
    - _Requirements: 2.6, 2.2 (prep), 7.3_

  - [x] 1.2 Add `aria-hidden="true"` to pencil-mark container and digit badge in `src/ui/ui.ts`
    - In `buildGrid`: set `aria-hidden="true"` on the `.pencil-marks` container div and on each `.mark` span at creation time.
    - In `buildDigitButtons`: set `aria-hidden="true"` on each `digit-badge` span so the badge text does not pollute the button's accessible name.
    - _Requirements: 2.3, 2.11_

  - [x] 1.3 Update `setDigitCounts` in `src/ui/ui.ts` to include remaining-count in button `aria-label`
    - For each digit button, compute `remaining = 9 - counts[d]`.
    - Set `aria-label` to `"Digit ${d}, ${remaining} remaining"` when `remaining > 0`, or `"Digit ${d}, complete"` when `remaining === 0`.
    - _Requirements: 2.11_

  - [x] 1.4 Add `aria-label` to daily calendar cells in `src/controllers/daily-controller.ts`
    - In the `populate()` function, after computing the cell's status class, derive a human-readable `fullDate` string using `toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" })`.
    - Map the status class to a readable label (`"Completed"`, `"In progress"`, `"Not started"`).
    - Set `cell.setAttribute("aria-label", \`${fullDate} — ${statusLabel}\`)`.
    - _Requirements: 2.14, 4.9_

  - [x] 1.5 Add `::before` touch-target expansion for close buttons and `.library-item-btn` in `web/style.css`
    - For all seven drawer close buttons (`#btn-settings-close`, `#btn-stats-close`, `#btn-daily-close`, `#btn-step-close`, `#btn-analysis-close`, `#btn-library-close`, `#hint-close`): add a `position: relative` rule and a `::before` pseudo-element that is `width: 44px; height: 44px`, centered via `transform: translate(-50%, -50%)`, with `position: absolute`.
    - Apply the same `::before` technique to `.library-item-btn` (currently 28×28 px), expanding to 44×44 px effective target.
    - _Requirements: 4.2, 4.3, 4.4, 9.2_

  - [ ]* 1.6 Write unit tests for Phase 1 HTML and UI changes
    - Assert `#difficulty-badge` has `aria-live="polite"` and `aria-atomic="true"` in the rendered DOM.
    - Assert `#sr-announce` exists with `aria-live="assertive"`.
    - Assert `#sr-status` exists with `aria-live="polite"`.
    - Assert every `.pencil-marks` element built by `buildGrid` has `aria-hidden="true"`.
    - Assert every `.mark` span built by `buildGrid` has `aria-hidden="true"`.
    - Assert `digit-badge` span in each numpad button has `aria-hidden="true"` after `buildDigitButtons`.
    - Call `setDigitCounts` with 6 fives placed → assert `aria-label="Digit 5, 3 remaining"`. All 9 fives placed → assert `aria-label="Digit 5, complete"`.
    - Assert every `.daily-cal-cell` produced by `populate()` has a non-empty `aria-label` matching `/<month> <day>, <year> — (Completed|In progress|Not started)/`.
    - _Requirements: 2.11, 2.14, 4.9, 9.2_

- [x] 2. Phase 1 checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 3. Phase 2 — Screen Reader Core
  - [x] 3.1 Create `src/ui/accessibility.ts` with `announce()` and `setAppAriaHidden()`
    - Export `function announce(msg: string, politeness?: 'assertive' | 'polite'): void`.
    - `announce` writes to `#sr-announce` (assertive, default) or `#sr-status` (polite).
    - Use the double-write pattern: clear `textContent = ""`, then set in `requestAnimationFrame` to force re-announcement of repeated strings.
    - Export `function setAppAriaHidden(hidden: boolean): void` that sets `aria-hidden` on `#app`.
    - _Requirements: 2.2, 7.1_

  - [x] 3.2 Update `updateCell` in `src/ui/ui.ts` to write all cell ARIA state attributes
    - After computing `val`, `isGiven`, `isSelected`, and `conflicts`, set:
      - `aria-label` = `"Row ${row}, Column ${col}: ${valueText}${pencilText}"` (pencilText only when `val === 0` and candidates present).
      - `aria-selected` = `"true"` | `"false"`.
      - `aria-invalid` = `"true"` when cell index is in the `conflicts` Set; remove the attribute otherwise.
      - `aria-readonly` = `"true"` when `isGiven`.
    - _Requirements: 2.1, 6.7_

  - [ ]* 3.3 Write property test for cell `aria-label` round-trip (P1)
    - **Property P1: Cell aria-label round-trip**
    - **Validates: Requirements 2.1, 6.7**
    - Use fast-check to iterate all i in 0..80. After `renderBoard` call, parse `cells[i].getAttribute("aria-label")` to extract R and C, then assert `(R-1)*9+(C-1) === i`.

  - [x] 3.4 Wire `announce()` calls into `src/game-controller.ts`
    - Import `announce` from `./ui/accessibility`.
    - In `placeDigit`: compute row/col from selected index and call `announce()` with the appropriate message format (correct placement, wrong placement, pencil add/remove) as specified in design section 6.2.
    - In `eraseCell`: call `announce(\`Row ${row}, Column ${col} cleared\`)`.
    - In `endGame`: call `announce()` with win or loss message (design section 6.3) before calling `showModal`.
    - _Requirements: 2.2, 7.1_

  - [ ]* 3.5 Write property test for announcement coverage (P5)
    - **Property P5: Announcement fires on every digit placement**
    - **Validates: Requirements 2.2, 7.1**
    - Use fast-check to sample `d` in 1..9 and `i` in 0..80 (729 combinations). For each, call `placeDigit(d)` with `selectedIdx = i` and assert `#sr-announce.textContent !== ""` within 100ms (use fake timers).

  - [x] 3.6 Fix `#timer` `aria-live` and add 60-second polite announcement
    - In `web/index.html`, change `#timer` from `aria-live="polite"` to `aria-live="off"`.
    - In `src/game-controller.ts` (or wherever `startTimer` lives), add a `setInterval` branch that calls `announce(\`Elapsed: ${m} minute${m !== 1 ? "s" : ""}.\`, 'polite')` every 60 seconds.
    - _Requirements: 2.5, 7.3_

- [x] 4. Phase 2 checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 5. Phase 3 — Focus Management
  - [x] 5.1 Add `FocusTrap` class to `src/ui/accessibility.ts`
    - Implement `FocusTrap` with `constructor({ container, onEscape })`, `activate()`, and `deactivate()` as specified in design section 5.4 / section 9.
    - `activate()` attaches a `keydown` listener that: on `Escape` calls `onEscape`; on `Tab`/`Shift+Tab` cycles focus within the container's focusable descendants.
    - `deactivate()` removes the `keydown` listener.
    - `FOCUSABLE_SELECTORS` must exclude elements inside `[aria-hidden="true"]` descendants.
    - _Requirements: 1.5, 6.5, 6.6_

  - [ ]* 5.2 Write property test for focus-trap Tab cycling (P3)
    - **Property P3: Focus trap Tab cycling**
    - **Validates: Requirements 1.5, 6.5**
    - For each of the nine panel containers (settings, hint, stats, daily, step-solver, analysis, library, import, modal): after `FocusTrap.activate()`, simulate `Tab` from the last focusable element and assert focus moves to the first; simulate `Shift+Tab` from the first and assert focus moves to the last.

  - [-] 5.3 Apply `FocusTrap` to `#hint-panel` and fix focus return in `src/ui/ui.ts`
    - In `web/index.html`, change `#hint-panel` from `role="complementary"` to `role="dialog" aria-modal="true"`.
    - In `showHintPanel`: instantiate a `FocusTrap` for `#hint-panel` with `onEscape: () => hideHintPanel()`, call `trap.activate()`, and call `setAppAriaHidden(true)`.
    - In `hideHintPanel`: call `trap.deactivate()`, call `setAppAriaHidden(false)`, then focus `#btn-hint`.
    - _Requirements: 1.5, 2.4, 2.7, 6.6_

  - [-] 5.4 Fix focus return in `src/controllers/library-controller.ts`
    - In `close()`: add `document.getElementById("btn-library")?.focus()` after the panel is hidden.
    - In `open()`: call `setAppAriaHidden(true)` and `focusTrap.activate()`.
    - In `close()`: call `focusTrap.deactivate()` and `setAppAriaHidden(false)`.
    - _Requirements: 1.6, 6.6_

  - [-] 5.5 Fix focus return in `src/controllers/step-solver-controller.ts`
    - In `close()`: add `document.getElementById("btn-step-solve")?.focus()` after the panel is hidden.
    - After auto-play sequence completes: focus `#step-btn-play`.
    - In `open()` / `close()`: add `FocusTrap` activation / deactivation and `setAppAriaHidden` calls.
    - _Requirements: 1.9, 6.6_

  - [ ] 5.6 Fix `hideModal` focus return and apply `setAppAriaHidden` to all remaining panel open/close in `src/ui/ui.ts`
    - In `showModal`: record the current `document.activeElement` as `modalTrigger`. Call `setAppAriaHidden(true)`.
    - In `hideModal`: call `setAppAriaHidden(false)` and restore focus to `modalTrigger`.
    - For any remaining panel open/close paths in `ui.ts` not already covered (settings drawer, stats, daily, analysis): audit and confirm `setAppAriaHidden(true/false)` is called symmetrically.
    - _Requirements: 1.5, 1.6, 2.7, 6.6_

  - [ ]* 5.7 Write focus restoration property test (P4)
    - **Property P4: Focus restoration after panel close**
    - **Validates: Requirements 1.6, 6.6**
    - For all nine panels: simulate `open(panel)` with a known trigger element, then `close(panel)`, and assert `document.activeElement === triggerElement`.

- [~] 6. Phase 3 checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 7. Phase 4 — Color and Visual
  - [~] 7.1 Measure all CSS variable contrast pairs (light + dark) and fix pencil-mark contrast in `web/style.css`
    - Compute WCAG relative luminance ratios for all 22 text and UI component color pairs in the `:root` block (Requirement 3, AC1 and AC2) and the `html.dark` overrides (Requirement 3, AC2).
    - Fix `--cell-pencil` in light theme (`#8888aa` on `#ffffff` = ~3.5:1, below 4.5:1): increase luminance to achieve ≥ 4.5:1 while preserving muted visual appearance (e.g., `#767699` → measure and confirm).
    - Fix `--cell-pencil` dark theme (`#606088` on `#1a1a2e`) if contrast is also below 4.5:1.
    - Document all other findings; fix any additional failures.
    - _Requirements: 3.1, 3.2, 3.9, 8.7_

  - [~] 7.2 Add non-color indicator for `digit-complete` state in `web/style.css`
    - The `.digit-complete` state currently communicates completion via CSS opacity/color only (WCAG 1.4.1 failure).
    - Add a visual non-color indicator: either a CSS `text-decoration: line-through` on the digit number within the button, or a `::after` checkmark, or toggle the HTML `disabled` attribute on the button (preferred if it does not break numpad UX).
    - The `aria-label` update from task 1.3 ("Digit N, complete") already provides the accessible-name non-color indicator.
    - _Requirements: 3.6, 2.11_

  - [~] 7.3 Verify conflict cell non-color indicator in `web/style.css`
    - Check whether the existing `--hl-conflict-txt` text color change alone satisfies WCAG 1.4.1 for conflict cells.
    - If the color change is the sole differentiator, add a subtle pattern or `outline` to `.cell.conflict` that is distinct without color.
    - `aria-invalid="true"` (added in task 3.2) already provides the AT non-color indicator.
    - _Requirements: 3.4_

  - [ ]* 7.4 Write contrast property tests (P6, P7) in `web/tests/accessibility/contrast-pbt.test.ts`
    - **Property P6: Contrast symmetry** — `contrast(a, b) === contrast(b, a)`. Use fast-check to sample color pairs.
    - **Property P6b: Contrast identity** — `contrast(x, x) === 1.0`.
    - **Property P7: All text pairs ≥ 4.5:1** — enumerate all `:root` text color / background pairs from the design and assert ratio ≥ 4.5.
    - **Property P7b: Dark theme overrides ≥ threshold** — same check for `html.dark` overrides.
    - **Validates: Requirements 8.3, 8.4, 8.1, 8.5**

- [~] 8. Phase 4 checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 9. Phase 5 — Grid Roving Tabindex
  - [~] 9.1 Implement roving tabindex in `buildGrid` in `src/ui/ui.ts`
    - At grid build time, cell index 0 gets `tabindex="0"`; all other 80 cells get `tabindex="-1"`.
    - Track the currently-tabindex-zero cell so it can be updated when selection changes.
    - _Requirements: 1.1, 1.3, 6.1_

  - [~] 9.2 Update `selectCell` in `src/ui/ui.ts` to move `tabindex="0"` to the newly selected cell
    - When `selectCell(idx)` is called, set `cells[idx].tabIndex = 0` and set the previously-selected cell back to `tabIndex = -1`.
    - Handle the initial state (no previous selection) gracefully.
    - _Requirements: 1.1, 6.1_

  - [~] 9.3 Update arrow-key handlers in `src/ui/ui.ts` / `src/game-controller.ts` to keep roving tabindex in sync
    - After each `ArrowRight / ArrowLeft / ArrowDown / ArrowUp` key event calls `selectCell(newIdx)`, ensure the arrow-key handler also calls `cells[newIdx].focus()` to match the roving tabindex behavior.
    - Confirm the existing `cells[newIdx].focus()` calls are present; add them where missing.
    - _Requirements: 1.1, 6.1, 6.2, 6.3, 6.4_

  - [ ]* 9.4 Write property tests for arrow navigation bounds (P2) in `web/tests/accessibility/keyboard-pbt.test.ts`
    - **Property P2: Arrow navigation bounds**
    - **Validates: Requirements 1.1, 6.1, 6.2, 6.3, 6.4**
    - Use fast-check to iterate all i in 0..80 for each of the four arrow directions. Fire the corresponding `keydown` event on `cells[i]` and assert `selectCell` is called with the correct target index (or stays at i at boundaries).

  - [ ]* 9.5 Write roving tabindex unit tests in `web/tests/accessibility/keyboard.test.ts`
    - After `buildGrid`, assert `cells[0].tabIndex === 0` and all others `=== -1`.
    - After `selectCell(idx)`, assert `cells[idx].tabIndex === 0` and all others `=== -1`.
    - Assert that arrow-key navigation updates both `selectedIdx` and the DOM `tabIndex`.
    - _Requirements: 1.1, 6.1_

- [~] 10. Final checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

---

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP delivery.
- Each task references specific requirements by their number (e.g., `2.6` = Requirement 2, AC6).
- Phases must be executed in order; each phase's changes are prerequisites for the next.
- Property P1 (task 3.3) depends on `updateCell` ARIA changes in task 3.2.
- Property P5 (task 3.5) depends on `announce()` wiring in task 3.4.
- Property P3/P4 tests (tasks 5.2, 5.7) depend on the `FocusTrap` implementation in task 5.1.
- The `fast-check` library must be installed (`npm install --save-dev fast-check`) if not already present.
- Contrast tests in task 7.4 require a WCAG relative-luminance helper; implement it at the top of the test file before the property assertions.

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2"] },
    { "id": 1, "tasks": ["1.3", "1.4", "1.5"] },
    { "id": 2, "tasks": ["1.6", "3.1"] },
    { "id": 3, "tasks": ["3.2", "3.6"] },
    { "id": 4, "tasks": ["3.3", "3.4"] },
    { "id": 5, "tasks": ["3.5", "5.1"] },
    { "id": 6, "tasks": ["5.2", "5.3", "5.4", "5.5", "5.6"] },
    { "id": 7, "tasks": ["5.7", "7.1"] },
    { "id": 8, "tasks": ["7.2", "7.3"] },
    { "id": 9, "tasks": ["7.4", "9.1"] },
    { "id": 10, "tasks": ["9.2"] },
    { "id": 11, "tasks": ["9.3"] },
    { "id": 12, "tasks": ["9.4", "9.5"] }
  ]
}
```
