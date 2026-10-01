# Phase 11.6 - Manual Release Validation Checklist

**Purpose:** Record manual accessibility, device, offline, persistence, and mobile acceptance for the release candidate.
**Engineering status:** Phase 11 implementation is complete. Automated baseline: 633 tests pass; `npm run verify` passes.
**Release status:** Pending completion and sign-off of this checklist. Automated checks do not replace these manual runs.

## Sign-off Record

- Release/version or commit: ______________________________
- Test lead: ______________________________
- Test dates: ______________________________
- Test environment/profile: ______________________________
- Open issue links: ______________________________
- Final recommendation: `[ ] Approve` `[ ] Reject` `[ ] Approve with documented exception`

For each check, record `PASS`, `FAIL`, `BLOCKED`, or `N/A`, plus the device/OS/browser/assistive-technology version and concise evidence. `BLOCKED` is not a pass. Use `N/A` only for the conditional JAWS run, with a reason.

## Pass/Fail Criteria

**PASS:** The expected interaction completes without loss of game state, inaccessible content, keyboard trap, unannounced critical status, unusable control, or horizontal overflow. Record the tested build and evidence.

**FAIL:** Any required flow fails, focus or game state is lost, an important state cannot be perceived, a storage failure is silent, a screen-reader user cannot complete a core action, or a target viewport clips/overlaps controls or scrolls horizontally. File an issue and rerun the affected section after correction.

**BLOCKED:** Required hardware, OS, browser, assistive technology, or staging build is unavailable. Record what is missing, who owns access, and the residual release risk. A blocker in required coverage prevents full accessibility/mobile sign-off.

**N/A:** JAWS only, when it is not available or not in the supported test scope. Include the rationale; do not mark other required platforms N/A to save time.

## 1. Screen Reader Testing

Run the common checks on each applicable platform below. Use a fresh app session, then repeat dialog and save-warning checks during gameplay.

### Common checks

- [ ] The page exposes a meaningful title and landmarks; header, game statistics, game tools, and Sudoku grid are identifiable.
- [ ] Grid is announced as a 9-by-9 Sudoku grid. Moving with arrow keys announces row, column, cell value/empty state, and selection as expected.
- [ ] Given clues are distinguishable from player entries. Pencil candidates are announced as candidates, not as placed digits.
- [ ] Digit placement, erase, mistake, hint, pause/resume, and game-end messages are understandable and do not produce repeated or excessively noisy announcements.
- [ ] Numpad labels include the digit and remaining count; selected/pressed and disabled states are exposed.
- [ ] Settings, Statistics, Daily, Analysis, Import, generic confirmation, Hint, Step Solver, Library, and Pause dialogs have useful names and modal state.
- [ ] Opening a dialog moves focus inside. Tab and Shift+Tab remain within it; Escape or the documented close/resume action works; closing returns focus to the opener or the documented underlying dialog.
- [ ] Background game content is not reachable while a modal is active. Nested dialogs restore the underlay without exposing hidden content.
- [ ] Trigger a storage write failure. The warning is announced politely, explains that progress may not be saved, does not take focus, and disappears after a successful retry.

### Platform runs

- [ ] **NVDA - Windows + Chrome or Firefox:** complete common checks, including grid navigation, dialog cycling/restoration, and save-failure warning. Version: __________ Result/evidence: __________
- [ ] **JAWS - Windows + Chrome or Edge, if applicable/available:** complete common checks, especially grid semantics, dialog cycling, and live announcements. Version: __________ Result/evidence or N/A reason: __________
- [ ] **VoiceOver - macOS + Safari:** complete common checks with keyboard navigation and rotor/landmark navigation. OS/browser/SR versions: __________ Result/evidence: __________
- [ ] **VoiceOver - iOS + Safari installed PWA:** complete common checks using touch exploration and hardware keyboard if available. Device/OS/SR versions: __________ Result/evidence: __________
- [ ] **TalkBack - Android + Chrome installed PWA:** complete common checks using touch exploration and switch/keyboard navigation if available. Device/OS/SR versions: __________ Result/evidence: __________

## 2. Keyboard-Only Testing

Use keyboard only from a fresh page load. Do not use a pointer to recover focus during a run.

- [ ] Tab reaches the game grid as one stop, not 81 separate cells; selected cell and visible focus indicator agree.
- [ ] Arrow keys move one cell in the requested direction, do not wrap at row/board boundaries, and do not scroll the page while navigating the grid.
- [ ] Digit keys enter values in the selected cell; pencil mode toggles candidates; Delete/Backspace/0 erase; undo/redo and hint shortcuts still work.
- [ ] Shortcuts do not mutate the game when a button/input or modal owns focus. Disabled controls remain unavailable and understandable.
- [ ] Header, numpad, toolbar, settings actions, and all dialogs are reachable and operable with Enter/Space where appropriate.
- [ ] Pause opens the dialog and moves focus to Resume. Tab/Shift+Tab stay inside; Escape resumes; focus returns correctly; paused game inputs do not change the board.
- [ ] Opening and closing each required panel/dialog keeps focus contained and restores it to the triggering control. Test nested Import/Analysis from Settings and confirmation modal from Statistics.
- [ ] No keyboard trap prevents a user from closing/resuming a panel. Escape closes only the topmost applicable surface.
- [ ] [ ] Result/evidence: __________ Issues: __________

## 3. Installed PWA Testing

Use actual installed/standalone apps, not only a browser tab. Record device model, OS version, browser version, display mode, and build.

