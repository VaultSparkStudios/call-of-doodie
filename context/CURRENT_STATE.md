# Current State

Build status:
- Build: passing (`npm run build` clean)
- Latest commit: `fc76906` — Session 17: Score Attack mode, prestige skins, weapon kill breakdown
- Deployed: live at `https://vaultsparkstudios.com/call-of-doodie/`
- Branch: `main`, pushed

Current priorities:
1. Run Supabase migration: `ALTER TABLE leaderboard ADD COLUMN IF NOT EXISTS "mode" text;` then remove `mode` strip in storage.js
2. Score attack leaderboard visibility (after migration)
3. Skin visible on share card (generateScoreCard in DeathScreen.jsx)

Known issues:
- Boss ground slam: random initial stagger (0–179 frames) can shorten 90-frame warning on first cycle
- Overclocked perk: taking it twice resets overclockedShots mid-game (minor edge case)
- ID "scavenger" exists in both PERKS and META_UPGRADES — no runtime collision, naming hazard only
- Callsign locking: callsign_claims SQL migration still needs to be run manually in Supabase console
- Gamepad rumble requires Chrome 68+; silent no-op on Firefox/Safari
- Discord link in MenuScreen footer is commented out — fill in with actual invite URL when ready
- `mode` field stripped from Supabase insert until migration run — score attack entries only visible in localStorage leaderboard for now

Architecture:
- App.jsx: ~1520 lines (spawn logic in gameHelpers.js)
- drawGame.js: ~660 lines — pure render, no React setters
- gameHelpers.js: ~106 lines — spawnEnemy(gs, W, H, difficultyId), spawnBoss(gs, W, H, difficultyId, typeIndex)
- `scoreAttackRef` — synced with `scoreAttackMode` state; read by game loop and submitScore
- `weaponKillsSnapshot` state — captured at player death, passed to DeathScreen

Map themes: 0=office 1=bunker 2=factory 3=ruins 4=desert 5=forest 6=space 7=arctic
Leaderboard: paginated 50/page, Load More in LeaderboardPanel. loadLeaderboard(offset, limit)
Leaderboard filters: mode tabs (ALL / NORMAL / SCORE ATK) + difficulty tabs (ALL / EASY / NORMAL / HARD / INSANE)

Backend:
- Supabase global leaderboard live (`fjnpzjjyhnpmunfoycrp.supabase.co`)
- RLS enabled: public SELECT + INSERT (score 1–10M), no UPDATE/DELETE
- Table columns (live): id, name, score, kills, wave, lastWords, rank, bestStreak, totalDamage, level, time, achievements, difficulty, starterLoadout, customSettings, inputDevice, seed, accountLevel, ts, created_at
- Pending column: `mode` text — run migration then remove strip in saveToLeaderboard
- Secrets set in GitHub Actions: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY

PWA:
- public/manifest.json + public/sw.js deployed
- SW strategy: network-first navigation, cache-first assets
- Install prompt captured via `beforeinstallprompt` → `pwaPromptRef`; surfaced as "Install App" button on DeathScreen
