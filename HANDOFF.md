# Session Handoff — Call-Of-Doodie

## Project Overview

**Call-Of-Doodie** is a Call of Duty parody browser-based shooter game built with Vite + React. It is deployed via GitHub Pages.

- **Repo**: `VaultSparkStudios/Call-Of-Doodie`
- **Default branch**: `main`
- **Deployment**: GitHub Pages via GitHub Actions (`.github/workflows/deploy.yml`)
- **Domain**: vaultsparkstudios.com (custom domain configured)
- **URL base slug**: `/call-of-doodie/` (lowercase — this is the standard, set in `vite.config.js`)

## Tech Stack

| Layer     | Technology       |
|-----------|------------------|
| Framework | React 19         |
| Bundler   | Vite 6           |
| Language  | JavaScript (JSX) |
| Hosting   | GitHub Pages     |

## Project Structure

```
Call-Of-Doodie/
├── index.html
├── package.json
├── vite.config.js          # base: "/call-of-doodie/" (lowercase)
├── HANDOFF.md
├── .github/workflows/deploy.yml
└── src/
    ├── main.jsx            # Entry point
    ├── App.jsx             # Game loop + state orchestrator (~700 lines)
    ├── constants.js        # All game constants, PERKS, ACHIEVEMENTS, etc.
    ├── storage.js          # Leaderboard + persistent career stats
    ├── sounds.js           # Web Audio API synthesis (no audio files)
    └── components/
        ├── UsernameScreen.jsx
        ├── MenuScreen.jsx       # Includes career stats panel
        ├── DeathScreen.jsx
        ├── HUD.jsx              # In-game overlay + desktop toolbar
        ├── PauseMenu.jsx        # Rules / Controls / Most Wanted List
        ├── LeaderboardPanel.jsx
        ├── AchievementsPanel.jsx
        └── PerkModal.jsx        # Roguelite perk picker (new)
```

## Scripts

```bash
npm run dev      # Local dev server
npm run build    # Production build
npm run preview  # Preview production build
```

## Git Configuration

- **user.name**: `VaultSparkStudios`
- **user.email**: `founder@vaultsparkstudios.com`

## Recent Development History

| Commit | Description |
|--------|-------------|
| (latest) | Refactor into components; add boss waves, weapon upgrades, perks, sounds, career stats |
| `5e0c26e` | Revert: Add home screen menus, career stats, weapon upgrades, boss waves |
| `9a526b3` | Fix leaderboard, respawn system, add Guardian Angel power-up and difficulty levels |
| `fc40772` | Set up Vite + React project for GitHub Pages deployment |

## Key Features Implemented

- **Boss waves** — Every 5th wave spawns a scaled boss (Mega Karen → Landlord → both at wave 15+)
- **Weapon upgrades** — 🔧 pickup drops; up to ⭐⭐⭐ per weapon (+25% dmg, −10% fire delay, +25% ammo)
- **Roguelite perks** — 12 perks picked on every level-up, all stackable (damage, crit, lifesteal, pierce, etc.)
- **Sound effects** — Full Web Audio API synthesis; no audio files required
- **Persistent career stats** — Cross-run totals in localStorage (`cod-career-v1`)
- **Leaderboard** — Local top-100, stored in localStorage (`cod-lb-v5`)
- **38 achievements** — Including boss wave, perk, and upgrade achievements
- **Difficulty levels** — Easy / Normal / Hard / INSANE
- **Combo / killstreak / XP / dash / grenade / Guardian Angel / nuke / radar**
- **Mobile** — Dual virtual joystick controls
- **"Most Wanted List"** (renamed from Bestiary)

## Architecture Notes

- Game loop is a single `gameLoop` useCallback in `App.jsx` — uses refs heavily to avoid stale closures
- `perkModsRef.current` holds all active perk multipliers: `damageMult`, `critBonus`, `lifesteal`, `pickupRange`, `pierce`, `ammoMult`, `grenadeCDMult`, `dashCDMult`, `comboTimerMult`, `xpMult`
- `perkPendingRef` pauses the game loop (same as `pausedRef`) while perk modal is open
- Weapon upgrade levels are tracked in `gsRef.current.weaponUpgrades[0..3]`
- React 19 in use — hook rules are strict; always define hooks unconditionally at top level

## Known Considerations / Future Work

- No backend — leaderboard is localStorage only (not truly global)
- No gamepad/controller support
- Boss shield mechanic (from a previously reverted PR) not reimplemented yet
- Game loop could be extracted to a custom `useGameLoop` hook for further cleanliness

## Transition Notes for Terminal-Based AI Agent

1. **Local setup**: Run `npm install` if `node_modules` is missing or stale.
2. **URL slug standard**: Always use lowercase `/call-of-doodie/` as the `base` in `vite.config.js`.
3. **Testing changes**: Use `npm run dev` to test locally before pushing.
4. **Deploying**: Push to `main` — GitHub Actions builds and deploys automatically.
5. **Branch naming**: Claude Code branches follow the pattern `claude/<description>-<sessionId>`.
