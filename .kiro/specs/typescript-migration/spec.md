# TypeScript Migration Specification

## Goals
- Convert all 4 web application JavaScript files to TypeScript with strict mode
- Enable compile-time type safety for complex solver and technique logic
- Preserve 100% of existing functionality with zero behavior changes
- Establish build tooling (Vite + TypeScript) as foundation for all future development

## Requirements

### R1: Build System Setup
- Install and configure Vite as the bundler
- Configure TypeScript with `strict: true`, `noImplicitAny: true`, `strictNullChecks: true`
- Output target: ES2020 (covers 95%+ of browsers)
- Dev server with hot module replacement
- Production build with minification and source maps

### R2: Type Definitions
- Define `Board` type as `number[]` (81 elements)
- Define `Candidates` type as `Set<number>[]` (81 elements)
- Define `HintResult` interface with full technique/highlights/eliminations/placement shape
- Define `Difficulty` as `'easy' | 'medium' | 'hard' | 'expert'`
- Define `GameState` interface with all state fields
- Define `Snapshot` interface for undo/redo entries

### R3: Module Conversion
- Convert `solver.js` → `src/core/solver.ts` (ES module, named exports)
- Convert `techniques.js` → `src/core/techniques/index.ts` + per-technique files
- Convert `ui.js` → `src/ui/index.ts`
- Convert `script.js` → `src/app.ts` (entry point)
- Remove all `window.*` global assignments

### R4: Backward Compatibility
- Final built output produces identical behavior to current vanilla JS
- All 16 technique detectors produce identical results
- UI renders identically (same HTML structure, same CSS classes)
- Keyboard shortcuts and interactions unchanged

## Acceptance Criteria
- [ ] `npm run build` produces a working production bundle
- [ ] `npm run dev` starts Vite dev server with HMR
- [ ] All existing game features work identically
- [ ] Zero TypeScript errors with strict mode
- [ ] No `any` types except with explicit justification comments
- [ ] Bundle size < 80KB gzipped
- [ ] All imports use relative paths (no path aliases initially)

## Implementation Notes
- Start with type definitions (types.ts), then solver, then techniques, then UI, then app
- Technique files can stay in a single file initially, split later
- Use `as const` assertions for constant arrays (PEERS, ALL_UNITS)
- The `IIFE` pattern in script.js becomes a regular ES module entry point
- CSS and HTML remain unchanged — only JS files are migrated

## Risks
| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Subtle behavior change during conversion | Medium | High | Comprehensive test suite before migration; compare outputs |
| Build tool complexity slows iteration | Low | Medium | Vite is minimal-config; start with defaults |
| Type definitions too permissive (too many `any`) | Medium | Medium | Strict mode + lint rule banning `any` without comment |
| Bundle size increase from TypeScript helpers | Low | Low | Target ES2020 (no downlevel emit) |
