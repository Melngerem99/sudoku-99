---
inclusion: always
---

# Code Style & Conventions

## Language

- All code comments, documentation, and commit messages MUST be in English.
- TypeScript strict mode is required for all new code.
- No `any` types unless explicitly justified with a comment.

## TypeScript

- Use `const` by default; `let` only when reassignment is needed; never `var`.
- Prefer `readonly` properties and `Readonly<T>` for immutable data.
- Use union types over enums where practical.
- Export types/interfaces from dedicated `types.ts` files.
- Use barrel exports (`index.ts`) for public module APIs.

## Naming

- Files: kebab-case (`game-state.ts`, `naked-single.ts`)
- Types/Interfaces: PascalCase (`HintResult`, `Board`)
- Functions/variables: camelCase (`getHint`, `selectedIdx`)
- Constants: UPPER_SNAKE_CASE (`MAX_MISTAKES`, `CLUE_COUNTS`)
- CSS classes: kebab-case (`cell-digit`, `hint-panel`)
- CSS custom properties: `--category-name` (`--cell-bg`, `--hint-blue`)

## Module Pattern

- ES modules with named exports (no default exports).
- Core logic modules (solver, techniques) MUST NOT import DOM APIs.
- UI modules may import from core but never vice versa.
- No globals (`window.X`) in new code — use ES module imports.

## CSS

- All colors via CSS custom properties — no hardcoded hex in component styles.
- Use `clamp()` for responsive font sizes.
- Mobile-first approach: base styles for small screens, `@media` for larger.
- Animations respect `prefers-reduced-motion`.

## Functions

- Keep functions under 40 lines where possible.
- Pure functions preferred — side effects isolated to controller layer.
- Document complex algorithms with a brief comment explaining the approach.

## Git

- Commit messages: imperative mood, max 72 chars first line.
- Branch naming: `feature/name`, `fix/name`, `chore/name`.
- One logical change per commit.
