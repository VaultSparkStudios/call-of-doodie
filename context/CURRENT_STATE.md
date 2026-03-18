# Current State

Build status:
- Build: passing (`npm run build` clean)
- Latest commit: `a031204` — Session 12: seed info in Rules modal, custom-settings ⚙️ badge on leaderboard
- Deployed: live at `https://vaultsparkstudios.com/call-of-doodie/`
- Branch: `main`, pushed

Current priorities:
1. Playtest new map themes (space + arctic) and new daily missions (no-hit wave, single weapon)
2. Verify leaderboard "Load More" works in production (requires Supabase with real data)
3. Run Supabase SQL migration (callsign_claims table + updated leaderboard RLS) in console
4. Future: add `customSettings` column to Supabase leaderboard table so the ⚙️ badge shows for all entries (not just local)

Known issues:
- Boss ground slam: random initial stagger (0–179 frames) can shorten the 90-frame warning window on the very first slam cycle
- Overclocked perk: taking it twice resets overclockedShots mid-game (minor edge case)
- ID "scavenger" exists in both PERKS and META_UPGRADES arrays — no runtime collision, naming hazard only
- Callsign locking is localStorage-only (no server-side enforcement — RLS still allows any name)
- starterLoadout column in Supabase only populates on future score submissions (old rows show no loadout badge)
- Gamepad rumble requires Chrome 68+ / Vibration Actuator API; silent no-op on Firefox/Safari

Architecture:
- App.jsx: ~1400 lines (spawn logic extracted to gameHelpers.js)
- drawGame.js: ~640 lines — pure render, no React setters
- gameHelpers.js: ~100 lines — spawnEnemy(gs, W, H, difficultyId), spawnBoss(gs, W, H, difficultyId, typeIndex)
- `rumbleGamepad(weak, strong, ms)` — module-level helper in App.jsx using Gamepad Haptics API
- `startAmbient(themeIndex)` / `stopAmbient()` — in sounds.js; 8 themes (0–7)

Map themes: 0=office 1=bunker 2=factory 3=ruins 4=desert 5=forest 6=space 7=arctic
Leaderboard: paginated 50/page, Load More in LeaderboardPanel. loadLeaderboard(offset, limit)

Backend:
- Supabase global leaderboard live (`fjnpzjjyhnpmunfoycrp.supabase.co`)
- RLS enabled: public SELECT + INSERT (score 1–10M), no UPDATE/DELETE
- Table columns: id, name, score, kills, wave, lastWords, rank, bestStreak, totalDamage, level, time, achievements, difficulty, starterLoadout, ts, created_at
- Secrets set in GitHub Actions: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY

PWA:
- public/manifest.json + public/sw.js deployed
- SW strategy: network-first navigation, cache-first assets
- icon: public/icon.svg (SVG file, not data URI)
