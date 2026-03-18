# Current State

Build status:
- Build: passing (`npm run build` clean)
- Latest commit: session 10 changes
- Deployed: live at `https://vaultsparkstudios.com/call-of-doodie/`
- Branch: `main`, needs push to deploy

Current priorities:
1. Push main to trigger deploy
2. Playtest gamepad rumble + ambient sounds
3. Run Supabase SQL migration (callsign_claims table + updated leaderboard RLS) in console

Known issues:
- Boss ground slam: random initial stagger (0–179 frames) can shorten the 90-frame warning window on the very first slam cycle
- Overclocked perk: taking it twice resets overclockedShots mid-game (minor edge case)
- ID "scavenger" exists in both PERKS and META_UPGRADES arrays — no runtime collision, naming hazard only
- Callsign locking is localStorage-only (no server-side enforcement — RLS still allows any name)
- starterLoadout column in Supabase only populates on future score submissions (old rows show no loadout badge)

Architecture:
- App.jsx: ~1470 lines (render extracted to drawGame.js in session 8)
- drawGame.js: ~620 lines — pure render, no React setters. Called once per frame from gameLoop
- drawGame signature: `drawGame(ctx, canvas, W, H, gs, { dashRef, mouseRef, joystickRef, shootStickRef, startTimeRef, frameCountRef, isMobile, tip, wpnIdx })`
- bossKillFlash is decremented in App.jsx game loop ONLY — not inside drawGame (bug fixed session 8)
- gs.waveStreak: tracks consecutive wave clears without dying; reset in handlePlayerDeath
- gs.sharedAbilityCooldown on boss entities: prevents multiple abilities firing simultaneously
- `rumbleGamepad(weak, strong, ms)` — module-level helper in App.jsx using Gamepad Haptics API

Backend:
- Supabase global leaderboard live (`fjnpzjjyhnpmunfoycrp.supabase.co`)
- RLS enabled: public SELECT + INSERT (score 1–10M), no UPDATE/DELETE
- Table columns: id, name, score, kills, wave, lastWords, rank, bestStreak, totalDamage, level, time, achievements, difficulty, starterLoadout, ts, created_at
- Secrets set in GitHub Actions: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY

PWA:
- public/manifest.json + public/sw.js deployed
- SW strategy: network-first navigation, cache-first assets
- icon: public/icon.svg (SVG file, not data URI)
