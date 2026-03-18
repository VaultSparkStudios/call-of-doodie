# Task Board

## Now (playtest + polish)
- Playtest all new content: 3 new perks, boomerang, railgun, glass jaw rebalance
- Run Supabase SQL migration in console to activate server-side callsign enforcement (SQL in storage.js comments)

## Next
- End-of-wave boss scaling review at wave 40+ (ability spam at high prestige)
- Gamepad: vibration/rumble on hit using Gamepad Haptics API

## Later
- Leaderboard pagination (currently top 100 only)
- App.jsx further extraction: gameHelpers.js for spawnEnemy, spawnBoss, addXp, checkAchievements
- Capacitor wrapper for iOS App Store submission
- More daily mission types (no-hit runs, style kills)
- Streak bonus for consecutive wave-clear without dying
- Sound improvements: ambient background noise, room tone per map theme
- Overclocked perk visual: heat gauge on HUD when perk active

## Done (this session)
- ✅ Chain Lightning perk: 20% on-hit arc to nearest enemy (200px range, 50% dmg), cyan bolt visual
- ✅ Adrenaline Rush perk: kill at <30% HP triggers 2s double speed + orange glow ring
- ✅ Dead Man's Hand perk: on death → 250px AOE explosion (200 falloff dmg) + free guardian angel
- ✅ Glass Jaw rebalance: incoming damage multiplier scales by difficulty (2.0× Easy/Normal, 1.65× Hard, 1.4× Insane)
- ✅ Supabase anonymous auth: client-side signInAnonymously() + claimCallsign(); SQL migration documented in storage.js
- ✅ Boomerang Blaster (weapon 9): curves outbound, returns to player, pierces all enemies; orange spinning disc visual
- ✅ Railgun (weapon 10): instant hitscan beam, penetrates all enemies in line, cyan beam visual with bright core
- ✅ Mobile action bar: replaced flat weapon row with prev/next cycle control (scales to any weapon count)
- ✅ Desktop toolbar: buttons shrink to 32px when >8 weapons; toolbar scrollable/no-overflow

## Done (session 8)
- ✅ Elite enemy variants (armored/fast/explosive) from wave 10+
- ✅ Gamepad/controller full support with 🎮 HUD indicator
- ✅ 8 new perks (5 in PERKS, 2 in CURSED_PERKS, 3 are stubs)
- ✅ Wave shop: every wave 1–4, then every 2nd wave from wave 5+
- ✅ Boss telegraphing: bullet ring warning (1s), ground slam warning (1.5s)
- ✅ drawGame.js extraction (~620 lines, render decoupled from game loop)
- ✅ PWA manifest + service worker + SVG icon
- ✅ Settings panel with desc subtitles, soundUIOpen/Close
- ✅ Seed replay button on death screen
- ✅ Music vibes (5 distinct BPM/style vibes)
- ✅ Custom seed input on menu screen
- ✅ Leaderboard difficulty filter tabs (already existed from prior session)
- ✅ NEW_FEATURES changelog updated
- ✅ Bug fixes: bossKillFlash in render, Scavenger overwrite, Glass Jaw missing damage sources, gamepad re-render throttle
