# Task Board

## Now (next session)
- **Score Attack global leaderboard column**: run `ALTER TABLE leaderboard ADD COLUMN IF NOT EXISTS "mode" text;` in Supabase, then remove the mode strip in storage.js so score attack entries show on a dedicated tab
- **Skin visible on share card**: include the player's skin emoji on the DeathScreen score PNG (generateScoreCard)
- **New enemy or boss**: expand roster (more boss variety, new civilian type, etc.)
- **More daily mission types**: based on score attack (e.g. reach X score in score attack)

## Done (session 17)
- ✅ Score Attack mode: 5-min countdown, 1.5× spawn rate, forced game over when timer hits 0 (guardian angel + dead man's hand bypassed). Timer displayed top-center in drawGame (pulses red ≤30s). `scoreAttackMode` state + `scoreAttackRef` in App.jsx.
- ✅ Prestige skin unlocks: 🤖 Robot (P1), 👾 Alien (P2), 🐸 Frog (P3). Selector in Upgrades modal (skin selector section). `meta.playerSkin` persisted to localStorage. Drawn as emoji overlay on player helmet in drawGame.js.
- ✅ Weapon kill breakdown on DeathScreen: top-3 weapons by kill count. `weaponKillsSnapshot` state captured at death. Gold border on #1 weapon. WEAPONS import added to DeathScreen.
- ✅ Leaderboard mode filter tabs: ALL / 🎯 NORMAL / ⏱ SCORE ATK rows added to LeaderboardPanel. Filters by `e.mode` field (null/"normal" = normal, "score_attack" = score attack).
- ✅ `mode` field added to submitScore entry; stripped from Supabase insert until migration run. Migration noted in storage.js comments.
- ✅ `playerSkin: ""` added to DEFAULT_META in storage.js.

## Pending Supabase steps (manual)
- `ALTER TABLE leaderboard ADD COLUMN IF NOT EXISTS "mode" text;` — then remove `mode` strip in saveToLeaderboard
- Run callsign_claims table + policies SQL (full SQL in storage.js comments)

## Done (session 16)
- ✅ Boss name announcements + per-boss ability warnings
- ✅ Summoner portal VFX, shield-break screen text + shake, soundSummonDismissed()
- ✅ Splitter shard pickup guard
- ✅ Railgun kill completeness (fully matches bullet kill path)
- ✅ What's New updated (sessions 13–16)
- ✅ Controller scroll + X/□ reload (button 2)
- ✅ Death screen bottom padding, leaderboard panel larger
- ✅ Device icon always shown (|| "mouse" fallback)
- ✅ Swarm lag fix (AABB pre-check + death sound throttle)
- ✅ Seed + Account Level on leaderboard (AccountLevelBadge component)
- ✅ All Supabase column migrations run (customSettings, inputDevice, seed, accountLevel, starterLoadout)

## Later
- Capacitor wrapper for iOS App Store submission
- More boss abilities at wave 40+
- Discord link in MenuScreen footer (commented out — fill in when ready)

## Done (session 15)
- ✅ Boss variety: Splitter, Juggernaut, Summoner. Rotate: Karen→Splitter→Juggernaut→Summoner→Landlord
- ✅ Wave events: Fast Round, Siege, Elite Only, Fog of War (every 3rd non-boss wave)
- ✅ Enemy death sounds: soundEnemyDeath(typeIndex) — 8 distinct synth groups
- ✅ Named arena layouts: Pillars, Corridors, Cross-Rooms, Bunker (seeded)
- ✅ New pickups: Rage, Magnet, Freeze

## Done (sessions 1–14)
- ✅ Core game, 12 weapons, flow field, boss waves, wave shop, weapon upgrades, 40+ perks + cursed perks
- ✅ Daily missions (21 types), meta-progression, prestige, 49 achievements, seed replay
- ✅ Supabase leaderboard + anon auth + callsign locking
- ✅ Mobile dual-joystick, gamepad + rumble, colorblind mode, PWA, settings panel, 5 music vibes
- ✅ GIF highlight reel, Share Score, 8 map themes, challenge links, TutorialOverlay
