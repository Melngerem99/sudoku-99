# Phase 10.0 — Pause and Resume

**Status:** Implementation complete; manual device/accessibility acceptance outstanding
**Source:** Top-ranked item FGA-01 in `docs/FEATURE-GAP-ASSESSMENT.md`
**Product priority:** Competitive self-improvement; preserve local-first and offline play

## Implementation Record

- Standard persistence accepts the `imported` game discriminator, so imported games restore their board and paused timer instead of being discarded.
- The inactive pause dialog is both hidden and inert. When Pause covers another dialog, its ARIA/inert state and the prior focus target are restored after Resume or Escape. Focus returns after the toolbar Pause action becomes visible.
- Daily progress remains stored under its captured UTC date. An active-date marker restores the same puzzle after reload across midnight; the Daily panel offers a separate Continue action for an unfinished earlier daily without replacing today's progress.
- Controller integration tests cover pause/resume, timer intervals, blocked input, background transitions, imported-game restore, daily rollover, and covered-dialog focus/accessibility state.
- Automated verification: `npm run verify` passes with 400 tests. Manual keyboard/screen-reader and installed-PWA checks remain outstanding.

## Goal

Let a player suspend an active timed game without losing board state or accruing play time, then resume deliberately. Use one pause lifecycle for generated, imported, and daily puzzles. Keep empty-grid puzzle entry untimed and outside this feature.

### Proposed Clock Contract

The timer measures foreground active-play seconds. Explicit pause and moving the document to the background stop the timer. When the app becomes visible again, it remains paused until the player explicitly resumes. This avoids treating mobile interruptions or a closed tab as active competitive time. Step Solver also suspends the game timer while it is open, as required by its existing spec.

## 1. Functional Requirements

- **FR-1: Pause active game.** Provide a Pause action during active generated, imported, and daily games. Pause does not change board, candidates, undo/redo, mistakes, hints used, or completion state.
- **FR-2: Freeze game time.** While paused, `timerSeconds` does not advance and timer announcements do not fire. Stop the active timer and its periodic checkpoint interval; flush the current save immediately.
- **FR-3: Block play mutations.** While user/background-paused, reject digit placement, erase, pencil toggling, undo, redo, auto-candidate fill, hint use, and any other board-changing game action. Enforce this in controller logic as well as the overlay, so keyboard shortcuts and non-pointer paths cannot bypass it.
- **FR-4: Resume deliberately.** Resume removes user/background pause causes and restarts exactly one timer interval if no other pause cause remains and the game is unfinished. Persist immediately.
- **FR-5: Pause on app background.** On `visibilitychange` to hidden, acquire a background pause and persist it. On return to visible, keep the app paused and require Resume. Do not use wall-clock deltas to add time spent in the background.
- **FR-6: Step Solver integration.** Opening Step Solver pauses the game timer. Closing it releases only its own pause cause; resume only if the game was otherwise running. If a user/background pause also exists, retain that pause. Navigating steps must not alter the saved game board or timer.
- **FR-7: Lifecycle reset.** New game, imported puzzle load, and daily start clear stale pause causes before starting the new session. Win, loss, reveal-solution completion, or leaving the active game stops the timer and clears transient pause causes. Empty-grid entry has no pause control unless it later gains a timed mode.
- **FR-8: Restore behavior.** A saved paused game restores paused with its timer stopped and Resume available. An unpaused save follows the existing restore behavior. A daily save behaves equivalently, including across UTC day rollover for an already-started daily session.
- **FR-9: Idempotency.** Repeated Pause, Resume, visibility, or Step Solver lifecycle calls do not create duplicate intervals, change elapsed time, or clear a different pause cause.
- **FR-10: Local-only operation.** Pause/resume works offline and does not introduce an account, network request, or new dependency.

## 2. UX Specification

### Active State

- Add a `Pause` icon-and-label control to the existing game toolbar, alongside the current action buttons. Use the accessible name `Pause game`; expose toggle state with `aria-pressed="false"`.
- Keep the action in the game toolbar rather than the header so it is visually associated with play. At narrow widths where `.tool-label` is hidden, the accessible name remains available.
- Do not add a `P` shortcut; it already toggles pencil mode. Escape remains the keyboard path to dismiss/resume the pause dialog.

