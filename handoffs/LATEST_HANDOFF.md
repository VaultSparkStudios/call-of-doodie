# Latest Handoff

Last updated: 2026-03-18 (Session 9 — stub perk implementation)

## What was completed this session

This was a large feature + test session across two continuation commits.

---

### Commit `bbc59cc` — Elite enemies, seed replay, settings descriptions, UI sounds, drawGame.js, PWA

**Elite enemy variants (App.jsx — spawnEnemy + kill section + drawGame.js)**
- Wave 10+: 20% chance **Armored** — `dmgMult: 0.45` (takes 45% damage), +50% HP, gold ring indicator
- Wave 12+: 15% chance **Fast** — 2× speed, 0.75× size, cyan ring indicator
- Wave 15+: 10% chance **Explosive** — chain AOE on death: 85px radius, 35 HP to nearby enemies, orange ring + "💥 CHAIN!" text
- Ring indicators drawn in drawGame.js after ranged ring, before emoji

**Death screen seed replay (DeathScreen.jsx)**
- `🔄 REPLAY #seed` button shown when `runSeed > 0`
- Calls `onStartGame(runSeed)` → `startGame(seed)` → `initGame(forceSeed)` — full chain wired

**Settings panel descriptions (SettingsPanel.jsx)**
- Added `desc` field to every entry in META object
- Rendered as small `#555` subtitle text below each label

**UI sounds (sounds.js + SettingsPanel.jsx + PauseMenu.jsx)**
- `soundUIOpen()` — quick two-tone click, called when settings panel opens
- `soundUIClose()` — softer descending tone, called when settings panel apply/closes

**drawGame.js extraction (App.jsx → src/drawGame.js)**
- Full render section (~611 lines) moved to `export function drawGame(ctx, canvas, W, H, gs, refs)`
- refs destructures: `{ dashRef, mouseRef, joystickRef, shootStickRef, startTimeRef, frameCountRef, isMobile, tip, wpnIdx }`
- App.jsx gameLoop now calls `drawGame(...)` in a single line
- `bossKillFlash--` moved back to App.jsx game loop (was left in drawGame.js by extraction — fixed in next commit)

**PWA (public/manifest.json + public/sw.js + index.html)**
- manifest.json: name, short_name, display:standalone, orientation:landscape, theme_color:#0a0a0a
- sw.js: network-first for navigation, cache-first for game assets
- SW registered on `window.load` in index.html
- Icon initially used data URI (browser-incompatible) — fixed to `public/icon.svg` in next commit

---

### Commit `ea4f054` — Gamepad, elite perks, wave shop, boss telegraphing, bug fixes

**Gamepad support (App.jsx)**
- `gamepadShootRef`, `gamepadAngleRef`, `gamepadPollRef` refs added
- `gamepadConnected` state drives 🎮 badge in HUD (only set on actual change to avoid re-render spam)
- Poll useEffect at 16ms interval:
  - Left stick (axes 0/1, deadzone 0.2) → synthesises `w/a/s/d` in keysRef
  - Right stick (axes 2/3, deadzone 0.2) → sets `p.angle` directly + `gamepadShootRef.current = true`
  - Mouse aim guarded by `gamepadAngleRef.current === null` (no conflict)
  - Buttons: 0(A)=dash, 1(B)=grenade, 4(LB)=prev weapon, 5(RB)=next weapon (wrap correct), 9(Start)=pause
  - Paused: blocks movement/fire, still handles Start to unpause
  - Cleanup: clearInterval + clears synth key/aim state

**8 new perks (constants.js + App.jsx)**
- `tungsten_rounds` (uncommon): damageMult×1.20 + pierce+1 — fully implemented
- `scavenger` (common): ammo drop weight ×1.40 (capped 0.70), all weapons get +30% ammo restore on pickup — implemented; current weapon no longer overwrites partial restore
- `overclocked` (uncommon): fireRateMult×0.65, damageMult×0.85, forced reload every 20 shots — implemented
- `paranoia` (cursed): xpMult×1.4, gs.enemySpeedMult×1.25 — affects all enemies immediately each frame
- `glass_jaw` (cursed): damageMult×1.5, gs.glassjaw=true → player takes 2× from bullets, melee, kamikaze, ground slam — implemented across all 4 damage sites
- `adrenaline_rush` (uncommon): stub (mods.adrenalineRush flag)
- `chain_lightning` (rare): stub (gs.chainLightning flag)
- `dead_mans_hand` (rare): stub (gs.deadMansHand flag)

