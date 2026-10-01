# Sudoku-99 Project Handoff

## Current Product

Sudoku-99 is a local-first Progressive Web App. The web application in `src/` and `web/` is the active product; the Qt/C++ application is archived.

## Completed

- TypeScript migration, strict typechecking, bundle optimization, and service-worker build refactor
- Accessibility foundation and accessibility audit backlog
- Phase 9.0 Feature Gap Assessment
- Phase 10.0 Pause/Resume, including imported-game persistence and background pause behavior
- Daily session restore across UTC rollover and continuation of unfinished prior-day challenges
- Repository screenshots refreshed for dark desktop, light desktop, and mobile layouts
- Window shim audit, DOM shim cleanup, and technique-splitting feasibility study

## Verification and Bundle

- `npm run build` passes
- `npm run typecheck` passes
- `npm test` passes: **400 tests**
- `npm run verify` passes
- Production bundle: approximately **91 KB raw / 27 KB gzip**
- Node.js requirement: 18 or newer

## Closed Investigations

### Window Shim Audit

Only the unused `window.DOM` shim was removable. Remaining compatibility globals are retained for the existing browser-console and test interfaces; further removals were deferred as low-value cleanup.

### Technique Splitting Feasibility

Splitting `src/core/techniques.ts` could reduce module size but requires refactoring generator, solve-path, controller, and test dependencies. Estimated effort was 13–17 hours; deferred until a concrete maintenance or performance need justifies it.

## Open Product and Release Work

- Improve mobile cell and numpad touch target sizing
- Complete grid keyboard navigation and roving focus behavior
- Add consistent focus containment and restoration across all modal panels
- Review pencil-mark contrast in both themes
- Complete manual screen-reader checks (NVDA/VoiceOver) and installed-PWA interruption checks on iOS Safari and Android Chrome
- Consider the optional first-game orientation and post-game performance history from the feature-gap assessment

Automated verification is green, but manual accessibility and installed-device acceptance remain outstanding. Do not describe the app as fully WCAG-conformant until those items are resolved and verified.

## Current Screenshots

- [Dark desktop](../images/screenshot.png)
- [Light desktop](../images/screenshot-light.png)
- [Mobile](../images/screenshot-mobile.png)

## Local Development

```sh
npm ci
npm run build
python3 -m http.server 8000 --directory web
```

Open <http://localhost:8000>. Use `npm run verify` for the complete build, typecheck, and test gate.