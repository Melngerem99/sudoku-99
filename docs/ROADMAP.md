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

## Open Release Readiness

- Improve touch target sizing for cells, numpad, and compact header controls
- Complete grid arrow-key focus and roving tabindex behavior
- Add consistent focus trapping/restoration to all dialogs and panels
- Review pencil-mark contrast in light and dark themes
- Complete manual keyboard and screen-reader checks
- Verify offline launch, update behavior, and interruption/resume on installed iOS and Android PWAs

## Product Opportunities

1. Add a local recent-session history and post-game performance review.
2. Prototype a short, skippable first-game orientation, replayable from Settings.
3. Validate demand before investing in technique practice or Sudoku variants.

See [FEATURE-GAP-ASSESSMENT.md](FEATURE-GAP-ASSESSMENT.md) for prioritization and [PROJECT-HANDOFF.md](PROJECT-HANDOFF.md) for current verification and ownership details.
