# Current State

## Build
- Status: ✅ passing (`npm run build` clean, 3.4s)
- Latest commit: `ec94066` — Session 19 polish — all outstanding items resolved
- Branch: `main`, pushed to `origin/main`
- Deployed: live at `https://vaultsparkstudios.com/call-of-doodie/`

## Architecture sizes
- `App.jsx`: ~1530 lines (game loop + state orchestrator)
- `drawGame.js`: ~700 lines (pure render, no React setters)
- `gameHelpers.js`: ~140 lines — spawnEnemy/spawnBoss
- `constants.js`: large — WEAPONS(12), ENEMY_TYPES(21), PERKS(40+), CURSED_PERKS, ACHIEVEMENTS(49), DIFFICULTIES, STARTER_LOADOUTS, etc.

## Supabase leaderboard columns (all live)
- id, name, score, kills, wave, lastWords, rank, bestStreak, totalDamage, level, time
- achievements, difficulty, starterLoadout, customSettings, inputDevice, seed, accountLevel, ts, created_at
- `mode` text column: ✅ live — score_attack / daily_challenge / null(=normal)

## Active game modes
- **Normal**: standard run
- **Score Attack**: 5-min countdown, 1.5× spawn, forced game-over on timer. `scoreAttackRef` synced to `scoreAttackMode` state. `gs.scoreAttackMode`, `gs.scoreAttackTimeLeft`, `gs.scoreAttackDone`.
- **Daily Challenge**: fixed LCG seed per day (`getDailyChallengeSeed()`). Marks `cod-daily-YYYY-MM-DD` in localStorage. `dailyChallengeRef` / `dailyChallengeMode` state.

## Social / challenge features (all live)
- **Ghost mode**: `challengeVsScore` / `challengeVsName` parsed from `?vs=&vsName=` URL params. Shown in HUD as "BEATING/BEHIND @name ±pts". Challenge result card on DeathScreen (BEATEN🏆/FAILED💀).
- **Challenge links**: DeathScreen "⚔️ COPY CHALLENGE LINK" includes seed+diff+vs+vsName. ✓ COPIED! flash on click.
- **Leaderboard per-row ⚔️ button**: copies pre-filled challenge URL.
- **DAILY tab**: filters `mode === "daily_challenge"`. Shows TODAY badge where `e.seed === getDailyChallengeSeed()`.

## Enemy roster (21 types, indices 0–20)
- Regular: 0–15, 19
- Boss-only: 4 (Mega Karen), 16 (Splitter), 17 (Juggernaut), 18 (Summoner), 9 (Landlord), 20 (The Algorithm)
- Doomscroller (19): wave 9+; freezes 70/280 frames; "zzz 📱" visual + purple ring when frozen; soundEnemyDeath(19) = buzz+chime
- The Algorithm (20): boss, fires 3-shot spread; Viral Surge every ~480 frames — triples spawn rate; soundEnemyDeath(20) = glitch cascade; `gs.algorithmSurge` cleared on death
- BOSS_ROTATION: [4, 16, 17, 18, 9, 20]

## Prestige skins (PLAYER_SKINS in MenuScreen.jsx)
- P0: "" Soldier (default)
- P1: 🤖 Robot
- P2: 👾 Alien
- P3: 🐸 Frog
- P4: 🦊 Fox
- P5: 🐉 Dragon
- `meta.playerSkin` persisted in `cod-meta-v2`. Drawn in drawGame as emoji on helmet. Shown in share card.

## Wave shop
- Options: Field Medkit, Resupply Crate, Field Upgrade, Combat Stim, HP Canister, Damage Boost
- `shopHistory` state in App.jsx (array of {emoji, name}) — passed to WaveShopModal as `boughtHistory`
- WaveShopModal shows "BOUGHT THIS RUN" strip above options

## PauseMenu
- ⚔️ LEADERBOARD button opens full LeaderboardPanel mid-run (receives `leaderboard`, `lbLoading`, `lbHasMore`, `onLoadMore`, `onRefreshLeaderboard`, `username` from App.jsx)

## Known issues (minor, low priority)
- Boss ground slam: random stagger can shorten 90-frame warning on first cycle
- Overclocked perk: taking it twice resets overclockedShots mid-game (minor edge case)
- `scavenger` id exists in both PERKS and META_UPGRADES — no runtime collision, naming hazard only
- Gamepad rumble requires Chrome 68+; silent no-op on Firefox/Safari
- Discord link in MenuScreen footer commented out — fill in when invite URL ready

## Pending Supabase (manual, non-blocking)
- Callsign_claims table + RLS migration (full SQL in storage.js comments) — not yet run. Callsign locking is client-side only until then.
- "Anonymous sign-ins" must be enabled in Supabase Auth settings for callsign server enforcement

## PWA
- `public/manifest.json` + `public/sw.js` deployed
- SW strategy: network-first navigation, cache-first assets
- Install prompt: `beforeinstallprompt` → `pwaPromptRef` → "Install App" on DeathScreen