### Paused State

- Show a centered, modal pause surface over the board with a clear `Game paused` heading and one primary `Resume` button. Keep the board visible but visually subdued behind the scrim; do not expose it as active content to assistive technology.
- The Resume control is the only game action available while user/background-paused. Settings, puzzle mutation controls, and cell entry are unavailable until resume.
- Change the toolbar control state to pressed and give it the accessible name `Resume game` when the pause surface is dismissed only through the Resume action. Do not use color alone to communicate pause.
- Escape resumes, equivalent to activating Resume. Closing the pause surface must not leave the game paused but unreachable.
- On a visibility interruption, show the same pause surface when the page returns. Do not auto-resume behind the player's back.

### Focus and Announcements

- Implement the pause surface as a named modal dialog (`role="dialog"`, `aria-modal="true"`, `aria-labelledby`) with `aria-hidden` synchronized to visibility.
- On pause, move focus into the dialog, initially to Resume. Trap Tab/Shift+Tab using the existing `FocusTrap`; Escape resumes.
- Hide the main app from assistive technology while the pause dialog is open using the established `setAppAriaHidden` pattern. On resume, restore the app and focus the pause toolbar control.
- Announce `Game paused` and `Game resumed` through the existing polite announcement utility. Do not announce every timer tick.

## 3. Data Model Changes

Keep game state centralized in `src/game-controller.ts` and do not add pause state to undo/redo snapshots.

Proposed runtime model:

```typescript
type PauseReason = 'user' | 'background' | 'step-solver';
const pauseReasons = new Set<PauseReason>();
const isPaused = (): boolean => pauseReasons.size > 0;
```

- `user` is acquired by the Pause button; Resume clears `user` and `background`.
- `background` is acquired on document hidden; visibility returning does not clear it.
- `step-solver` is acquired/released by Step Solver lifecycle callbacks.
- The timer runs iff the game is unfinished and `pauseReasons.size === 0`.
- Persist a derived boolean `paused` in both regular and daily saves. Pause reasons are transient; on restore, `paused: true` becomes a resumable user/restore pause. This is intentionally conservative if the prior cause was tab background or Step Solver.
- Do not persist pause reasons, timer handles, visibility state, focus state, or dialog state.

## 4. Persistence Implications

### Standard/Imported Game

- Extend `src/services/persistence.ts` serialization/deserialization with `paused`.
- Bump the standard save schema version. Add a migration from the existing version that preserves all current values and defaults `paused` to `false`; do not discard valid existing saves solely because the schema changed.
- Validate the new field after migration. Malformed/absent legacy fields take the documented migration default; malformed current-version data follows existing discard-and-recover behavior.
- Pause/resume and background transitions use immediate writes, not only the normal 500 ms debounce. Preserve the existing before-unload flush.

### Daily Game

- Extend `saveDailyProgress` / `loadProgress` in `src/services/daily.ts` with `paused` and validate the value before accepting a current-format save.
- Existing daily saves have no explicit schema version; missing `paused` defaults to `false`. Add a small version field for new daily saves if needed for future evolution, without invalidating existing per-date progress keys.
- Save immediately on pause/resume/background transition. Preserve the date key captured when the daily game starts; pausing across UTC midnight must not replace the current puzzle with the next day's puzzle.

### Timer and Cache Behavior

- Centralize interval start/stop so resume cannot create duplicate 1-second or 60-second checkpoint intervals.
- A paused game keeps the existing active-time value; do not add hidden duration on restore or resume.
- Ensure the production bundle/service-worker update path serves the new UI/controller code without deleting local saves. No service-worker redesign is in scope.

## 5. Accessibility Considerations

- Meet `.kiro/steering/accessibility.md`: keyboard operation, visible focus, 44×44 CSS-pixel touch target, status announcements, and predictable focus return.
- Use a visible text label where space permits; icon-only narrow layouts retain a useful `aria-label` and tooltip/title.
- Ensure the modal has an accessible name, a real Resume button, a focus trap, Escape behavior, and focus return to the toolbar trigger.
- Make paused status understandable without color or animation. Respect `prefers-reduced-motion` for any dimming/transition.
- Do not let the global digit/undo/pencil/hint shortcuts mutate a paused game. Escape handling belongs to the active pause dialog and must not also trigger another open panel's handler.
- Test screen-reader announcements and keyboard focus in NVDA/VoiceOver where available; the automated DOM tests are necessary but not a substitute for manual checks.

