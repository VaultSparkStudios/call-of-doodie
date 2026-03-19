# Session Handoff — Call-Of-Doodie

> **Legacy document** — kept for repo history. See `AGENTS.md` for agent instructions and `context/CURRENT_STATE.md` for the live state of the project.

## Project Overview

**Call-Of-Doodie** is a Call of Duty parody browser-based top-down arcade shooter built with React 19 + Vite 6. Deployed via GitHub Pages at `https://vaultsparkstudios.com/call-of-doodie/`.

- **Repo**: `VaultSparkStudios/call-of-doodie`
- **Default branch**: `main`
- **Deployment**: GitHub Pages via GitHub Actions (`.github/workflows/deploy.yml`)
- **URL base slug**: `/call-of-doodie/` (lowercase — set in `vite.config.js`)

---

## Git State (as of session 14)

Clean. Commit `f2d82e7` pushed to `origin/main`. All session 14 features are live.

---

## Tech Stack

| Layer     | Technology                          |
|-----------|-------------------------------------|
| Framework | React 19                            |
| Bundler   | Vite 6                              |
| Language  | JavaScript (JSX)                    |
| Hosting   | GitHub Pages                        |
| Backend   | Supabase (leaderboard + anon auth)  |

---

## Project Structure

```
call-of-doodie/
├── index.html
├── package.json
├── vite.config.js              # base: "/call-of-doodie/"
├── AGENTS.md                   # agent instructions (authoritative)
├── HANDOFF.md                  # this file (legacy)
├── context/
│   ├── CURRENT_STATE.md        # live build + priority status
│   ├── TASK_BOARD.md           # current + upcoming work
│   ├── DECISIONS.md            # architecture decisions log
│   └── PROJECT_BRIEF.md        # design pillars
├── .github/workflows/deploy.yml
└── src/
    ├── main.jsx
    ├── App.jsx                 # Game loop + state orchestrator (~1400 lines)
    ├── drawGame.js             # Extracted render function (~640 lines) — pure, no React deps
    ├── gameHelpers.js          # spawnEnemy, spawnBoss — pure module-level helpers
    ├── constants.js            # WEAPONS, ENEMY_TYPES, PERKS, ACHIEVEMENTS, DIFFICULTIES, META_UPGRADES, etc.
    ├── settings.js             # SETTINGS_DEFAULTS, loadSettings(), saveSettings(), loadPresets(), savePresets()
    ├── storage.js              # Leaderboard (Supabase + localStorage fallback), career stats, meta, missions
    ├── supabase.js             # Supabase client + initAnonAuth() + getAuthUid()
    ├── sounds.js               # Web Audio API synthesis — zero audio files
    └── components/
        ├── UsernameScreen.jsx
        ├── MenuScreen.jsx
        ├── DeathScreen.jsx
        ├── HUD.jsx
        ├── PauseMenu.jsx
        ├── LeaderboardPanel.jsx
        ├── AchievementsPanel.jsx
        ├── PerkModal.jsx
        ├── WaveShopModal.jsx
        └── SettingsPanel.jsx
```

---

## Features Implemented (sessions 1–12)

