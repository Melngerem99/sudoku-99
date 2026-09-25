---
inclusion: always
---

# Accessibility Requirements

## Standard

Target **WCAG 2.1 Level AA** compliance for all user-facing features.

## Grid Interaction Model

Based on the [WAI-ARIA Grid Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/grid/):

- Grid container: `role="grid"`, `aria-label="Sudoku puzzle grid"`
- Each cell: `role="gridcell"`, `tabindex="0"`, `aria-label="Row N, Column N"`
- Arrow keys navigate between cells (up/down/left/right)
- Enter or digit key places a value
- Delete/Backspace erases
- Announce cell content changes via `aria-live="polite"` region

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| 1-9 | Place digit (or toggle pencil mark in pencil mode) |
| 0 / Delete / Backspace | Erase selected cell |
| Arrow keys | Navigate grid |
| P | Toggle pencil mode |
| H | Show hint |
| Ctrl+Z | Undo |
| Ctrl+Y / Ctrl+Shift+Z | Redo |
| Escape | Close any open panel/modal |

## Color & Contrast

- All text meets 4.5:1 contrast ratio against its background.
- Highlight states (selected, peer, conflict) must be distinguishable without color alone — use borders, patterns, or icons as secondary indicators.
- Hint colors (blue/yellow/purple) include both background fill AND 2px ring for non-color differentiation.

## Motion

- Respect `prefers-reduced-motion: reduce` — disable all animations and transitions.
- No auto-playing animations that last longer than 5 seconds.

## Screen Reader Announcements

- When a digit is placed: announce "Placed [digit] in Row [r], Column [c]"
- When an error occurs: announce "Mistake: [digit] is incorrect"
- When a hint is shown: announce technique name and explanation text
- When game ends: announce win/loss message

## Focus Management

- Modals trap focus within their content.
- Closing a modal/drawer returns focus to the element that triggered it.
- Visible focus rings on all interactive elements (`:focus-visible`).
- Minimum touch target size: 44×44 CSS pixels.

## Testing

- Test with VoiceOver (macOS/iOS) and NVDA (Windows) for screen reader compatibility.
- Run axe-core automated checks in CI.
- Keyboard-only navigation testing for all user flows.
