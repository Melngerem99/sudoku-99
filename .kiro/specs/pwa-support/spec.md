# PWA Support Specification

## Goals
- Make the Sudoku app installable as a Progressive Web App on mobile and desktop
- Enable full offline functionality (play without network connection)
- Achieve Lighthouse PWA score of 100
- Provide native-app-like experience (fullscreen, splash screen, icon)

## Requirements

### R1: Web App Manifest
- `manifest.json` with: name, short_name, description, start_url, display (standalone), theme_color, background_color, icons (192px, 512px, maskable)
- Orientation: portrait preferred, landscape allowed
- Categories: ["games", "puzzle"]

### R2: Service Worker
- Cache-first strategy for all static assets (HTML, CSS, JS, fonts)
- Network-first strategy for nothing (fully offline app — no API calls)
- Pre-cache all assets on install event
- Update cached assets on activate event (clear old caches)
- Version-stamped cache names for clean upgrades

### R3: Offline Functionality
- All game features work without network connection
- Puzzle generation runs client-side (already implemented)
- No external API dependencies
- Timer continues working offline

### R4: Install Experience
- Browser shows install prompt (meets PWA criteria)
- Custom install banner with "Add to Home Screen" button (optional, progressive enhancement)
- Splash screen displays app icon + name during launch
- Status bar matches theme color

### R5: App Icons
- Sizes: 72, 96, 128, 144, 152, 192, 384, 512 (PNG)
- Maskable icon variant (safe zone compliance)
- Favicon (16x16, 32x32)
- Apple touch icon (180x180)
- SVG icon for scalability

### R6: Update Flow
- Service worker checks for updates on page load
- If new version available: show subtle "Update available" toast
- User can dismiss or refresh to apply update
- Don't interrupt active gameplay with forced refresh

## Acceptance Criteria
- [ ] Lighthouse PWA audit score: 100
- [ ] App installable on Chrome (Android + Desktop) and Safari (iOS)
- [ ] Full gameplay works in airplane mode after first visit
- [ ] Custom splash screen shows on launch from home screen
- [ ] No "Add to Home Screen" criteria warnings in Chrome DevTools
- [ ] Service worker updates without breaking active sessions
- [ ] All icons render correctly on all platforms

## Implementation Notes
- Service worker uses Workbox (or hand-written if keeping zero-dep philosophy)
- Cache name format: `sudoku-v{version}` — increment on each deploy
- Pre-cache list: index.html, app.js (bundle), style.css, manifest.json, icons/*
- For icons: generate from a single high-res SVG source using a build script
- iOS requires `<meta name="apple-mobile-web-app-capable" content="yes">` + apple-touch-icon link
- Test install flow on actual devices (Chrome Android, Safari iOS, Chrome Desktop)

## Risks
| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Service worker caching stale code | Medium | High | Version-stamped caches; skipWaiting + clients.claim on activate |
| iOS PWA limitations (no install prompt) | Certain | Low | Provide manual instructions; "Share → Add to Home Screen" |
| Large icon assets increase initial download | Low | Low | Icons loaded on-demand; only manifest-referenced sizes pre-cached |
| Service worker debugging complexity | Medium | Medium | Use Chrome DevTools Application panel; add logging in dev mode |
