# Task Board

## Now (next session)
- **Score attack mode**: timed 5-minute run, enemies scale faster, leaderboard-ranked by score (no wave survival metric)
- **Prestige skin unlocks**: at prestige 1/2/3 unlock player emoji skin options (e.g. 🤖, 👾, 🐸) shown in settings
- **Weapon-specific kill UI**: show weapon emoji + kill count on DeathScreen (top 3 weapons used)

## Done (session 16)
- ✅ Boss name announcements: "🦏 THE JUGGERNAUT APPROACHES" etc. on wave start (per-boss color + text)
- ✅ Boss-specific ability warnings: per-boss-type hints for Splitter/Juggernaut/Summoner; fall back to generic for Karen/Landlord
- ✅ Summoner portal VFX: purple particle bursts every 25 frames (frameCountRef) during first-summon windup
- ✅ Juggernaut shield-break: centered "🦏 SHIELD SHATTERED!" + screen shake 14 + blue particles
- ✅ soundSummonDismissed(): ethereal descending tone when a summoned minion dies; "✨ SUMMON DISMISSED" float text
- ✅ Splitter shard pickup guard: isShard check prevents shards (typeIndex 16, !isBossEnemy) dropping pickups
- ✅ Railgun kill completeness: pendingBeam kill block fully rewritten — boss kills, pickup drops, death quotes, stat tracking, Splitter split, summon dismissed, adrenaline rush, vampire, milestones, killstreak bonus, bestMomentRef, achCheckRef
- ✅ What's New updated: NEW_FEATURES array in constants.js replaced with sessions 13–16 highlights (23 entries)
- ✅ Controller scroll: left stick Y / D-pad scrolls open modals; focused main-menu item scrolls into view
- ✅ X/Square = reload: button 2 gamepad poll added (edge-triggered), lastBtnX tracking
- ✅ Death screen bottom padding: `max(56px, env(safe-area-inset-bottom, 24px))`
- ✅ Leaderboard panel larger: maxWidth 640→820, maxHeight 88vh→92vh
- ✅ Device icon always shown: `e.inputDevice || "mouse"` fallback so all entries show 🖱️ minimum
- ✅ Swarm lag fix: AABB pre-check in bullet-enemy collision; `gs._deathSoundsThisFrame` throttle (max 2/frame, reset each frame)
- ✅ Seed + Account Level on leaderboard: entry includes `seed: runSeed` + `accountLevel: getAccountLevel(totalKills)`; AccountLevelBadge tiered (gray/bronze/silver/gold/purple); seed shown as sub-line under name
- ✅ Supabase SQL migrations run: customSettings, inputDevice, seed, accountLevel, starterLoadout columns live; stripping removed, full SELECT restored

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
- ✅ 3 new daily mission types: level_reach, boss_clear, max_weapon
- ✅ Challenge links: `?seed=XXXXX&diff=normal` parsed in MenuScreen; DeathScreen "⚔️ COPY CHALLENGE LINK" button
- ✅ TutorialOverlay: first-run wave-1 hints (cod-tutorial-v1), input-mode-aware, auto-dismiss 18s or wave 2
- ✅ PWA install prompt: beforeinstallprompt → pwaPromptRef → "📲 INSTALL APP" on DeathScreen
- ✅ HUD theme name: map theme emoji + name in wave/timer bar
- ✅ Map themes: THEME_PROPS 12 emojis/theme, 12–18 props, per-theme radial vignette in drawGame.js

## Done (session 13)
- ✅ GIF highlight reel centered on peak killstreak; boss kill fallback
- ✅ Gray text legibility pass across all components
- ✅ Full controller support: gamepad nav, aim assist, Xbox/PS detection, VirtualKeyboard, useGamepadNav
- ✅ 11 new achievements (total 49)
- ✅ 2 new weapons: Ricochet Pistol 🎱, Nuclear Kazoo 🎵
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
