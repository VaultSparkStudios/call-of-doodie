# Agent Instructions — Call of Doodie

## Studio identity

- Studio site repo: `VaultSparkStudios/VaultSparkStudios.github.io`
- Studio public URL: `https://vaultsparkstudios.com/`
- Game repos live under: `VaultSparkStudios/`

## Per-game identity

- Repo name: `call-of-doodie`
- Public slug: `call-of-doodie`
- Public URL: `https://vaultsparkstudios.com/call-of-doodie/`
- Gameplay origin: `https://play-call-of-doodie.vaultsparkstudios.com` (reserved — no backend yet, frontend-only game)
- API origin: `https://api-call-of-doodie.vaultsparkstudios.com` (reserved — no backend yet)

## Deployment standards

Before making deployment, domain, GitHub Pages, or studio-site integration
changes, read these files from the studio repo first:

- `docs/STUDIO_DEPLOYMENT_STANDARD.md`
- `docs/STUDIO_BACKEND_PLAN.md`
- `docs/DEPLOY_PAGES.md`
- `docs/templates/deploy-pages.template.yml`
- `docs/templates/GAME_LAUNCH_CHECKLIST.template.md`

## Required behavior

- Treat `STUDIO_DEPLOYMENT_STANDARD.md` as the default studio-wide policy.
- Game repo name and public slug are identical: `call-of-doodie`.
- The Vite base path must stay `/call-of-doodie/` (lowercase) in `vite.config.js`.
- GitHub Pages source is set to **GitHub Actions** (already configured).
- `npm run build` must pass before any commit is pushed.
- Update `CODEX_HANDOFF_YYYY-MM-DD.md` after any significant session of work.
- Never commit `.env` files, credentials, or large binaries.

## Tech stack

| Layer      | Technology          |
|------------|---------------------|
| Framework  | React 19            |
| Bundler    | Vite 6              |
| Language   | JavaScript (JSX)    |
| Hosting    | GitHub Pages        |
| Storage    | localStorage only (no backend) |

## Project structure

```
call-of-doodie/
├── index.html
├── package.json
├── vite.config.js              # base: "/call-of-doodie/"
├── AGENTS.md                   # this file
├── CODEX_HANDOFF_YYYY-MM-DD.md # latest session handoff
├── HANDOFF.md                  # legacy handoff (superseded)
├── .github/workflows/deploy.yml
└── src/
    ├── main.jsx
    ├── App.jsx                 # Game loop + state orchestrator (~1300 lines)
    ├── constants.js            # WEAPONS, ENEMY_TYPES, PERKS, ACHIEVEMENTS, DIFFICULTIES, META_UPGRADES, STARTER_LOADOUTS, etc.
    ├── storage.js              # Leaderboard + career stats + daily missions + meta-progression
    ├── sounds.js               # Web Audio API synthesis — zero audio files
    └── components/
        ├── UsernameScreen.jsx
        ├── MenuScreen.jsx
        ├── DeathScreen.jsx
        ├── HUD.jsx
        ├── PauseMenu.jsx
        ├── LeaderboardPanel.jsx
        ├── AchievementsPanel.jsx
        └── PerkModal.jsx
```

## Key architecture notes

- All game logic lives in a single `gameLoop` useCallback in `App.jsx`.
- Heavy use of refs (gsRef, perkModsRef, statsRef, etc.) to avoid stale closures in the RAF loop.
- React state is used only for UI rendering; refs drive all game-loop logic.
- `perkPendingRef` halts the game loop (same mechanism as `pausedRef`) while perk modal is open.
- Canvas 2D context is cached in `ctxRef` for performance.
- localStorage keys: `cod-lb-v5` (leaderboard), `cod-career-v1` (career stats), `cod-meta-v1` (meta-progression), `cod-missions-YYYY-MM-DD` (daily missions), `cod-autoaim` (auto-aim toggle).

## Active perkModsRef fields

`damageMult`, `critBonus`, `lifesteal`, `pickupRange`, `pierce`, `ammoMult`,
`grenadeCDMult`, `dashCDMult`, `comboTimerMult`, `xpMult`, `grenadeDamageMult`,
`lastResort`, `hasVampire`, `hasAdrenaline`

## Workflows

| File | Purpose |
|------|---------|
| `.github/workflows/deploy.yml` | Build + deploy to GitHub Pages on push to `main` |

## Scripts

```bash
npm run dev      # Local dev server
npm run build    # Production build (must pass before any push)
npm run preview  # Preview production build
```

## Known limitations / future work

- Leaderboard is localStorage only — no global/cross-user persistence
- No gamepad/controller support
- App.jsx is ~1300 lines — game loop could be extracted to a custom hook
- No backend — `play-` and `api-` origins are reserved but not active
- Capacitor/PWA wrapping for App Store not yet started
