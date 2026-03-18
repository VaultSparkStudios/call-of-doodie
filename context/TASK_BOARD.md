# Task Board

## Now (playtest + polish)
- Playtest session 8 additions: elite enemies (wave 10+), gamepad feel, new perks, boss warning timing, wave shop pacing
- Implement full effects for 3 stub perks: Chain Lightning (arc 20% chance to 1 nearby enemy), Adrenaline Rush (2s double speed when kill at <30% HP), Dead Man's Hand (death explosion + guardian angel trigger)
- Verify Glass Jaw balance — double damage taken is brutal; may need HP scaling or cooldown on perk offer at harder difficulties

## Next
- Supabase anonymous auth to enforce callsign locking server-side (RLS update needed)
- More weapons: boomerang (returns to player), railgun (instant line hitscan, penetrates all)
- End-of-wave boss scaling review at wave 40+ (ability spam at high prestige)
- Gamepad: vibration/rumble on hit using Gamepad Haptics API
- Chain Lightning visual (arc spark between enemies)

## Later
- Leaderboard pagination (currently top 100 only)
- App.jsx further extraction: gameHelpers.js for spawnEnemy, spawnBoss, addXp, checkAchievements
- Capacitor wrapper for iOS App Store submission
- More daily mission types (no-hit runs, style kills)
- Streak bonus for consecutive wave-clear without dying
- Sound improvements: ambient background noise, room tone per map theme
- Overclocked perk visual: heat gauge on HUD when perk active

## Done (this session)
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
