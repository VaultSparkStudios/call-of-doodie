# Current State

Build status:
- Build: passing (`npm run build` clean)
- Latest commit: `19b9f51`
- Deployed: live at `https://vaultsparkstudios.com/call-of-doodie/`
- Branch: `main`, up to date with `origin/main`

Current priorities:
1. Playtesting and balancing new weapons, enemies, and obstacles added in session 4
2. Potential App Store path via Capacitor (researched, not started)
3. Global leaderboard backend (currently localStorage only)

Known issues:
- Obstacles don't affect enemy pathfinding — enemies walk through walls by design for now
- App.jsx is ~1300 lines; game loop could be extracted to a custom hook
- No gamepad/controller support
- Mobile action bar may be tight with 6 weapons on very small screens
- Leaderboard is not global — each player only sees their own scores
