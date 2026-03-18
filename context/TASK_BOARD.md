# Task Board

## Now (playtest + polish)
- Playtest space + arctic map themes, no-hit-wave + single-weapon missions
- Verify leaderboard "Load More" in production
- Run Supabase SQL migration in console to activate server-side callsign enforcement (SQL in storage.js comments)

## Next
- Capacitor wrapper for iOS App Store submission

## Later
- More daily mission types
- More map variety / new map themes

## Done (session 11)
- ✅ Leaderboard pagination: loadLeaderboard(offset, limit=50) using Supabase .range(); "LOAD MORE ↓" button in LeaderboardPanel; lbHasMore + loadMoreLeaderboard threaded through App→MenuScreen/DeathScreen→LeaderboardPanel
- ✅ gameHelpers.js: spawnEnemy + spawnBoss extracted to pure module-level functions (no React deps); App.jsx useCallbacks are now thin wrappers; ~100 lines removed from App.jsx
- ✅ New daily missions: no_hit_wave (clear N waves without taking damage — gs.damageThisWave tracked per wave, statsRef.noHitWaves incremented on clean clears) and single_weapon (get N kills with a single weapon — bullets carry wpnIdx, statsRef.weaponKills[idx] per weapon, max used for mission check)
- ✅ 2 new map themes: space (6, deep black-purple, cosmic props 🚀🛸🌌, low sine hum + blips ambient) and arctic (7, cold blue, icy props ❄🐧🦭, wind + ice creak ambient); theme count 6→8 across App.jsx, drawGame.js, sounds.js

## Done (session 10)
- ✅ Gamepad vibration/rumble: `rumbleGamepad(weak, strong, ms)` module-level helper; 8 distinct rumble events covering hits, damage types, boss kill, death
- ✅ Ambient room tone: `startAmbient(themeIndex)` / `stopAmbient()` in sounds.js; 6 themes (now 8 with session 11)

## Done (session 9)
- ✅ Perk synergies: Storm Vampire (chain_lightning+vampire), Pyro Grenadier (grenadier+pyromaniac), Dead Eye (eagle_eye+penetrator)
- ✅ Boss wave 40+ scaling: shared ability cooldown (120 frames); bullet ring + ground slam timers scale ×1.4/1.2
- ✅ Weapon sounds: boomerang WHOOSH + railgun CRACK
- ✅ Daily missions: 4 new types — perk_collector, nuke_user, high_roller, arms_race
- ✅ Overclocked heat gauge: HUD bar 0–20 shot heat
- ✅ Wave streak bonus: ≥3 streak HUD badge + score bonus

## Done (session 8)
- ✅ Elite enemy variants (armored/fast/explosive) from wave 10+
- ✅ Gamepad/controller full support with 🎮 HUD indicator
- ✅ 8 new perks + wave shop balance + boss telegraphing
- ✅ drawGame.js extraction + PWA + Settings panel + Music vibes + Seed replay
