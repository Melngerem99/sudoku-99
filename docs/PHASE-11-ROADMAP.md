# Phase 11 - Accessibility and Mobile Readiness

**Status:** Engineering complete; manual release sign-off pending
**Baseline:** 633 automated tests pass and `npm run verify` passes. Phase 11.1-11.5 engineering work is implemented. Manual accessibility and installed-device acceptance remain outstanding.
**Scope:** Track implementation and close the release gate using the [Phase 11.6 manual validation checklist](PHASE-11.6-MANUAL-VALIDATION-CHECKLIST.md).

## Prioritized Backlog

All six findings are release work because the project explicitly targets accessible keyboard play, mobile PWA use, and reliable local saves. The order below favors core play and release-blocking risks; implementation can parallelize the independent contrast and storage-message tasks.

### Must Fix Before Release

#### 1. Complete keyboard grid navigation and roving focus

**User impact:** Keyboard-only players need to move efficiently through the 81-cell board and reliably know which cell will receive input. Incomplete focus movement can make ordinary play slow or impossible.

**Accessibility impact:** High. The grid must support keyboard operation and expose a predictable focus location; this is central to WCAG 2.1.1 Keyboard and the project's WAI-ARIA grid interaction model.

**Effort:** Medium, 4-6 engineering hours, including focused tests.

**Risk:** Medium. Grid arrow handling can conflict with page scrolling, digit shortcuts, selection state, or focus restoration from panels.

**Acceptance criteria:**
- Exactly one grid cell is in the page Tab sequence; the selected or initial cell has `tabindex="0"`, and other cells have `tabindex="-1"`.
- Arrow keys move focus and selection by the expected row/column, stop at board edges without wrapping, and keep `tabindex` synchronized.
- Digit, erase, and pencil shortcuts continue to work for the focused/selected cell and do not fire while a modal or unrelated text input owns focus.
- Keyboard-only tests cover all four directions, all boundaries, selection/focus synchronization, and one Tab entry into the grid.

#### 2. Contain and restore focus for every modal and panel

**User impact:** A player using a keyboard or screen reader must not tab into obscured game controls while a dialog is open and must return to the control that opened it after closing.

**Accessibility impact:** High. An `aria-modal="true"` dialog without effective focus containment and restoration presents misleading modality and can strand keyboard users.

**Effort:** Medium to large, 6-10 engineering hours, including layered-dialog tests.

**Risk:** High. Several panels and the Phase 10 pause surface can overlap; inconsistent close paths can restore focus to hidden or stale controls.

**Acceptance criteria:**
- Every modal/panel moves focus inside on open, wraps Tab and Shift+Tab among its usable controls, and handles Escape according to its documented close/resume behavior.
- Closing restores focus to the opening control when that control remains available; covered dialogs restore the correct prior focus and accessibility state.
- Background content is unavailable to assistive technology while a modal is active, without hiding the active dialog.
- Tests cover every panel, no-focusable-control handling, Escape, nested/covered surfaces, and restoration after close.

#### 3. Meet touch target sizing for primary and secondary controls

**User impact:** Small cells, numpad controls, toolbar buttons, and close controls are harder to activate accurately on phones, especially one-handed or with motor impairments.

**Accessibility impact:** Medium to high. The project steering sets a 44x44 CSS-pixel minimum. The strict 44px target maps to WCAG 2.5.5 (AAA); touch-target spacing/size remains an explicit product accessibility requirement even where AA conformance uses a lower threshold.

**Effort:** Medium, 3-5 engineering hours, including responsive layout checks.

**Risk:** Medium. Enlarging hit areas can cause toolbar wrapping, overlap, or accidental activation of neighboring cells at narrow widths.

**Acceptance criteria:**
- Interactive targets have at least a 44x44 CSS-pixel effective hit area, or a documented exception with sufficient spacing and an equally usable alternative.
- No controls overlap, clip, or require horizontal scrolling at 320, 360, 375, 390, and 430 CSS-pixel widths or short landscape.
- Touch activation remains unambiguous for adjacent grid cells and toolbar controls.
- Verify computed hit-area dimensions and perform a touch walkthrough on a narrow mobile viewport.

#### 4. Correct pencil-mark contrast in both themes

**User impact:** Players can miss or misread candidate digits, which are functional information used to solve a puzzle.

**Accessibility impact:** High. Pencil marks are normal-sized text; the project's WCAG 2.1 AA target is at least 4.5:1 against their background in both light and dark themes.

**Effort:** Small, 1-3 engineering hours, including contrast verification and regression coverage.

**Risk:** Low to medium. Darkening the marks may reduce their visual distinction from placed digits or alter the intended muted hierarchy.

**Acceptance criteria:**
- Every pencil-mark foreground/background pair reaches at least 4.5:1 in light and dark themes.
- Candidate marks remain visually distinguishable from placed digits and other cell states.
- Contrast values are documented and checked in automated tests or an equivalent repeatable check.

