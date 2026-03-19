# Current State

Build status:
- Build: passing (`npm run build` clean)
- Latest commit: `f2d82e7` — Session 14: new perks, map themes, bug fixes, challenge links, tutorial, PWA
- Deployed: live at `https://vaultsparkstudios.com/call-of-doodie/`
- Branch: `main`, pushed

Current priorities:
1. Run Supabase SQL migrations (4 steps in `storage.js` comments): anon auth, `customSettings` + `inputDevice` columns, callsign_claims table + updated RLS
2. Implement boss variety (Splitter, Shielded Juggernaut, Summoner) — biggest gameplay gap
3. Implement wave events (Fast Round, Siege, Elite Only, Fog of War)
4. Enemy death sounds per type — one hit/death sound for all enemies is the biggest feel gap

Known issues:
- Boss ground slam: random initial stagger (0–179 frames) can shorten the 90-frame warning window on the very first slam cycle
- Overclocked perk: taking it twice resets overclockedShots mid-game (minor edge case)
- ID "scavenger" exists in both PERKS and META_UPGRADES arrays — no runtime collision, naming hazard only
- Callsign locking is localStorage-only (no server-side enforcement — RLS still allows any name; SQL migration pending)
- starterLoadout column in Supabase only populates on future score submissions (old rows show no loadout badge)
- Gamepad rumble requires Chrome 68+ / Vibration Actuator API; silent no-op on Firefox/Safari
- `customSettings` + `inputDevice` fields stripped from Supabase INSERT until SQL migrations run

Architecture:
- App.jsx: ~1450 lines (spawn logic in gameHelpers.js)
- drawGame.js: ~660 lines — pure render, no React setters
- gameHelpers.js: ~106 lines — spawnEnemy(gs, W, H, difficultyId), spawnBoss(gs, W, H, difficultyId, typeIndex)
- `rumbleGamepad(weak, strong, ms)` — module-level helper in App.jsx using Gamepad Haptics API
- `startAmbient(themeIndex)` / `stopAmbient()` — in sounds.js; 8 themes (0–7)
- `TutorialOverlay.jsx` — new component; shows first-run wave-1 hints; key `cod-tutorial-v1`

Map themes: 0=office 1=bunker 2=factory 3=ruins 4=desert 5=forest 6=space 7=arctic
Leaderboard: paginated 50/page, Load More in LeaderboardPanel. loadLeaderboard(offset, limit)

Backend:
- Supabase global leaderboard live (`fjnpzjjyhnpmunfoycrp.supabase.co`)
- RLS enabled: public SELECT + INSERT (score 1–10M), no UPDATE/DELETE
- Table columns: id, name, score, kills, wave, lastWords, rank, bestStreak, totalDamage, level, time, achievements, difficulty, starterLoadout, ts, created_at
- Pending columns (need migration): `customSettings` boolean, `inputDevice` text
- Secrets set in GitHub Actions: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY

PWA:
- public/manifest.json + public/sw.js deployed
- SW strategy: network-first navigation, cache-first assets
- icon: public/icon.svg (SVG file, not data URI)
- Install prompt captured via `beforeinstallprompt` → `pwaPromptRef`; surfaced as "Install App" button on DeathScreen
