# Current State

Build status:
- Build: passing (`npm run build` clean)
- Latest commit: `22ef0b9` — Enable all leaderboard columns after Supabase migrations
- Deployed: live at `https://vaultsparkstudios.com/call-of-doodie/`
- Branch: `main`, pushed

Current priorities:
1. Score attack mode (timed 5-min run, score leaderboard)
2. Prestige skin unlocks (emoji skins at prestige 1/2/3)
3. Weapon-specific kill UI on DeathScreen (top 3 weapons)

Known issues:
- Boss ground slam: random initial stagger (0–179 frames) can shorten 90-frame warning on first cycle
- Overclocked perk: taking it twice resets overclockedShots mid-game (minor edge case)
- ID "scavenger" exists in both PERKS and META_UPGRADES — no runtime collision, naming hazard only
- Callsign locking: localStorage + server-side (callsign_claims RLS). SQL migration documented in storage.js; must be run manually in Supabase console
- Gamepad rumble requires Chrome 68+ / Vibration Actuator API; silent no-op on Firefox/Safari

Architecture:
- App.jsx: ~1500 lines (spawn logic in gameHelpers.js)
- drawGame.js: ~660 lines — pure render, no React setters
- gameHelpers.js: ~106 lines — spawnEnemy(gs, W, H, difficultyId), spawnBoss(gs, W, H, difficultyId, typeIndex)
- `rumbleGamepad(weak, strong, ms)` — module-level helper in App.jsx using Gamepad Haptics API
- `startAmbient(themeIndex)` / `stopAmbient()` — in sounds.js; 8 themes (0–7)
- `TutorialOverlay.jsx` — first-run wave-1 hints; key `cod-tutorial-v1`

Map themes: 0=office 1=bunker 2=factory 3=ruins 4=desert 5=forest 6=space 7=arctic
Leaderboard: paginated 50/page, Load More in LeaderboardPanel. loadLeaderboard(offset, limit)

Backend:
- Supabase global leaderboard live (`fjnpzjjyhnpmunfoycrp.supabase.co`)
- RLS enabled: public SELECT + INSERT (score 1–10M), no UPDATE/DELETE
- Table columns (all live): id, name, score, kills, wave, lastWords, rank, bestStreak, totalDamage, level, time, achievements, difficulty, starterLoadout, customSettings, inputDevice, seed, accountLevel, ts, created_at
- All column migrations complete — no stripping in saveToLeaderboard
- Secrets set in GitHub Actions: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY

PWA:
- public/manifest.json + public/sw.js deployed
- SW strategy: network-first navigation, cache-first assets
- icon: public/icon.svg (SVG file, not data URI)
- Install prompt captured via `beforeinstallprompt` → `pwaPromptRef`; surfaced as "Install App" button on DeathScreen
