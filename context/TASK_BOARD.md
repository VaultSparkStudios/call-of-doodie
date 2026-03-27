# Task Board

## Deferred (user action required — non-blocking)
- ⏳ Run Supabase prestige migration: `ALTER TABLE leaderboard ADD COLUMN IF NOT EXISTS prestige integer DEFAULT 0;`
- ⏳ Discord invite URL → uncomment footer link in `MenuScreen.jsx` (search `// no game Discord yet`)

## Backlog
- Add Speedrun + Gauntlet tabs to `LeaderboardPanel.jsx`
- Balance playtest: META Tree node costs, Kill Frenzy duration, Adaptive Assist threshold
- QR code scanner test on mobile device
- iOS Capacitor wrapper (requires Mac + Xcode 15+ + Apple Developer $99/yr)
- Wave 40+ difficulty scaling review (berserker elite live; max enemies 100)
- Boss Rush balance (warmup at wave 4; may need further tuning)
- Consider `customSettings` boolean column migration for Supabase (⚙️ badge visible for all entries)
- Consider soundEnemyDeath distinct sounds for elite variant deaths vs. regular
- PostHog `VITE_POSTHOG_KEY` — add to GitHub Actions secrets when PostHog project created
- Sentry `VITE_SENTRY_DSN` — add to GitHub Actions secrets when Sentry project created

## Done (session 26 — 2026-03-26)
- ✅ ESLint 9 flat config (`eslint.config.js`) + `npm run lint` script
- ✅ PostHog analytics utility (`src/utils/analytics.js`) — gated on VITE_POSTHOG_KEY
- ✅ Sentry error tracking (`@sentry/react`) in `main.jsx` + `ErrorBoundary.jsx`
- ✅ Loadout Code 3-char hex share (`src/utils/loadoutCode.js`) + import/export in loadout builder
- ✅ Reactive Soundtrack: `setMusicTier(0-2)` in `sounds.js` — combo-driven vibe boost
- ✅ Reduced-Motion mode: `reducedMotion` setting + `drawGame.js` gates + SettingsPanel Visual tab + `prefers-reduced-motion` auto-detect
- ✅ META_TREE 4-branch × 4-node permanent upgrade tree in `constants.js` + `storage.js` + `MetaTreePanel.jsx`
- ✅ META_TREE bonuses fully wired in `App.jsx` initGame (damage/fireRate/crit/killFrenzy/HP/armor/waveHeal/lastStand/ammo/xp/coin/freeShop/pandemonium)
- ✅ META armor (`_treeArmorMult`) applied to all 5 player damage points
- ✅ Kill Frenzy (off4): 1.2× speed 1s/kill via `_killFrenzyTimer` game loop
- ✅ Speedrun Mode — leaderboard mode "speedrun", live ⏱ HUD timer (500ms tick)
- ✅ Gauntlet Mode — `getWeeklyGauntlet()` Mulberry32 PRNG, no shop, leaderboard mode "gauntlet"
- ✅ Adaptive Difficulty Assist — 3 deaths/wave → +50HP offer button (once per wave/run)
- ✅ QR mask bug fixed in `qrEncode.js` (separate `fn[][]` boolean matrix)
- ✅ QR error fallback in `DeathScreen.jsx` (raw URL as selectable text)
- ✅ Acid pool damage tuned: 0.8 → 0.5 dmg/frame
- ✅ Boss Rush warmup: bosses start at wave 4 (was 3)
- ✅ All context/handoff/CURRENT_STATE files updated and committed

