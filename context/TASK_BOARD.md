# Task Board

## Now (next session)
- **Score attack mode**: timed 5-minute run, enemies scale faster, leaderboard-ranked by score (no wave survival metric)
- **Prestige skin unlocks**: at prestige 1/2/3 unlock player emoji skin options (e.g. 🤖, 👾, 🐸) shown in settings
- **Weapon-specific kill UI**: show weapon emoji + kill count on DeathScreen (top 3 weapons used)

## Done (session 16)
- ✅ Boss rotation story text: boss name announced on wave start ("🦏 THE JUGGERNAUT APPROACHES" etc.)
- ✅ Boss-specific ability warnings: per-boss-type hints replace generic wave-level warnings for Splitter/Juggernaut/Summoner waves
- ✅ Summoner portal VFX: purple particle bursts every 25 frames during first-summon windup
- ✅ Juggernaut shield-break screen text + shake: "🦏 SHIELD SHATTERED!" centered + screen shake 14 + blue particles
- ✅ Summon dismissed: soundSummonDismissed() + "✨ SUMMON DISMISSED" float text when a summoned minion dies
- ✅ Splitter shards confirmed: isShard check prevents shards (typeIndex 16, !isBossEnemy) from dropping pickups

## Pending Supabase steps (manual)
- Enable "Anonymous sign-ins" in Supabase Auth > Settings
- `ALTER TABLE leaderboard ADD COLUMN IF NOT EXISTS "customSettings" boolean;`
- `ALTER TABLE leaderboard ADD COLUMN IF NOT EXISTS "inputDevice" text;`
- Run callsign_claims table + policies SQL (full SQL in storage.js comments)
- After above: remove the stripping in saveToLeaderboard so badges show globally

## Later
- Capacitor wrapper for iOS App Store submission
- More boss abilities at wave 40+ (currently rent nuke + teleport is the cap)
- Discord link in MenuScreen footer (commented out — fill in when ready)

## Done (session 15)
- ✅ Boss variety: Splitter (💔 splits into 3 shards on death), Juggernaut (🦏 shield + charge), Summoner (🌀 summons elites, invulnerable while alive). Rotate: Karen→Splitter→Juggernaut→Summoner→Landlord
- ✅ Wave events: every 3rd non-boss wave → ⚡ Fast Round, 🪖 Siege, 👑 Elite Only, 🌫️ Fog of War. Persistent canvas banner.
- ✅ Enemy death sounds: soundEnemyDeath(typeIndex) — 8 distinct synth groups across 16 enemy types
- ✅ Distinct arena layouts: 4 named seeded layouts (Pillars, Corridors, Cross-Rooms, Bunker). Layout name shown on run start.
- ✅ New pickups: 🔥 Rage (+75% dmg 5s), 🧲 Magnet (pulls all pickups), ❄️ Freeze (35% enemy slowdown 3s). Sounds + glow rings + player auras.

## Done (session 14)
- ✅ 7 new perks: combo_lifesteal, overdrive, hoarder, glass_mind, bullet_hose, crit_cascade (🌩️), grenade_chain
- ✅ 3 new cursed perks: glass_legs, xp_curse, haste_poison
- ✅ 3 new daily mission types: level_reach (track: level), boss_clear (track: bossWavesCleared), max_weapon (track: maxWeaponLevel)
- ✅ Challenge links: `?seed=XXXXX&diff=normal` parsed in MenuScreen; shows challenge banner + sets customSeed + difficulty; DeathScreen has "⚔️ COPY CHALLENGE LINK" button
- ✅ TutorialOverlay: first-run wave-1 hint overlay (cod-tutorial-v1), input-mode-aware (PC/mobile/controller), auto-dismiss after 18s or wave 2
- ✅ PWA install prompt: `beforeinstallprompt` captured in pwaPromptRef; "📲 INSTALL APP" button on DeathScreen when prompt available
- ✅ HUD theme name: map theme emoji + name shown in wave/timer bar (e.g. "🏭 FACTORY")
- ✅ Map themes improved: THEME_PROPS 8→12 emojis per theme; prop density 8–13→12–18; per-theme radial vignette atmosphere overlay in drawGame.js
- ✅ Fix: weaponKills array was hardcoded to 10; now uses WEAPONS.length (12) so Ricochet Pistol + Nuclear Kazoo kills track correctly
- ✅ Fix: soundShoot cases 10+11 — Ricochet Pistol (metallic ping, triangle sweep) + Nuclear Kazoo (nasal honk, sawtooth)
- ✅ Fix: crit_cascade emoji ⚡ → 🌩️ (clashed with Adrenaline perk)

## Done (session 13)
- ✅ GIF highlight reel: `bestMomentRef` updates on every new run-best killstreak kill (score = streak×10); GIF centers on peak killstreak moment; boss kill remains fallback (score 100)
- ✅ Gray text legibility pass: all dark grays (#444–#888) bumped to #aaa/#bbb across all components
- ✅ Controller support: full gamepad nav, aim assist, Xbox/PS detection, VirtualKeyboard, useGamepadNav hook
- ✅ 11 new achievements (wave_25, survive_10m, kills_500, nukes_3, crits_100, grenades_50, level_15, score_200k, dash_kills_10, no_hit_waves_3, boss_kills_10) — total 49
- ✅ 2 new weapons: Ricochet Pistol 🎱 (bouncesLeft:10), Nuclear Kazoo 🎵 (pellets:3)
- ✅ 2 new enemies: Life Coach 📚, Tech CEO 💼

## Done (session 12)
- ✅ Seeds + Replay entries added to Rules modal
- ✅ Custom settings ⚙️ badge on leaderboard

## Done (session 11)
- ✅ Leaderboard pagination (Load More)
- ✅ gameHelpers.js extraction
- ✅ New daily missions: no_hit_wave, single_weapon
- ✅ 2 new map themes: space, arctic

## Done (sessions 1–10)
- ✅ Core game, 10 weapons, flow field pathfinding, boss waves, wave shop, weapon upgrades
- ✅ 30+ perks, perk synergies, cursed perks, meta-progression, prestige
- ✅ Daily missions, achievements, career stats, seed replay
- ✅ Supabase leaderboard + anon auth + callsign locking
- ✅ Mobile dual-joystick, gamepad + rumble, colorblind mode, PWA, settings panel, 5 music vibes
- ✅ GIF highlight reel, Share Score, 8 map themes, ambient room tone