## 6. Mobile Considerations

- Check the eight-button toolbar at 320, 360, 375, 390, and 430 CSS-pixel widths, plus short landscape. Preserve the existing 44 px minimum control size; do not let adding Pause compress existing controls below target size.
- If the existing row cannot fit cleanly, move Pause to a stable position beside the timer rather than creating horizontal scrolling or hiding neighboring actions.
- Size and position the pause surface with mobile safe-area insets (`env(safe-area-inset-*)`), respect viewport height, and keep Resume visible above the home-indicator area.
- Verify touch activation, orientation changes, app switching, screen lock, and return-from-background in an installed PWA on iOS Safari and Android Chrome when available.
- Avoid relying on hover, precise gestures, or sound/haptics to communicate state.

## 7. Testing Strategy

Use the repository's existing Node-based test runner and test helpers; do not introduce Vitest/fast-check solely for this feature.

### Unit Tests

- Timer lifecycle: pause stops ticks/checkpoints; resume restarts one interval; repeated calls are idempotent; completed games never restart.
- Pause causes: user, background, and Step Solver causes combine; releasing one cause does not resume while another remains.
- Input guards: each mutation path and keyboard shortcut is a no-op while user/background-paused; Resume remains available.
- State resets: new game, import, daily start, completion, and reveal do not retain stale pause state.

### Persistence Tests

- Standard save round-trip for paused and running games, including board, candidates, timer, undo/redo.
- Migrate a valid current schema-version-1 save to the new version with `paused: false` and no other data loss.
- Reject malformed paused values in new-version saves without crashing.
- Daily save round-trip for paused/running state; old daily payload without `paused` loads as unpaused; paused progress survives refresh and UTC midnight.
- Pause/resume writes immediately; storage exceptions continue to leave the game playable.

### Controller/Integration Tests

- Click Pause → timer stops, modal opens, focus enters, accessible state/announcement updates.
- Resume and Escape → modal closes, focus returns, timer restarts once, board remains unchanged.
- Paused game rejects digit input, erase, pencil, undo/redo, fill, and hint actions.
- `visibilitychange` hidden pauses and saves; visible does not resume until explicit action.
- Step Solver pauses; closing restores the previous timer state and board snapshot; an independent pause cause is not cleared.
- New game and daily completion reset/stop pause state appropriately.

### Manual Acceptance

- Keyboard-only walkthrough including Escape, Tab, Shift+Tab, and shortcuts.
- Screen-reader check for modal naming, pause/resume announcements, and focus restoration.
- Mobile checks at the listed widths and one installed-PWA interruption/resume cycle.
- Run focused tests, then the existing `npm run verify` gate before merge.

## 8. Estimated Implementation Effort

**Estimate: 6–8 engineering hours**, excluding device availability delays and review.

- Pause state, timer lifecycle, action guards, visibility behavior, and Step Solver integration: **2–3 h**
- Pause dialog, toolbar state, responsive styling, focus/ARIA/announcements: **1.5–2 h**
- Standard and daily persistence migration plus tests: **1.5–2 h**
- Manual keyboard/mobile verification, regression fixes, full verification: **1–1.5 h**

The estimate assumes existing timer, persistence, `FocusTrap`, live-region helpers, and test harness remain as described. A separate cross-device browser automation setup or changes to statistics semantics would be out of scope.

## Phase 10.0 Exit Criteria

- Active game time advances only while the session is running in the foreground.
- User pause, background pause, and Step Solver suspension cannot accidentally resume one another.
- Paused state and timer survive standard and daily reload/restore without loss or double-counting.
- No game mutation is possible while user/background-paused; Resume is always reachable by keyboard and touch.
- Pause/resume remains offline-capable and does not alter existing save data beyond the additive migration.
- Focused tests, manual accessibility/mobile checks, and `npm run verify` pass.
