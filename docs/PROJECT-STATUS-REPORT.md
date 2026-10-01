# Sudoku-99 Current Status

**Updated:** 2026-10-01

## Product

Sudoku-99 is a local-first Sudoku Progressive Web App. The web client is active; the Qt/C++ client is archived. The app supports generated and daily puzzles, local progress, hints, a step solver, analysis, statistics, a puzzle library, import/export, themes, and offline play after the first load.

## Verification and Build

| Check | Current result |
|---|---|
| `npm run build` | Pass |
| `npm run typecheck` | Pass |
| `npm test` | 400 tests pass |
| `npm run verify` | Pass |
| Production bundle | About 91 KB raw / 27 KB gzip |
| Runtime | TypeScript, strict mode, esbuild IIFE |
| Test runner | Repository Node.js test harness |

Run the app locally using the instructions in [README.md](../README.md).

## Completed Work

- TypeScript migration and strict typechecking
- PWA manifest, service-worker build, offline asset caching, and update notification
- 22 registered Sudoku solving techniques, hints, step-by-step solving, and analysis
- Daily challenge generation, history, and result sharing
- Statistics and local puzzle library
- Puzzle import/export and URL sharing
- Pause/Resume for generated, imported, and daily timed games, including background pause and date-bound daily restore
- Phase 9.0 Feature Gap Assessment
- Phase 10.0 implementation and current dark/light/mobile repository screenshots
- Window shim audit, DOM shim cleanup, and technique-splitting feasibility study

## Open Release and Product Work

Automated verification is green. Release-readiness follow-ups remain:

- Improve mobile cell and numpad touch target sizing
- Complete grid keyboard navigation and roving focus
- Add consistent focus containment/restoration to all dialogs
- Review pencil-mark contrast in light and dark themes
- Perform manual keyboard and NVDA/VoiceOver checks
- Verify installed-PWA offline/update/interruption behavior on iOS Safari and Android Chrome

Product opportunities from [FEATURE-GAP-ASSESSMENT.md](FEATURE-GAP-ASSESSMENT.md) include post-game personal performance history and an optional, replayable first-game orientation. Technique practice and Sudoku variants remain exploratory.

## Closed Investigations

- **Window shim audit:** removed the unused DOM shim; retained the remaining compatibility surface.
- **Technique splitting:** deferred. Estimated 13–17 hours for a cross-module asynchronous refactor; no current performance or maintenance need justifies the cost.

For ownership and handoff details, see [PROJECT-HANDOFF.md](PROJECT-HANDOFF.md). Historical migration figures are preserved in [MIGRATION-COMPLETION.md](MIGRATION-COMPLETION.md).
