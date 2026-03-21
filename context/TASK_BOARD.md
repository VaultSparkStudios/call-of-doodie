# Task Board

## Pending (manual Supabase action — non-blocking)
- Run callsign_claims table + RLS policies SQL (full SQL in `storage.js` comments) in Supabase console
- Enable "Anonymous sign-ins" in Supabase Auth settings (required for server-side callsign enforcement)

## Later / backlog
- Capacitor wrapper for iOS App Store submission
- More boss abilities at wave 40+
- Discord link in MenuScreen footer (commented out — fill in when invite URL ready)
- Consider `customSettings` boolean column migration for Supabase (⚙️ badge visible for all entries)
- Wave 40+ difficulty scaling / new boss types
- Consider soundEnemyDeath distinct sounds for elite variant deaths vs. regular

## Done (session 19 — 2026-03-20)
- ✅ `gs.algorithmSurge` cleared on The Algorithm boss death (both kill paths in App.jsx)
- ✅ Doomscroller (19): "zzz 📱" frozen visual — pulsing purple ring + text above enemy when doomscrolling
- ✅ `soundEnemyDeath(19)`: phone-buzz + sad descending chime
- ✅ `soundEnemyDeath(20)`: glitchy cascading error sound
- ✅ DeathScreen challenge link copy: ✓ COPIED! flash with green transition (1.5s)
- ✅ WaveShopModal: "BOUGHT THIS RUN" history strip — `shopHistory` state in App.jsx, `boughtHistory` prop
- ✅ LeaderboardPanel DAILY tab: TODAY badge on entries matching `getDailyChallengeSeed()`
- ✅ Prestige skins P4 🦊 Fox (prestige 4) and P5 🐉 Dragon (prestige 5) added
- ✅ PauseMenu ⚔️ LEADERBOARD button — opens full LeaderboardPanel mid-run for challenge browsing

## Done (session 18 — 2026-03-20)
- ✅ `mode` column migration complete — score_attack/daily_challenge tags live, no stripping
- ✅ Prestige skin on share card (`generateScoreCard` — "DEPLOYED AS: 🤖 NAME · RANK")
- ✅ Doomscroller enemy (typeIndex 19): wave 9+, freezes periodically (70/280 frames), color=#7B68EE
- ✅ The Algorithm boss (typeIndex 20): 700HP, 3-shot spread, Viral Surge ability (gs.algorithmSurge)
- ✅ Score Attack daily missions: sa_score, sa_kills, sa_wave (3 new MISSION_DEFS in storage.js)
- ✅ TutorialOverlay redesign: 6-step sequential with progress dots, NEXT/SKIP/LET'S GO, auto-advance 6s
- ✅ Controller ADS zoom: LT/L2 → gs.adsZoom → 1.28× scale in drawGame + scope ring overlay
- ✅ Controller LB/L1 = Grenade (primary); D-pad L/R = prev/next weapon
- ✅ PauseMenu controller bindings: both Xbox + PlayStation button labels shown
- ✅ PauseMenu D-pad music vibe navigation fixed (`disableLR: false`)
- ✅ MAX_PARTICLES=150, death sound throttle max 1/frame (lag/latency reduction)
- ✅ Daily Challenge mode: fixed LCG seed per day, `getDailyChallengeSeed()`, `mode: "daily_challenge"` on submit
- ✅ Ghost mode (challenge vs tracking): vsScore/vsName from URL `?vs=&vsName=` → HUD tracker + DeathScreen result card
- ✅ Challenge link enhancements: includes vs+vsName; LeaderboardPanel per-row ⚔️ copy button
- ✅ LeaderboardPanel DAILY tab: filters `mode === "daily_challenge"`

## Done (session 17)
- ✅ Score Attack mode, prestige skins (P1–P3), weapon kill breakdown on DeathScreen
- ✅ Leaderboard mode filter tabs (ALL/NORMAL/SCORE ATK), `mode` field in submitScore

## Done (session 16)
- ✅ Boss announcements, Summoner portal VFX, shield-break effects, soundSummonDismissed
- ✅ Railgun kill completeness, device icon fallback, AccountLevelBadge, swarm lag fix
- ✅ All Supabase column migrations run (customSettings, inputDevice, seed, accountLevel, starterLoadout)

## Done (session 15)
- ✅ Boss variety: Splitter, Juggernaut, Summoner
- ✅ Wave events: Fast Round, Siege, Elite Only, Fog of War
- ✅ soundEnemyDeath(typeIndex), named arena layouts, Rage/Magnet/Freeze pickups

## Done (sessions 1–14)
- ✅ Core game, 12 weapons, flow field, boss waves, wave shop, weapon upgrades, 40+ perks + cursed perks
- ✅ Daily missions (24 types), meta-progression, prestige, 49 achievements, seed replay
- ✅ Supabase leaderboard + anon auth + callsign locking (client-side)
- ✅ Mobile dual-joystick, gamepad + rumble, colorblind mode, PWA, settings panel, 5 music vibes
- ✅ GIF highlight reel, Share Score, 8 map themes, challenge links, TutorialOverlay
