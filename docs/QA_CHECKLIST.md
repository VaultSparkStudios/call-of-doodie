# Manual QA Checklist — Session 55

Browser-driven only. Run `npm run dev`, open the URL it prints, work through
this top to bottom. Each line takes ~10 seconds; whole sweep ~15 min.

## Front door
- [ ] UsernameScreen renders with mini battle canvas
- [ ] Type a 2-20 char callsign · `LOCK IN & DEPLOY` enables
- [ ] HomeV2 hero renders · `▶ DEPLOY` works
- [ ] Mode dropdown opens · selecting NORMAL/SCORE ATTACK/CURSED/etc updates header
- [ ] DAILY chip launches today's seed · GAUNTLET chip launches weekly fixed
- [ ] LEADERBOARD chip opens panel with live data
- [ ] ACHIEVEMENTS chip opens panel
- [ ] Command Center expands and all 10 buttons open their respective panels

## Settings (S55 changes)
- [ ] Settings opens on **Quick** tab by default
- [ ] Quick tab shows exactly 6 entries: Crosshair / Particles / Screen Shake / Reduced Motion / Auto Reload / Rumble
- [ ] Tab toggle switches to **Advanced** showing the remaining 11 settings
- [ ] `↺ RESET` button reverts the current preview to defaults (without saving)
- [ ] `✓ APPLY SETTINGS` saves and closes
- [ ] Gamepad LB/RB cycles between Quick and Advanced

## Loadout builder (S55 changes)
- [ ] Open Command Center → LOADOUTS → New
- [ ] At low account level: weapons 4-12 show as `🔒 Name · L<N>` and are unclickable
- [ ] Saved loadouts with locked weapons still display the weapon name with `🔒legacy` annotation and remain selectable (grandfathered)
- [ ] Picking an unlocked weapon and saving works as before

## Pre-deployment cards (S55 white-card fixes)
- [ ] Click DEPLOY · DraftScreen renders 3 perk cards
- [ ] Each card is clearly readable on the dark backdrop (not white-on-white)
- [ ] Common-tier perks (light grey) have visible borders and dark card body
- [ ] Hovering a card produces a colored gradient
- [ ] SKIP button works
- [ ] Pick a perk · game starts

## In-game HUD
- [ ] Wave/timer chip renders top-center
- [ ] Health, ammo, level, XP all readable
- [ ] Killstreak/combo numbers update on rapid kills
- [ ] If frame budget drops sustained: `⚡ PERF MODE` chip appears top-left
- [ ] Particles thin out when PERF MODE is active
- [ ] Settings → Particles = "Low" makes the chip not appear (because budget is fine)

## Level-up perks (S55 white-card fix)
- [ ] At level up, PerkModal shows
- [ ] Tier label pill (e.g. `COMMON`, `LEGENDARY`) is solid color with **black** text — not the previous near-invisible same-color-on-same-color
- [ ] Cursed tier perks render with red glow + warning sigil

## Death / debrief (S55 GIF fix)
- [ ] Die. DeathScreen renders.
- [ ] `🎬 BEST MOMENT` block shows `⏳ encoding...` briefly, then a GIF
- [ ] GIF plays smoothly, ~3-4 seconds long, ~6fps
- [ ] On mobile: GIF block does **not** appear (capture is skipped on mobile per S55)
- [ ] `📤 SHARE BEST MOMENT` triggers Web Share / download
- [ ] Death screen UI does **not** freeze during encode

## Wave shop / route selects
- [ ] After wave 1 clear: WaveShopModal shows 3 weapon options + coin shop
- [ ] After every 5th non-boss wave: RouteSelectModal shows 3 route cards
- [ ] All cards readable, hover increases contrast

## Modes
- [ ] Score Attack: countdown timer ticks down · ends at 0
- [ ] Daily Challenge: same seed across browser refresh
- [ ] Boss Rush: every wave is a boss
- [ ] Speedrun: live ⏱ timer in HUD
- [ ] Cursed: starts with cursed perks, score multiplied
- [ ] Gauntlet: fixed loadout, no shop

## Mutation banner (S55 dismissible)
- [ ] HomeV2 weekly mutation banner shows on first load
- [ ] `✕` dismisses it · stays dismissed across navigation in same tab
- [ ] Reopening tab brings it back (sessionStorage)

## Tutorial (first-time only)
- [ ] Clear `cod-tutorial-v1` in DevTools
- [ ] Start a run · tutorial card appears, auto-advances every 6s
- [ ] All 6 steps render with their colored accent
- [ ] Final step "LET'S GO!" dismisses · doesn't reappear

## Pages opened from menu
- [ ] STATS (career) · MISSIONS · UPGRADES · META TREE · HISTORY
- [ ] LOADOUTS · RULES · CONTROLS · MOST WANTED · WHAT'S NEW
- [ ] All open · all close cleanly · no console errors

## Known-good baselines (don't regress)
- [ ] Achievement unlocks pop floating text + gold flash
- [ ] Boss phase 2 transition shows "⚡ PHASE 2!" + screenshake
- [ ] Killstreak roast callouts fire on boss kills + 10+ streaks
- [ ] Leaderboard saves locally if Supabase is down
- [ ] PWA install prompt fires on supported browsers

## Console
- [ ] No red errors at any point during a full run
- [ ] No `[GIF] encode failed` warnings (orange) on death

If any line fails, paste the failure here under a `## Failures` heading and
flag for the next session.