**Wave shop balance (App.jsx)**
- Condition: `const showShop = gs.currentWave < 5 || gs.currentWave % 2 === 0`
- Evaluated inside the `else` branch where `nextIsBoss` is already false
- Result: waves 1–4 shop every wave; waves 5+ shop on 6, 8, 10, 12... boss waves never

**Boss telegraphing (App.jsx + drawGame.js)**
- bulletRingWarning: true at frames 300–359 (60 frames = 1s before firing at 360), cleared on fire
- groundSlamWarning: true at frames 330–419 (90 frames = 1.5s before firing at 420), cleared on activate
- drawGame.js: pulsing orange ring at r+80 for bullet ring warning; pulsing red fill+stroke at r+100 for slam
- Note: random initial stagger (0–179 frames) can shorten first-cycle warning — acceptable per design

**Bug fixes (bbc59cc + ea4f054)**
- `bossKillFlash--` removed from drawGame.js (would double-decrement if ever called twice), added to App.jsx game loop
- PWA icon: `data:image/svg+xml` URI → `public/icon.svg` file (browsers reject data URIs in manifests)
- Dead `soundUIClose` import removed from PauseMenu.jsx
- Scavenger: `gs.weaponAmmos[wpnIdx] = maxAmmo` only runs when ammoRestoreMult ≤ 1; Scavenger path uses loop value
- Glass Jaw: kamikaze (35→70 HP) and ground slam (18→36 HP) now correctly doubled
- Gamepad: `setGamepadConnected` only fires on actual connection state change (was every 16ms → re-render spam)

---

## What is mid-flight

Nothing — all 3 formerly-stub perks are now fully implemented.

## What was completed this session (Session 9)

**Chain Lightning (App.jsx + drawGame.js)**
- In bullet-enemy collision: after damage, if `gs.chainLightning && Math.random() < 0.20`, finds nearest enemy within 200px, deals 50% of hit damage, pushes `{ x1, y1, x2, y2, life:8 }` to `gs.lightningArcs`
- Arc lifetimes decremented and filtered in the game loop timer block
- drawGame.js: renders each arc as a jagged cyan line with glow (randomized zigzag per frame = natural flicker)

**Adrenaline Rush (App.jsx + drawGame.js)**
- Kill trigger: if `perkModsRef.current.adrenalineRush && p.health > 0 && p.health < p.maxHealth * 0.30` → sets `gs.adrenalineRushTimer = 120` (2s @ 60fps), shows "⚡ ADRENALINE!" text + orange particles
- Movement: `const _rushMult = (gs.adrenalineRushTimer || 0) > 0 ? 2.0 : 1.0` applied to `p.speed` in the movement line (doesn't modify `p.speed` directly — avoids conflicts with level-up speed recalculation)
- Timer decremented in the game loop timer block
- drawGame.js: pulsing orange ring around player when rush active

**Dead Man's Hand (App.jsx)**
- In `handlePlayerDeath`, fires before the `extraLivesRef.current > 0` check
- If `gs.deadMansHand && !gs.deadMansHandUsed`: 250px AOE deals up to 200 damage (linear falloff), gold+red particles, screen shake 25, sets `gs.deadMansHandUsed = true`
- If player had no guardian angel, grants one free (`extraLivesRef.current = 1`) so the AOE explosion is paired with a second life — perk effectively guarantees one free death per run

## What to do next

1. **Playtest** the 3 new perks — especially Dead Man's Hand as a "survival perk" at low HP
2. **Supabase callsign enforcement** — anonymous auth + RLS policy to lock names server-side
3. **More weapons** — boomerang (bounces back), railgun (hitscan, penetrates all enemies)

## Important constraints
- `npm run build` must pass before any push
- Vite base must stay `/call-of-doodie/` (lowercase) in vite.config.js
- All game logic in single RAF loop in App.jsx — use refs, not state, for loop-internal values
- drawGame.js is pure render — never call React setters inside it, never decrement gs fields inside it
- bossKillFlash must be decremented in App.jsx game loop ONLY (adrenalineRushTimer and lightningArcs also decremented in that same block)
- localStorage keys: `cod-lb-v5`, `cod-career-v1`, `cod-meta-v2`, `cod-missions-YYYY-MM-DD`, `cod-callsign-v1`, `cod-music-muted`, `cod-colorblind`, `cod-settings-v1`, `cod-presets-v1`
- Supabase anon key is public (in JS bundle) — RLS policies are the only protection layer
- Never commit .env.local (gitignored via *.local)
- RPG (index 1) has no ricochet; all other weapons ricochet up to 10 times
- `gs.adrenalineRushTimer` speed boost is a runtime multiplier on movement — do NOT modify `p.speed` directly for timed effects (level-up recalculates `p.speed` and would discard permanent changes)
