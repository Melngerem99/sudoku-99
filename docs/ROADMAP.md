# Development Roadmap

## Phase 1 — Foundation & Quality (Weeks 1-2)

| # | Task | Spec | Priority | Status |
|---|------|------|----------|--------|
| 1 | Fix CSS `#6060888` typo in dark theme | — | Critical | ✅ Done |
| 2 | Set up esbuild + TypeScript | `typescript-migration` | Critical | ✅ Done |
| 3 | Migrate solver.js → TypeScript | `typescript-migration` | Critical | ✅ Done |
| 4 | Migrate techniques.js → TypeScript | `typescript-migration` | Critical | ✅ Done |
| 5 | Migrate ui.js + script.js → TypeScript | `typescript-migration` | Critical | ✅ Done |
| 6 | Property-based solver tests | `solver-testing` | High | ✅ Done (330 tests) |
| 7 | Unit tests for all technique detectors | `solver-testing` | High | ✅ Done |
| 8 | Integration tests for game flow | `solver-testing` | Medium | ✅ Done |

**Exit criteria:** ✅ All tests pass, TypeScript strict mode enabled, zero `any` types in public APIs, bundle 164KB.

---

## Phase 2 — Core UX Gaps (Weeks 3-4)

| # | Task | Spec | Priority |
|---|------|------|----------|
| 9 | Auto-save game state to localStorage | `game-persistence` | High |
| 10 | Resume game on page reload | `game-persistence` | High |
| 11 | PWA manifest + icons | `pwa-support` | Medium |
| 12 | Service worker for offline caching | `pwa-support` | Medium |
| 13 | Statistics tracking (wins, times, streaks) | `statistics-tracking` | Medium |
| 14 | Statistics display panel | `statistics-tracking` | Medium |

**Exit criteria:** Game survives refresh, works offline, Lighthouse PWA score = 100.

---

## Phase 3 — Solver Enhancement (Weeks 5-6)

| # | Task | Spec | Priority |
|---|------|------|----------|
| 15 | Implement Swordfish + Jellyfish | `advanced-techniques` | High |
| 16 | Implement W-Wing | `advanced-techniques` | High |
| 17 | Implement Simple Coloring | `advanced-techniques` | Medium |
| 18 | Implement Empty Rectangle | `advanced-techniques` | Medium |
| 19 | Implement ALS-XZ | `advanced-techniques` | Low |
| 20 | Technique-based difficulty grading | `advanced-techniques` | High |
| 21 | Step-solver path computation | `step-solver-mode` | Medium |
| 22 | Step-solver UI (next/prev/auto-play) | `step-solver-mode` | Medium |

**Exit criteria:** 22+ techniques, Expert puzzles require advanced techniques, step solver works.

---

## Phase 4 — Social & Engagement (Weeks 7-8)

| # | Task | Spec | Priority |
|---|------|------|----------|
| 23 | Seeded PRNG for daily puzzle | `daily-challenge` | High |
| 24 | Daily challenge UI + streak tracking | `daily-challenge` | High |
| 25 | Share results (clipboard text) | `daily-challenge` | Medium |
| 26 | Puzzle import (81-char string) | `puzzle-import-export` | High |
| 27 | Puzzle export + URL sharing | `puzzle-import-export` | High |
| 28 | Import validation + error messages | `puzzle-import-export` | Medium |

**Exit criteria:** Daily puzzle works, sharing produces correct text, import/export round-trips.

---

## Phase 5 — Polish (Weeks 9-10)

| # | Task | Spec | Priority |
|---|------|------|----------|
| 29 | Haptic feedback on mobile | — | Low |
| 30 | Optional sound effects | — | Low |
| 31 | First-time onboarding tutorial | — | Medium |
| 32 | Performance audit + optimization pass | — | Medium |
| 33 | Accessibility audit (axe-core + manual) | — | High |
| 34 | Desktop Qt decision: archive or port | — | Low |

**Exit criteria:** Lighthouse scores all green, accessibility audit passes, polished UX.

---

## Success Metrics

| Metric | Target |
|--------|--------|
| Lighthouse Performance | ≥ 95 |
| Lighthouse Accessibility | 100 |
| Lighthouse Best Practices | 100 |
| Lighthouse PWA | 100 |
| Test coverage (core) | ≥ 90% |
| Bundle size (gzipped) | < 80KB |
| Puzzle generation time (mobile) | < 500ms |
| Techniques covered | 22+ |