| Feature | Details |
|---------|---------|
| **12 weapons** | Banana Blaster, RPG, Nerf Minigun, Plunger Launcher, Sniper-ator, Spicy Squirt Gun, Confetti Cannon (shotgun), Shock Zapper (burst:3), Boomerang Blaster, Railgun (hitscan), Ricochet Pistol (bouncesLeft:10), Nuclear Kazoo (pellets:3) |
| **16 enemy types** | 4 difficulty modes; elite variants (armored/fast/explosive) from wave 10+; Life Coach + Tech CEO added |
| **Boss waves** | Every 5th wave — Mega Karen, Landlord, both (15+). Telegraphed with bulletRingWarning + groundSlamWarning |
| **Wave shop** | Every wave 1–4; every 2nd wave from wave 5+. Free reward options |
| **Weapon upgrades** | 🔧 pickup, up to ⭐⭐⭐. +25% dmg, −10% fire delay, +25% ammo per star |
| **40+ perks** | Roguelite perk system, every 3rd level-up. Cursed perks at 35% chance. Perk synergies. 7 new session 14 perks + 3 new cursed |
| **49 achievements** | Persistent via localStorage |
| **Daily missions** | 21 mission types tracked per calendar day |
| **Meta-progression** | Persistent upgrades across runs (`cod-meta-v2`) |
| **Supabase leaderboard** | Global, paginated (50/page, Load More). Anonymous auth via `initAnonAuth()` |
| **Callsign locking** | localStorage enforcement live; server-side SQL migration pending |
| **Gamepad support** | Full controller support + rumble; 🎮 HUD indicator |
| **Mobile** | Dual-joystick, weapon cycle bar, auto-aim toggle |
| **Flow field pathfinding** | BFS, 24px grid, TypedArrays, rebuilt every 30 frames |
| **Seed replay** | Deterministic RNG with shareable seed (0–999998) |
| **GIF highlight reel** | End-of-run GIF capture |
| **Share Score** | Native share API |
| **5 music vibes** | Procedural Web Audio background music |
| **8 map themes** | office, bunker, factory, ruins, desert, forest, space, arctic |
| **Colorblind mode** | CSS filter toggle, persisted in localStorage |
| **PWA** | manifest.json + service worker (network-first nav, cache-first assets) |
| **Settings panel** | 7 gameplay multipliers, up to 3 named presets |
| **GIF highlight reel** | Centers on peak killstreak moment (`bestMomentRef` score = streak×10); boss kill is fallback |
| **Text legibility** | All secondary/tertiary UI text bumped from dark grays (#444–#888) to #aaa/#bbb across all components |
| **Challenge links** | `?seed=XXXXX&diff=normal` URL params parsed in MenuScreen; copy button on DeathScreen |
| **Tutorial overlay** | First-run wave-1 hints (`TutorialOverlay.jsx`); PC/mobile/controller input-mode aware |
| **PWA install prompt** | `beforeinstallprompt` captured; "Install App" button on DeathScreen |
| **HUD theme name** | Map theme emoji + name shown in wave bar (e.g. 🏭 FACTORY) |
| **Map theme vignette** | Per-theme radial atmosphere overlay in drawGame.js; 12 emojis per theme |

---

## Architecture Notes

- Game loop: single `gameLoop` useCallback in `App.jsx` — heavy use of refs to avoid stale closures
- Render extracted to `drawGame(ctx, canvas, W, H, gs, refs)` — pure drawing, no React setters
- Spawn logic extracted to `gameHelpers.js` — `spawnEnemy(gs,W,H,diffId)`, `spawnBoss(gs,W,H,diffId,typeIndex)`
- `perkPendingRef` and `shopPendingRef` both halt the game loop while modals are open
- `perkModsRef.current` active fields: `damageMult`, `critBonus`, `lifesteal`, `pickupRange`, `pierce`, `ammoMult`, `grenadeCDMult`, `grenadeDamageMult`, `dashCDMult`, `comboTimerMult`, `xpMult`, `lastResort`, `fireRateMult`, `adrenalineRush`, `ammoDropMult`, `ammoRestoreMult`

---

## Scripts

```bash
npm run dev      # Local dev server
npm run build    # Production build (must pass before any push)
npm run preview  # Preview production build
```

---

## Known Issues / Pending Work

- Supabase SQL migrations pending (4 steps in `storage.js` comments): anon auth, `customSettings` boolean column, `inputDevice` text column, callsign_claims table + updated RLS
- Until migrations run: `customSettings` + `inputDevice` badges stripped from all Supabase leaderboard INSERTs
- Boss variety: only Mega Karen + Landlord — adding Splitter / Juggernaut / Summoner is the next major gameplay work
- Boss ground slam: random initial stagger can shorten the 90-frame warning window on first slam cycle
- Gamepad rumble: silent no-op on Firefox/Safari (requires Chrome 68+ Vibration Actuator API)
- Discord link in MenuScreen footer commented out (fill in when invite URL is ready)