## Done (session 25 — 2026-03-26)
- ✅ Enemy HP Bars (showEnemyHealthBars setting)
- ✅ Weapon Tier Visuals (upgradedName, HUD PRIME badge)
- ✅ Run History (saveRunToHistory/loadRunHistory, 📜 HISTORY button)
- ✅ Boss Rush leaderboard difficulty sub-tabs
- ✅ Mission Fanfare Toast (green banner on mission complete mid-wave)
- ✅ Wave Event Pre-Announcement (1.8s gold banner)
- ✅ Coin Streak Bonus (5 kills in 3s → 💩×2 for 10s)
- ✅ Ambient Danger Scaling (setDangerIntensity drone in sounds.js)
- ✅ Perk Synergy Combos (5 combos fire toast on matching pair)
- ✅ Synergy Burst [E] (12-bullet ring from both synergy weapons)
- ✅ Path Momentum (2× Blitz → hyperspeedActive)
- ✅ Cursed Run Chaos escalation (waves 5/10/15/20/25)
- ✅ Pause Mini-Map (200×150 canvas in PauseMenu)
- ✅ Run Draft Screen (DraftScreen.jsx — pick 1 of 3 perks before deploy)
- ✅ Ghost Path on DeathScreen (cyan polyline from sessionStorage)
- ✅ Custom Loadout Builder (3-slot modal in MenuScreen)
- ✅ Crosshair Preview in SettingsPanel
- ✅ Prestige Confirmation modal (warning + red CONFIRM)
- ✅ New Best Confetti (3 addParticles bursts)
- ✅ Damage Font Scaling (crit/💥 at 31px)
- ✅ Blitz Spawn Fix (gs.blitzSpawnMult wired)
- ✅ Final Words autoFocus in DeathScreen
- ✅ Prestige badge on leaderboard (★ colored by tier)
- ✅ QR Code on DeathScreen (qrEncode.js)
- ✅ Procedural Boss Abilities (BOSS_ABILITY_POOL, 2 per boss)
- ✅ Arena Hazard Tiles (acid/electro/rubble, gs.hazards[])
- ✅ The Developer Boss (typeIndex 21, wave 50+ secret)

## Done (sessions 22–24 — 2026-03-22 to 2026-03-24)
- ✅ Boss Rush mode, Cursed Run mode, Weapon Synergies (6 pairs), Ghost Race
- ✅ Weekly Mutations (12 types, Monday rotation), WAVE_ROUTES (7 paths), RouteSelectModal
- ✅ Doodie Coins (💩), coin shop (7 items), Boss Cutscene Card (3s intro)
- ✅ Time Dilation (360f slow-mo pickup + coin shop item)
- ✅ Spatial Audio (_pan, positional sound variants)
- ✅ Leaderboard tabs: ALL/NORMAL/SCORE ATK/DAILY/BOSS RUSH/CURSED/TODAY + difficulty tabs
- ✅ Leaderboard search (debounced 400ms), global rank on DeathScreen
- ✅ Supabase callsign migration + anon auth live 2026-03-26

## Done (sessions 18–21)
- ✅ Doomscroller (type 19), The Algorithm boss (type 20), ADS zoom, controller overhaul
- ✅ Daily Challenge mode, ghost challenge tracking, leaderboard DAILY tab
- ✅ Score Attack daily missions, TutorialOverlay redesign (6-step)
- ✅ iOS Capacitor research (blocked on Mac + Xcode + $99/yr)
- ✅ Vault Member Integration (_tryAwardVaultPoints, game_sessions table)

## Done (sessions 1–17)
- ✅ Core game, 12 weapons, flow field, boss waves, shop, upgrades, 40+ perks + cursed perks
- ✅ Daily missions (24 types), meta-progression, prestige (P0–P5), 57 achievements
- ✅ Supabase leaderboard + HMAC + anon auth + callsign locking
- ✅ Mobile dual-joystick, gamepad + rumble, colorblind mode, PWA, settings panel, 5 music vibes
- ✅ GIF highlight reel, Share Score, 8 map themes, challenge links, TutorialOverlay
- ✅ Score Attack mode, Boss announcements, Summoner/Splitter/Juggernaut/Landlord bosses
- ✅ All Supabase column migrations (customSettings, inputDevice, seed, accountLevel, starterLoadout, mode, game_id, sig)
