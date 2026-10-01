# Phase 9.0 — Feature Gap Assessment

**Date:** 2026-09-30  
**Scope:** Player-facing opportunities beyond features already implemented. This assessment does not reopen the completed TypeScript, accessibility, documentation, service-worker, window-shim, or technique-splitting work.

## Project Understanding

Sudoku-99 is an offline-capable Sudoku web app and the active product in this repository; the Qt desktop implementation is archived. The current TypeScript app already supports generated and daily puzzles, a solver and hints, pencil marks, undo/redo, step-by-step solving, puzzle analysis, save/resume, a local puzzle library, import/export and URL sharing, statistics, themes, and offline PWA use. The supplied current baseline is 330 passing tests and a bundle of approximately 88 KB raw / 25 KB gzip.

The product therefore has a broad play-and-analysis foundation. The stated audience priority is players focused on competitive improvement. The largest remaining opportunities are trustworthy timed sessions and meaningful personal progress feedback, rather than adding another core Sudoku engine feature or online competition.

## Assessment Method

Reviewed the handoff, README, all available Kiro steering/spec files, and all project documentation as requested. Then checked the current web interface and relevant TypeScript controllers/services to distinguish implemented flows from unimplemented roadmap ideas. The current UI and code were used to verify feature presence; older specs and reports were treated as historical intent where they disagree with live code or the supplied current metrics.

## Existing Capabilities Not Counted As Gaps

- Daily puzzles, streak/calendar tracking, and post-win result sharing already exist.
- Hints, technique explanations, step navigation, and per-puzzle analysis already exist.
- Game and daily progress persist locally; statistics and a filterable puzzle library already exist.
- Puzzle import, export, and URL sharing already exist.
- Accessibility work and the investigations listed as completed in the handoff are out of scope here.

## Ranked Opportunities

### FGA-01 — Add an explicit pause/resume state

**Priority:** P1  
**Player value:** High  
**Effort:** Small to medium

There is no pause or resume action in the current game interface or controller. The timer interval increments while a game is active and is stopped on game completion; it has no paused state or visibility handling. A player interrupted during a timed session cannot intentionally stop elapsed play time.

**Recommendation:** Add a clear pause/resume control for standard and daily games. A paused state should freeze the timer, prevent board input, be restored consistently after reload, and announce the state to assistive technology. Decide whether switching away from the tab pauses automatically or whether only explicit pause affects the clock.

**Success check:** A player can pause, leave and return, and resume with the same board and active-play time; no input changes the board while paused.

**Evidence:** `web/index.html` toolbar has no pause control; `src/game-controller.ts` timer lifecycle (`startTimer`, `stopTimer`, `endGame`) has no paused state; `src/services/persistence.ts` does not serialize one.

### FGA-02 — Add post-game performance review and local history

**Priority:** P1  
**Player value:** High for self-improvement  
**Effort:** Medium

The win dialog shows the latest time and mistake count, while Statistics summarizes aggregate wins, losses, best/average times, streaks, total time, and hints. It does not retain a player-visible per-session history or show whether a result improved on a personal best. Analysis describes puzzle difficulty and techniques, not the player's performance trend.

**Recommendation:** Add a local recent-session history and a concise post-game review: time versus personal best/average for that difficulty, mistakes, hints, and a clear personal-best marker. Keep it private and offline; avoid global ranking until demand is demonstrated.

**Success check:** A returning player can tell whether their time or accuracy improved and can compare recent results at the same difficulty.

**Evidence:** `src/game-controller.ts` reports time and mistakes at completion; `src/controllers/statistics-controller.ts` shows aggregate metrics; `src/services/statistics.ts` persists totals but no session records.

### FGA-03 — Provide a short, dismissible first-game orientation

**Priority:** P2  
**Player value:** Medium, especially for new players  
**Effort:** Small

The interface offers useful controls but no first-use onboarding or tutorial. Important interactions such as selecting a cell, entering digits, toggling pencil marks, requesting hints, and undoing are left for players to discover. The old roadmap also lists a first-time tutorial without a completion mark.

**Recommendation:** Add an optional, skippable three-step orientation during the first game. Keep it tied to real actions (select a cell, enter a digit, open pencil mode or a hint), remember dismissal locally, and make it replayable from Settings. Avoid a blocking multi-screen tour.

**Success check:** New players can start and make their first valid move without external instructions; returning players are not interrupted.

**Evidence:** No tutorial/onboarding UI or flow appears in `web/index.html`, `src/`, or `web/style.css`; current controls are present in the toolbar and settings drawer.

### FGA-04 — Turn solving techniques into optional practice

**Priority:** P3, conditional on a learning-oriented audience  
**Player value:** High for learners  
**Effort:** Medium to large

Hints explain a technique in the context of the current board, and Step Solver demonstrates a solution path. Neither is a structured lesson or practice flow: players cannot deliberately learn one technique, try it on a curated example, and check their understanding before returning to a full puzzle.

**Recommendation:** Prototype a small technique practice mode using existing technique explanations and solver logic. Begin with a few common techniques, provide a worked example followed by a short interactive exercise, and expand only after observing use. Keep it separate from normal timed play. Confirm the implemented technique inventory first; `docs/TECHNIQUES.md` and newer architecture/status documents do not agree on its completion state.

**Success check:** Learners can identify and apply a taught technique in an exercise without using a full-solution reveal; completion is tracked locally without requiring an account.

### FGA-05 — Explore Sudoku variants only after validating demand

**Priority:** Explore later  
**Player value:** Potentially high for variety-seeking players  
**Effort:** Large

The current app is standard 9×9 Sudoku. Variants such as diagonal or killer Sudoku could broaden replay value, but they alter puzzle constraints, validation, generation, hints, and difficulty analysis.

**Recommendation:** Do not start a variant as the next feature. First ask target players whether they want variants or prefer more learning and session-quality improvements. If validated, scope one variant end-to-end rather than adding partial support.

## Recommended Sequence

1. Define and implement pause/resume semantics, including persistence and daily-game behavior.
2. Add a post-game personal-performance review and local recent-session history.
3. Add a small, optional first-game orientation and test it with new players.
4. Validate whether technique learning is a primary audience need; prototype a narrow practice mode if so.
5. Revisit variants after direct player feedback.

## Deliberately Deferred

Accounts, cloud sync, global leaderboards, multiplayer, and social competition are not recommended as immediate gaps. They add backend, privacy, moderation, and offline-consistency costs without evidence that they solve the most important current player problem. The app's existing local-first and offline behavior is an asset to preserve.

## Assumptions To Validate

- The user specified competitive improvement as the priority. Confirm whether that means self-improvement only or whether future online competition is desired; this assessment assumes self-improvement.
- Timed play is meaningful enough that pause behavior matters, but the desired clock semantics (active time vs. wall-clock time) need a product decision.
- Recommendations should preserve the local-first, offline-capable product model.

## Documentation Note

`README.md` still describes the earlier Qt/C++ project, while the Kiro docs and newer project reports describe the TypeScript web app. Some roadmap/spec content also predates implemented features, and bundle-size figures differ from the current handoff. Treat those differences as documentation maintenance, not missing player features; refresh the README and reconcile metrics separately when convenient.