#### 5. Notify players when saving fails

**User impact:** Without a clear warning, players may close or leave the app believing their progress is safe when storage was denied, full, or unavailable.

**Accessibility impact:** High. The failure must be perceivable without color alone and announced to assistive technology; the message must not unexpectedly steal focus or block play.

**Effort:** Small to medium, 2-4 engineering hours, including failure-path tests.

**Risk:** Medium. Storage failures can be transient or repeated; a misleading success state or noisy repeated announcements would erode trust.

**Acceptance criteria:**
- A failed persistence write produces a clear, non-modal message explaining that current progress may not be saved and what the player can do next.
- The message is announced through an appropriate live region, is not communicated by color alone, and does not block gameplay.
- Successful writes clear or resolve the warning without claiming more durability than local storage provides.
- Tests simulate unavailable storage and quota/write exceptions; the game remains playable and the failure is not silently swallowed.

#### 6. Complete manual accessibility and installed-PWA/device validation

**User impact:** Automated tests and screenshots cannot confirm real touch behavior, screen-reader output, offline startup, or interruption/resume behavior on installed mobile PWAs.

**Accessibility impact:** High. Real keyboard and screen-reader use is needed to confirm focus, announcements, contrast perception, and operation across the implemented flows.

**Effort:** Medium, 4-8 engineering hours, excluding device procurement and wait time.

**Risk:** High residual risk if representative devices or assistive technologies are unavailable; browser automation is not a substitute for the required manual checks.

**Acceptance criteria:**
- Complete a keyboard-only walkthrough covering grid entry, all modal/panel flows, focus return, Escape, and Pause/Resume.
- Record screen-reader results for dialog names, grid navigation/value, save-failure messaging, and pause/resume announcements using VoiceOver or NVDA where available.
- On installed iOS Safari and Android Chrome PWAs, verify install/launch, offline startup and play, update behavior without losing a game, and one background/interruption/resume cycle.
- Record device/OS/browser versions, steps, results, and any limitations. Any critical failure blocks release; unavailable device coverage is recorded as an explicit release risk, not as a pass.

### Should Fix Before Release

None of the six known findings is downgraded to this tier. The acceptance criteria above are release requirements for the stated accessibility and mobile-readiness scope.

### Post-Release Enhancements

- Add repeatable accessibility regression checks to CI, such as targeted axe checks for stable rendered views and automated contrast assertions. These supplement, but do not replace, keyboard, screen-reader, and installed-device testing.
- Expand the manual device matrix beyond representative iOS Safari and Android Chrome coverage as device availability and player usage data justify.

## Phase 11 Sequence and Status

1. **11.1 Keyboard grid operation:** implemented and automated tests pass.
2. **11.2 Modal focus containment:** implemented and automated tests pass.
3. **11.3 Touch target sizing:** implemented and responsive measurements pass.
4. **11.4 Pencil-mark contrast:** implemented; light/dark state contrast tests pass.
5. **11.5 Save-failure messaging:** implemented and failure/recovery tests pass.
6. **11.6 Manual release validation:** checklist prepared; execution and sign-off pending.
7. **Post-release:** consider broader automated accessibility checks and device coverage.

The engineering baseline for Phase 11 is **633 passing tests** with `npm run verify` passing. The manual validation pass is estimated at **12-16 tester-hours**, plus 1-2 hours if JAWS is applicable and available; see the [manual checklist](PHASE-11.6-MANUAL-VALIDATION-CHECKLIST.md).

## Release Gate Recommendation

Keep release readiness conditional until the manual checklist passes on the release candidate and the sign-off record contains device/assistive-technology evidence. Automated verification is necessary but not sufficient for real screen-reader and installed-PWA acceptance. Do not claim full WCAG conformance based only on automated checks; document the tested scope and any unavailable device coverage.

## Highest-Value Next Task

Complete and sign off **11.6, manual release validation**. Implementation is complete; actual assistive-technology, installed-PWA, offline, persistence, and device acceptance is the remaining release gate.

## Source Documents

- [Project handoff](PROJECT-HANDOFF.md)
- [README](../README.md)
- [Feature gap assessment](FEATURE-GAP-ASSESSMENT.md)
- [Phase 10.0 pause/resume plan](PHASE-10.0-PAUSE-RESUME-PLAN.md)
- [Accessibility steering](../.kiro/steering/accessibility.md)
- [Accessibility audit tasks](../.kiro/specs/accessibility-audit/tasks.md)
- [Accessibility audit checklist](../.kiro/specs/accessibility-audit/AUDIT-CHECKLIST.md)
- [PWA support specification](../.kiro/specs/pwa-support/spec.md)
- [Game persistence specification](../.kiro/specs/game-persistence/spec.md)