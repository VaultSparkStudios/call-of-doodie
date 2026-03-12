# Session Handoff — Call-Of-Doodie

## Project Overview

**Call-Of-Doodie** is a Call of Duty parody browser-based shooter game built with Vite + React. Deployed via GitHub Pages.

- **Repo**: `VaultSparkStudios/Call-Of-Doodie`
- **Default branch**: `main`
- **Deployment**: GitHub Pages via GitHub Actions (`.github/workflows/deploy.yml`)
- **Domain**: vaultsparkstudios.com (custom domain configured)
- **URL base slug**: `/call-of-doodie/` ← **lowercase is the standard** (set in `vite.config.js`)

---

## Git State

Clean. Commit `bbd3592` is pushed to `origin/main`. All features from session 2 are live.

---

## Pending Work

### 1. Studio Deployment Standards compliance
The studio owner mentioned an **AGENTS file** and **Studio Deployment Standards** in a separate studio site repo. This session did not have access to that repo. Next session must:
- Locate the studio site repo and read the AGENTS file and Deployment Standards
- Audit `call-of-doodie` against those standards
- Make any required changes (file naming, structure, config, metadata, etc.)

### 2. Game memory file
The studio owner requested a game-specific memory file be created. Deferred until standards doc is reviewed so the format matches requirements.

---

## Tech Stack

| Layer     | Technology       |
|-----------|------------------|
| Framework | React 19         |
| Bundler   | Vite 6           |
| Language  | JavaScript (JSX) |
| Hosting   | GitHub Pages     |

---

## Project Structure

```
Call-Of-Doodie/
├── index.html
├── package.json
├── vite.config.js              # base: "/call-of-doodie/" (lowercase — standard)
├── HANDOFF.md                  # this file
├── .github/workflows/deploy.yml
└── src/
    ├── main.jsx                # Entry point (unchanged)
    ├── App.jsx                 # Game loop + state orchestrator (~700 lines)
    ├── constants.js            # WEAPONS, ENEMY_TYPES, PERKS, ACHIEVEMENTS, DIFFICULTIES, etc.
    ├── storage.js              # Leaderboard (cod-lb-v5) + career stats (cod-career-v1)
    ├── sounds.js               # Web Audio API synthesis — no audio files needed
    └── components/
        ├── UsernameScreen.jsx
        ├── MenuScreen.jsx      # Main menu — includes Rules, Controls, Most Wanted, Career, Achievements
        ├── DeathScreen.jsx
        ├── HUD.jsx             # In-game overlay + desktop weapon toolbar
        ├── PauseMenu.jsx       # Rules / Controls / Most Wanted List sub-views (also in pause)
        ├── LeaderboardPanel.jsx
        ├── AchievementsPanel.jsx
        └── PerkModal.jsx       # Roguelite perk picker
```

---

## Features Implemented (sessions 1–3)

| Feature | Details |
|---------|---------|
| **Boss waves** | Every 5th wave — Mega Karen (5–9), Landlord (10–14), both (15+). Red bg, pulsing radar, guaranteed drops |
| **Weapon upgrades** | 🔧 pickup, up to ⭐⭐⭐ per weapon. +25% dmg, −10% fire delay, +25% ammo per star |
| **Roguelite perks** | 12 perks, one chosen on every level-up from 3 random options. All stackable |
| **Sound effects** | Full Web Audio API synthesis — unique sounds for every game event, zero audio files |
| **Career stats** | Persistent across runs in localStorage (`cod-career-v1`) |
| **Component refactor** | App.jsx split from 1484 → ~700 lines; all UI moved to `src/components/` |
| **38 achievements** | Includes perks, upgrades, boss wave clears |
| **Lowercase URL slug** | `vite.config.js` base changed from `/Call-Of-Doodie/` → `/call-of-doodie/` |
| **Main menu info panels** | Rules, Controls, and Most Wanted List now accessible from main menu (not just pause) |

---

## Architecture Notes

- Game loop: single `gameLoop` useCallback in `App.jsx` — heavy use of refs to avoid stale closures
- `perkModsRef.current` active fields: `damageMult`, `critBonus`, `lifesteal`, `pickupRange`, `pierce`, `ammoMult`, `grenadeCDMult`, `dashCDMult`, `comboTimerMult`, `xpMult`
- `perkPendingRef` halts the game loop (same mechanism as `pausedRef`) while perk modal is open
- Weapon upgrade levels stored in `gsRef.current.weaponUpgrades[0..3]`
- React 19 — hook rules enforced; all hooks must be unconditional at top level

---

## Scripts

```bash
npm run dev      # Local dev server
npm run build    # Production build (must pass before any push)
npm run preview  # Preview production build
```

## Git / Deploy Standards

- **Deploy trigger**: push to `main` → GitHub Actions auto-deploys to GitHub Pages
- **Branch naming**: `claude/<description>-<sessionId>`
- **URL slug**: always lowercase `/call-of-doodie/` in `vite.config.js`
- **Git config**: user.name `VaultSparkStudios` · user.email `founder@vaultsparkstudios.com`
- **Build must pass** (`npm run build`) before any push or PR

---

## Known Limitations / Future Work

- Leaderboard is localStorage only — not truly global (no backend)
- No gamepad/controller support
- Boss shield mechanic (reverted in a prior PR) not reimplemented
- Game loop could be extracted to a `useGameLoop` hook
- Studio Deployment Standards compliance not yet verified (pending access to studio site repo + AGENTS file)
