# Task Board

## Now (playtest + polish)
- Playtest space + arctic map themes, no-hit-wave + single-weapon missions
- Verify leaderboard "Load More" in production
- Run Supabase SQL migration in console to activate server-side callsign enforcement (SQL in storage.js comments)
- Add `customSettings` column to Supabase leaderboard table (ALTER TABLE leaderboard ADD COLUMN "customSettings" boolean) so ⚙️ badge shows for all entries, not just localStorage ones

## Next
- Capacitor wrapper for iOS App Store submission

## Later
- More daily mission types
- More map variety / new map themes
- Distinct railgun sound (currently reuses Sniper-ator CRACK!)

## Done (session 13)
- ✅ GIF highlight reel: `bestMomentRef` now updates on every new run-best killstreak kill (score = streak×10); GIF centers on peak killstreak moment; boss kill remains fallback (score 100)
- ✅ Gray text legibility pass: all dark grays (#444–#888) across DeathScreen, LeaderboardPanel, MenuScreen, PerkModal, SettingsPanel, and HUD weapon counter bumped to #aaa/#bbb; canvas stat labels #AAA→#CCC, studio label #888→#BBB, "DEPLOYED AS:" #CCC→#EEE
- ✅ Docs updated: HANDOFF.md, README.md, AGENTS.md, context/DECISIONS.md all brought current to session 12 state

## Done (session 12)
- ✅ Seeds + Replay entries added to Rules modal in MenuScreen.jsx — explains seed range (0–999998), what it controls, and how to use replay
- ✅ Custom settings ⚙️ badge: submitScore computes `customSettings` by comparing settingsRef vs SETTINGS_DEFAULTS gameplay keys (7 numeric multipliers); saveToLeaderboard strips field from Supabase INSERT (no column yet), preserves in localStorage; LeaderboardPanel shows ⚙️ badge on `e.customSettings` truthy entries

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
