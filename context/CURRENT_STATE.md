# Current State

## Build
- Status: ✅ passing (`npm run build` clean, 4.4s, 757KB bundle)
- Latest commit: `dd3c36d` — Session 26
- Branch: `main`, pushed to `origin/main`
- Deployed: live at `https://vaultsparkstudios.com/call-of-doodie/`

## Architecture sizes (approx)
- `App.jsx`: ~3400+ lines (game loop + state orchestrator)
- `drawGame.js`: ~1050 lines (pure render, no React setters)
- `gameHelpers.js`: ~200 lines — spawnEnemy/spawnBoss/BOSS_ROTATION
- `constants.js`: large — WEAPONS(12), ENEMY_TYPES(22), PERKS(40+), CURSED_PERKS, ACHIEVEMENTS(57), DIFFICULTIES, META_TREE, getWeeklyGauntlet, etc.
- `sounds.js`: ~571 lines — Web Audio API synthesis + procedural background music
- `storage.js`: ~400 lines — Supabase + localStorage, career, meta, missions, meta tree, run history

## Active game modes (all mutually exclusive)
- **Normal**: standard run — mode: null
- **Score Attack**: 5-min countdown, 1.5× spawn — mode: "score_attack"
- **Daily Challenge**: fixed LCG seed per day — mode: "daily_challenge"
- **Cursed Run**: all cursed perks, 3× score — mode: "cursed"
- **Boss Rush**: every wave a boss, dual from wave 4 — mode: "boss_rush"
- **Speedrun**: live green ⏱ MM:SS HUD timer — mode: "speedrun"
- **Gauntlet**: weekly fixed weapon/perk, no shop — mode: "gauntlet"

## Enemy roster (22 types, indices 0–21)
- Regular: 0–15, 19 (Doomscroller)
- Boss-only: 4 (Mega Karen), 16 (Splitter), 17 (Juggernaut), 18 (Summoner), 9 (Landlord), 20 (The Algorithm)
- Secret: 21 (The Developer) — wave 50+, one-time spawn
- BOSS_ROTATION: [4, 16, 17, 18, 9, 20]

## Prestige skins (PLAYER_SKINS in MenuScreen.jsx)
- P0: "" Soldier (default) · P1: 🤖 Robot · P2: 👾 Alien · P3: 🐸 Frog · P4: 🦊 Fox · P5: 🐉 Dragon

## Supabase leaderboard columns (all live)
- id, name, score, kills, wave, lastWords, rank, bestStreak, totalDamage, level, time
- achievements, difficulty, starterLoadout, customSettings, inputDevice, seed, accountLevel, ts, created_at
- mode (score_attack/daily_challenge/cursed/boss_rush/speedrun/gauntlet/null), game_id ('cod'), sig (HMAC)
- callsign_claims table + RLS policy ✅ live 2026-03-26
- prestige column: ⚠ PENDING — run `ALTER TABLE leaderboard ADD COLUMN IF NOT EXISTS prestige integer DEFAULT 0;`

## localStorage keys (complete)
| Key | Purpose |
|-----|---------|
| `cod-lb-v5` | Leaderboard fallback |
| `cod-career-v1` | Career stats |
| `cod-meta-v2` | Meta progression (prestige, playerSkin, upgradeTiers, careerPoints) |
| `cod-meta-tree-v1` | META_TREE unlocked node IDs (Set) |
| `cod-missions-YYYY-MM-DD` | Daily mission progress |
| `cod-daily-YYYY-MM-DD` | Daily challenge submitted marker |
| `cod-callsign-v1` | Locked callsign |
| `cod-run-history-v1` | Last 10 run summaries |
| `cod-custom-loadouts-v1` | 3-slot custom loadout presets |
| `cod-ghost-{mode}-v1` | sessionStorage per-mode ghost positions |
| `cod-music-muted` / `cod-music-vibe` / `cod-colorblind` / `cod-settings-v1` / `cod-presets-v1` / `cod-tutorial-v1` | Prefs |

## New utilities (session 26)
- `src/utils/analytics.js` — PostHog CDN loader (VITE_POSTHOG_KEY gated)
- `src/utils/loadoutCode.js` — 3-char hex loadout share code
- `src/components/MetaTreePanel.jsx` — META_TREE browser UI
- `eslint.config.js` — ESLint 9 flat config

## Vault Member Integration (live as of 2026-03-24)
- `src/storage.js` — `_tryAwardVaultPoints()` fires after every leaderboard submit
- Writes to `game_sessions` table (game_slug: 'call-of-doodie') + calls `award_vault_points` RPC (3 pts)
- Silent and non-blocking

## Deferred (user action, non-blocking)
- Supabase: `ALTER TABLE leaderboard ADD COLUMN IF NOT EXISTS prestige integer DEFAULT 0;`
- Discord URL: uncomment footer link in `MenuScreen.jsx` when invite URL available

## PWA
- `public/manifest.json` + `public/sw.js` v3 deployed
- SW strategy: cache-first assets, stale-while-revalidate shell, network-only API, offline fallback

## Known issues (minor, low priority)
- Boss ground slam: random stagger can shorten 90-frame warning on first cycle
- Overclocked perk: taking it twice resets overclockedShots mid-game
- Gamepad rumble requires Chrome 68+
- Discord link in MenuScreen footer commented out
