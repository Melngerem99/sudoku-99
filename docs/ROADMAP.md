# Development Roadmap

## Completed

### Foundation and Quality

- TypeScript migration with strict typechecking and esbuild production/test bundles
- Automated solver, technique, controller, persistence, and generator test suites
- Window shim audit, DOM shim cleanup, and service-worker build refactor

### Core Product and Engagement

- Local save/restore, statistics, and Puzzle Library
- Offline PWA support and update notification
- 22 implemented solving techniques, hints, Step Solver, and puzzle analysis
- Deterministic Daily Challenges, completion history, and result sharing
- Puzzle import/export and URL sharing

### Phase 9.0 — Feature Gap Assessment

Completed. The assessment prioritizes player performance history and first-game orientation after pause/resume. Accounts, cloud sync, multiplayer, and variants remain deferred pending player demand.

### Phase 10.0 — Pause and Resume

Completed. Supports generated, imported, and daily timed games; pauses on explicit action and backgrounding; preserves state through reload and UTC rollover; retains local-only operation.

### Phase 12.0 — Manual Puzzle Entry

Completed. Players can enter their own puzzle givens directly into the grid. The workflow validates for row/column/box conflicts, no-solution boards, and ambiguous puzzles before converting to a live game. Imported-puzzle statistics are tracked in the existing statistics service. Candidate auto-fill is available after entry. Full session backup and restore is supported so cancel always restores the previous game.

## Open Release Readiness

- Complete manual accessibility, installed-PWA, offline, persistence, and mobile release acceptance using the [Phase 11.6 checklist](PHASE-11.6-MANUAL-VALIDATION-CHECKLIST.md).

Phase 11.1-11.5 engineering remediations are complete; manual release sign-off remains outstanding.

## Product Opportunities

1. Add a local recent-session history and post-game performance review.
2. Prototype a short, skippable first-game orientation, replayable from Settings.
3. Validate demand before investing in technique practice or Sudoku variants.

See [FEATURE-GAP-ASSESSMENT.md](FEATURE-GAP-ASSESSMENT.md) for prioritization and [PROJECT-HANDOFF.md](PROJECT-HANDOFF.md) for current verification and ownership details.