- [ ] **Android Chrome:** install via Chrome's supported install flow; launch from the home screen/app launcher; confirm standalone display, icon, theme, layout, touch play, pause/resume, and saved progress.
- [ ] Switch away, lock the screen, and return. The game remains paused after backgrounding and requires explicit resume; elapsed time does not include background duration.
- [ ] **iOS Safari:** install using Share > Add to Home Screen; launch from the home screen; confirm standalone display, safe areas, icon, layout, touch play, pause/resume, and saved progress.
- [ ] Switch apps, lock the screen, and return. Confirm explicit resume is required and board/timer state is preserved.
- [ ] Rotate orientation while installed. No controls become unreachable or overlap; dialogs remain usable and respect safe areas.
- [ ] [ ] Android result/evidence: __________
- [ ] [ ] iOS result/evidence: __________

## 4. Offline and Service-Worker Testing

### First install and offline relaunch

- [ ] Start from a clean browser profile with network available. Load the app, wait for service-worker registration/activation to complete, and confirm the app shell/assets are cached before disconnecting.
- [ ] Install the PWA while online. Then enable airplane mode/disable network, force-close the app, and relaunch from its installed icon.
- [ ] The app shell, styles, icons, puzzle grid, local puzzle generation, game controls, hints, and local saves remain usable offline. No blank page, uncaught error, or endless loading state appears.
- [ ] While offline, play and save progress; close/relaunch offline and verify the latest state restores.
- [ ] Clarification: first installation requires network access to obtain the app and service worker. The offline acceptance begins after the first successful online load/install and cache activation.

### Service-worker update flow

- [ ] Use a staging deployment with installed build A, then publish build B with an updated cache version/assets.
- [ ] While online, launch build A and verify the update notification appears only when an update is available. Dismissing it does not interrupt play.
- [ ] Keep a game in progress while the update is available. Applying the update does not erase standard, daily, or imported game saves; the new assets load successfully after refresh/relaunch.
- [ ] Go offline after the update is staged but before applying it. The current cached build remains playable; no partially updated blank/broken app appears.
- [ ] Record both build identifiers and cache versions: A __________ B __________ Result/evidence: __________

## 5. Persistence Testing

Perform refresh and force-close/relaunch checks. Confirm board, candidates, timer, mistakes, undo/redo where applicable, and pause state.

- [ ] **Standard game:** start a generated puzzle, enter digits/candidates, make a mistake if appropriate, use undo/redo, reload, and verify the saved state restores accurately.
- [ ] **Daily challenge:** start today's challenge, make progress, reload, and verify the same date/puzzle/progress restores. Confirm the daily save remains separate from standard-game state.
- [ ] **Imported puzzle:** import a valid unique puzzle, make progress, reload, and verify the imported puzzle and game state restore.
- [ ] **Pause/resume:** pause each applicable timed game, reload, and verify it restores paused with no background time added. Resume explicitly and verify exactly one timer advances.
- [ ] **Write failure:** simulate denied storage or a quota/write exception. Verify the non-modal warning says progress may not be saved, gameplay remains usable, repeated failures do not spam announcements, and a later successful write clears the warning.
- [ ] After each recovery, verify the next successful write restores normal persistence without clearing or replacing the wrong game slot.
- [ ] Result/evidence: __________ Issues: __________

## 6. Mobile Usability Testing

Use browser responsive mode for viewport coverage and at least one real phone for touch validation. Test both themes where practical.

- [ ] **320 CSS-pixel width:** grid remains square; no horizontal page/app/keypad/toolbar scrolling; header, numpad, and toolbar targets are at least 44x44 CSS px; text and labels fit.
- [ ] **375 CSS-pixel width:** same checks; verify all digits/actions are visible and adjacent grid cells can be selected accurately by touch.
- [ ] **Tablet:** test 768px or 1024px width in portrait and landscape. Grid remains square, keypad/toolbar layout is stable, and no excessive unused scaling or clipping harms play.
- [ ] Measure/inspect header controls, numpad buttons, toolbar controls, and close buttons; record any target below the 44x44 project minimum or any documented exception. Header ______ Numpad ______ Toolbar ______ Close controls ______
- [ ] Dialogs, save warning, and update notification do not cover essential controls, exceed viewport bounds, or become unreachable near notches/home indicators.
- [ ] No horizontal scrolling, clipped text, overlapping controls, accidental adjacent-cell activations, or reliance on hover is observed.
- [ ] Viewport/device notes: __________ Result/evidence: __________ Issues: __________

## Final Release Sign-off

- [ ] All required platform and workflow checks pass, or exceptions are explicitly approved and recorded.
- [ ] No open release-blocking accessibility, data-loss, offline-startup, or mobile-usability defects remain.
- [ ] Failed checks have linked issue IDs and owner/retest status: __________
- [ ] Final `npm run verify` passes on the exact release candidate: build __________ typecheck __________ tests __________
- [ ] Release owner confirms tested scope and does not claim full WCAG conformance beyond the verified evidence.

Tester: ____________________ Date: __________ Release owner: ____________________ Decision: __________

## Estimated Effort and Recommendation

Plan **12-16 tester-hours** for one complete pass, evidence capture, triage, and focused retesting. Allow **1-2 additional hours** if JAWS is applicable and available. Device/OS setup, release deployment for the service-worker update test, and remediation time are not included; access delays can extend calendar time.

**Recommendation:** Do not release until all required checks pass on the release candidate, both installed mobile platforms have been exercised, and no critical failures remain. If a required platform is unavailable, record it as blocked and obtain an explicit release-risk exception rather than treating it as passed. Run the final automated `npm run verify` after any remediation.