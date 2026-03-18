# Current State

Build status:
- Build: passing (`npm run build` clean)
- Latest commit: `ea4f054` — pushed and deploying
- Deployed: live at `https://vaultsparkstudios.com/call-of-doodie/`
- Branch: `main`, fully committed and pushed

Current priorities:
1. Playtest all new perks + weapons in-browser
2. Run Supabase SQL migration (callsign_claims table + updated leaderboard RLS) in console to activate server-side callsign enforcement

Known issues:
- Boss ground slam: random initial stagger (0–179 frames) can shorten the 90-frame warning window on the very first slam cycle
- Overclocked perk: taking it twice resets overclockedShots mid-game (minor edge case)
- ID "scavenger" exists in both PERKS and META_UPGRADES arrays — no runtime collision, naming hazard only
- Callsign locking is localStorage-only (no server-side enforcement — RLS still allows any name)
- starterLoadout column in Supabase only populates on future score submissions (old rows show no loadout badge)
- Mobile action bar may be tight with 6 weapons on very small screens

Architecture:
- App.jsx: ~1150 lines (render extracted to drawGame.js in session 8)
- drawGame.js: ~620 lines — pure render, no React setters. Called once per frame from gameLoop
- drawGame signature: `drawGame(ctx, canvas, W, H, gs, { dashRef, mouseRef, joystickRef, shootStickRef, startTimeRef, frameCountRef, isMobile, tip, wpnIdx })`
- bossKillFlash is decremented in App.jsx game loop ONLY — not inside drawGame (bug fixed this session)

Backend:
- Supabase global leaderboard live (`fjnpzjjyhnpmunfoycrp.supabase.co`)
- RLS enabled: public SELECT + INSERT (score 1–10M), no UPDATE/DELETE
- Table columns: id, name, score, kills, wave, lastWords, rank, bestStreak, totalDamage, level, time, achievements, difficulty, starterLoadout, ts, created_at
- Secrets set in GitHub Actions: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY

PWA:
- public/manifest.json + public/sw.js deployed
- SW strategy: network-first navigation, cache-first assets
- icon: public/icon.svg (SVG file, not data URI)
