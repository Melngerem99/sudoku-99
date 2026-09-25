# Daily Challenge Specification

## Goals
- Provide the same puzzle to all players each day for community comparison
- Create a recurring engagement loop (daily habit)
- Track daily challenge completion history (streak, calendar)
- Allow sharing results without spoiling the solution

## Requirements

### R1: Deterministic Daily Puzzle
- Use the current date (UTC) as a seed for puzzle generation
- Same date always produces the same puzzle on any device
- Seeded PRNG (e.g., mulberry32 or xoshiro128) replaces Math.random()
- Difficulty rotates: Mon=Easy, Tue=Medium, Wed=Hard, Thu=Expert, Fri=Hard, Sat=Medium, Sun=Easy

### R2: Daily Challenge UI
- "Daily" button/tab in settings or main screen
- Badge indicating today's challenge status (not started / in progress / completed)
- Separate timer and mistake counter from free-play mode
- Cannot generate a new puzzle — one attempt per day (but can retry after loss)

### R3: Completion Tracking
- Store completed daily challenges in localStorage
- Calendar view showing completed days (green = completed, red = attempted but lost, gray = missed)
- Daily streak counter (consecutive days completed)
- Show completion time for each completed day

### R4: Sharing
- "Share" button after completing daily challenge
- Generates text like: "Sudoku Daily #142 🟩🟩🟩 3:42 ⭐" 
- Grid emoji showing difficulty + time brackets
- Copies to clipboard (no spoilers — never share solution digits)
- Format is concise enough for Twitter/social media

### R5: Day Boundary Handling
- New puzzle available at 00:00 UTC each day
- If playing at midnight: current game continues, new daily available on next visit
- "Next puzzle in: HH:MM" countdown shown after completion
- Historical dailies are NOT replayable (one shot per day)

### R6: Seeded Generation
- Seed from date: `seed = year * 10000 + month * 100 + day` (e.g., 20260729)
- Seeded PRNG for: random grid fill order, hole-digging order, digit shuffling
- Must produce valid unique-solution puzzles for any date

## Acceptance Criteria
- [ ] Same date produces identical puzzle on different devices/browsers
- [ ] Daily puzzle difficulty follows weekly rotation schedule
- [ ] Completion is tracked and shown in calendar view
- [ ] Daily streak increments for consecutive completed days
- [ ] Share button generates correct spoiler-free text
- [ ] Day boundary at UTC midnight works correctly across timezones
- [ ] Cannot "cheat" by changing system clock (use server time if available, graceful fallback to local)
- [ ] Daily challenge state persists across page refreshes

## Implementation Notes
- Seeded PRNG implementation (mulberry32):
```typescript
function mulberry32(seed: number) {
  return function() {
    seed |= 0; seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
```
- Replace `Math.random()` calls in generator with seeded function
- Daily state stored separately: `sudoku-daily-{YYYYMMDD}`
- Calendar data: array of `{ date: string, completed: boolean, time: number | null }`
- Share format: configurable emoji set, no solution data

## Risks
| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Seeded PRNG produces invalid puzzle for some dates | Low | High | Pre-validate 365 days of puzzles in tests; fallback to next seed if invalid |
| Timezone confusion for day boundary | Medium | Medium | Always use UTC; display "resets at midnight UTC" |
| Users clear localStorage to re-attempt daily | Low | Low | Acceptable — no server-side enforcement, local-only feature |
| Share text format changes break social comparison | Low | Low | Version the share format; keep it stable once released |
