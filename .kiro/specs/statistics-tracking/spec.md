# Statistics Tracking Specification

## Goals
- Track player performance across games (win rate, times, streaks)
- Motivate continued play through progress visibility
- Provide per-difficulty breakdown of performance
- Store all data locally (no server required)

## Requirements

### R1: Tracked Metrics
- Games started (per difficulty)
- Games completed / won (per difficulty)
- Games lost (per difficulty)
- Best time (per difficulty)
- Average time (per difficulty, wins only)
- Current win streak
- Longest win streak
- Total play time
- Hints used (per game average)
- Mistakes made (per game average)

### R2: Statistics Display
- New "Stats" button in header or settings drawer
- Statistics panel (bottom sheet or modal) showing:
  - Summary row: total games, win %, current streak
  - Per-difficulty breakdown table
  - Best time highlight
  - Win streak visualization (calendar heatmap or simple number)

### R3: Data Management
- Store in localStorage key: `sudoku-statistics`
- Schema versioned for future migration
- Stats survive page refreshes and app updates
- "Reset Statistics" button with confirmation dialog

### R4: Game Event Tracking
- On game start: increment `gamesStarted[difficulty]`
- On win: increment `gamesWon[difficulty]`, update best/average time, increment streak
- On loss: increment `gamesLost[difficulty]`, reset current streak
- On hint used: increment hint counter for current game
- On new game without finishing: count as abandoned (not won/lost)

### R5: Streak Logic
- Current streak: consecutive wins across any difficulty
- Streak breaks on: loss, or 24 hours without a win (optional, can be simpler)
- Longest streak: max(all historical streaks)
- Display current and longest in stats panel

## Acceptance Criteria
- [ ] Statistics panel shows accurate counts after multiple games
- [ ] Best time updates only when new time is lower
- [ ] Average time computes correctly across all wins for a difficulty
- [ ] Win streak increments on consecutive wins, resets on loss
- [ ] Stats persist across page refreshes
- [ ] Reset button clears all statistics with confirmation
- [ ] Stats panel is accessible (keyboard navigable, screen reader friendly)
- [ ] No perceptible performance impact from tracking

## Implementation Notes
- Statistics object shape:
```typescript
interface Statistics {
  version: number;
  perDifficulty: Record<Difficulty, {
    started: number;
    won: number;
    lost: number;
    bestTimeSeconds: number | null;
    totalWinTimeSeconds: number;
  }>;
  currentStreak: number;
  longestStreak: number;
  totalPlayTimeSeconds: number;
  totalHintsUsed: number;
  totalGamesWithHints: number;
}
```
- Update stats atomically: read → modify → write (avoid partial writes)
- Display best time as MM:SS format
- Win rate = won / (won + lost) * 100 (exclude abandoned)
- Average time = totalWinTime / won

## Risks
| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| localStorage cleared by user/browser | Medium | Low | Stats are nice-to-have; warn user they're local-only |
| Clock manipulation for best times | Low | Low | Client-side only; no leaderboard, so not a real concern |
| Stats schema changes in future versions | Medium | Medium | Version field + migration function on load |
| Abandoned games inflating "started" count | Low | Low | Track separately; show win% as won/(won+lost), not won/started |
