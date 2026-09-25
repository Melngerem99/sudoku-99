# Step Solver Mode Specification

## Goals
- Create a teaching mode that walks users through a puzzle's solution one technique at a time
- Help players learn solving techniques by seeing them applied in context
- Allow forward/backward navigation through the solution path
- Show technique names, explanations, and visual cell highlighting at each step

## Requirements

### R1: Solution Path Generation
- Given a puzzle, compute the full sequence of techniques needed to solve it
- Each step: apply the simplest available technique, record the HintResult
- Continue until puzzle is solved or no technique can make progress
- If stuck (no technique applies): note "backtracking required" and use solver for remaining cells

### R2: Step Navigation UI
- "Step Solve" mode accessible from settings or toolbar
- Shows current step number (e.g., "Step 4 of 23")
- Navigation: Next ▶, Previous ◀, Play (auto-advance), and Stop
- Auto-advance speed: configurable (1s, 2s, 3s per step)
- At each step: display the technique name, explanation, and cell highlights

### R3: Board State at Each Step
- Board shows the state AFTER each step is applied
- Candidates (pencil marks) are shown and updated at each step
- Highlights show the technique being applied (blue/yellow/purple system)
- Previous steps dim/fade — current step is prominent

### R4: Technique Summary
- After solution path completes, show summary:
  - Total steps
  - Techniques used (grouped by type with counts)
  - Hardest technique used (determines difficulty rating)
  - Time to step through (if auto-play was used)

### R5: Integration with Main Game
- Step solver can be invoked on the current game board (solve remaining cells)
- Can also be invoked on a fresh puzzle (full walkthrough from start)
- Entering step solver mode pauses the game timer
- Exiting step solver mode offers: "Resume game" or "Apply all steps"

### R6: Step Data Structure
```typescript
interface SolutionStep {
  stepNumber: number;
  hint: HintResult;
  boardBefore: number[];
  candidatesBefore: Set<number>[];
  boardAfter: number[];
  candidatesAfter: Set<number>[];
}
```

## Acceptance Criteria
- [ ] Step solver generates correct path for Easy through Hard puzzles
- [ ] Forward/backward navigation shows correct board state at each step
- [ ] Highlights correctly map to the technique applied
- [ ] Auto-play advances steps at the configured speed
- [ ] Summary shows accurate technique breakdown
- [ ] Step solver handles "stuck" scenarios gracefully (notes backtracking needed)
- [ ] Exiting step mode doesn't corrupt game state
- [ ] Accessible: keyboard navigable, step announcements for screen readers

## Implementation Notes
- Pre-compute entire solution path before displaying (cache it)
- Path computation: clone board → loop { buildCandidates, getHint, apply } → until solved
- "Apply" means: place digit (if placement) OR remove candidates (if eliminations only)
- After eliminations, re-run to see if a simpler technique now fires
- Store the full path as `SolutionStep[]` — navigate by index
- UI: overlay the step controls on top of the grid (sticky bottom bar)
- Auto-play: `setInterval` that increments step index
- Performance: path computation should take < 2s for Expert puzzles

## Risks
| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Some puzzles require guessing (no technique path exists) | Medium | Medium | Detect and show "no logical path" message; offer brute-force solve |
| Path computation too slow for Expert puzzles with many steps | Low | Medium | Compute async (Web Worker or chunked with requestAnimationFrame) |
| Many steps overwhelm the user | Medium | Low | Add "skip to next interesting technique" button (skips singles) |
| Step state grows large in memory | Low | Low | Only store board + candidates per step; hints are re-derivable |
