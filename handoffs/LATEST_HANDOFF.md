# Latest Handoff

Legacy handoff archive only.

Do not use this file as the active session handoff. The authoritative handoff
for this repo is `context/LATEST_HANDOFF.md`.

Last updated: 2026-03-19 (Session 14 — new perks, map themes, bug fixes, challenge links, tutorial, PWA)

## What was completed this session

### Commit `f2d82e7`

**1. New perks (constants.js)**

7 new regular perks added after `scavenger` in PERKS array:
- `combo_lifesteal` (uncommon) — +6% lifesteal · +60% combo window
- `overdrive` (uncommon) — +40% fire rate · +10% damage
- `hoarder` (uncommon) — +80% pickup range · +50% ammo drops
- `glass_mind` (rare) — +80% XP gain · −25 max HP
- `bullet_hose` (uncommon) — +100% max ammo · +40% ammo restore
- `crit_cascade` 🌩️ (rare) — +12% crit chance; synergy with Eagle Eye (+10%) + Penetrator (+8%)
- `grenade_chain` (rare) — −50% grenade CD · +25% grenade damage; Pyromaniac synergy (+50%)

3 new cursed perks added after `glass_jaw` in CURSED_PERKS array:
- `glass_legs` — +80% bullet damage · dash CD ×3
- `xp_curse` — +120% bullet damage · −70% XP gain
- `haste_poison` — +70% fire rate · ammo capacity ×0.3

**2. New daily mission types (storage.js)**

Added to MISSION_DEFS and MISSION_PARAMS:
- `level_reach` — "Reach level N" · goals [5,8,12] · track: `level`
- `boss_clear` — "Clear N boss waves" · goals [1,2,3] · track: `bossWavesCleared`
- `max_weapon` — "Max out N weapons" · goals [1,2,3] · track: `maxWeaponLevel`

App.jsx `checkDailyMissions` s-object updated to include:
```js
level: xpRef.current.level || 1,
bossWavesCleared: statsRef.current.bossWavesCleared || 0,
maxWeaponLevel: statsRef.current.maxWeaponLevel || 0,
```

**3. Challenge links**

- `MenuScreen.jsx`: new `challengeMode` state; useEffect parses `?seed=XXXXX&diff=normal` from `window.location.search`; calls `setCustomSeed(urlSeed)` + `setDifficulty(urlDiff)` if valid; shows orange "⚔️ CHALLENGE LINK DETECTED" banner above DEPLOY button with dismiss button
- `DeathScreen.jsx`: "⚔️ COPY CHALLENGE LINK" button in seed row; copies `${location.origin}${location.pathname}?seed=${runSeed}&diff=${difficulty}` to clipboard

**4. TutorialOverlay (new component)**

- `src/components/TutorialOverlay.jsx` — shows on first run (localStorage key `cod-tutorial-v1`)
- 5 hint cards: MOVE / SHOOT / DASH / GRENADE / WEAPONS — labels adapt to `pc` / `mobile` / `controller` input mode
- Auto-dismisses after 18s or when wave advances past 1
- "GOT IT" button sets localStorage key and dismisses
- Integrated in App.jsx game screen behind `!paused && !perkPending && !shopPending` guard

**5. PWA install prompt**

- App.jsx: `pwaPromptRef` + `pwaPromptReady` state; `beforeinstallprompt` event captured in useEffect
- DeathScreen: `onInstallApp` prop; "📲 INSTALL APP" button shown when `onInstallApp` is non-null; calls `prompt()` on the deferred event

**6. HUD theme name (HUD.jsx)**

- `THEME_NAMES` + `THEME_EMOJIS` arrays added (8 entries)
- `mapTheme` prop added to HUD; shown in wave/timer bar as `{THEME_EMOJIS[mapTheme]} {THEME_NAMES[mapTheme]}` (e.g. "🏭 FACTORY")
- App.jsx calls `setMapTheme(gs.mapTheme ?? 0)` alongside `setWave(gs.currentWave)` on each wave clear

**7. Map theme improvements**

- `App.jsx`: THEME_PROPS expanded from 8 → 12 emojis per theme (all 8 themes); prop count increased from 8–13 → 12–18 per map
- `drawGame.js`: per-theme radial vignette atmosphere overlay added after arena border draw — subtle edge tint per theme (indigo/green/amber/sepia/ochre/forest/purple/blue)

**8. Bug fixes**

- `App.jsx`: `statsRef.current.weaponKills = new Array(WEAPONS.length).fill(0)` — was hardcoded 10, now 12; Ricochet Pistol + Nuclear Kazoo kills now tracked
- `sounds.js`: case 10 (Ricochet Pistol) — metallic ping (two triangle tones sweeping up); case 11 (Nuclear Kazoo) — nasal honk (sawtooth + square descending)
- `constants.js`: `crit_cascade` emoji changed ⚡ → 🌩️ to avoid clash with Adrenaline perk

## What is mid-flight

Nothing — all features are complete and build-verified (`f2d82e7`).

## What to do next

1. **Boss variety** — add Splitter, Shielded Juggernaut, Summoner boss types to `gameHelpers.js` + integrate rotation in App.jsx boss wave logic
2. **Wave events** — Fast Round / Siege / Elite Only / Fog of War modifier system; apply every 3 non-boss waves
3. **Enemy death sounds per type** — 6–8 distinct per-enemy death synths in `sounds.js`
4. **Distinct arena layouts** — 4–5 named seeded room layouts in initGame obstacle generation
5. **More pickup types** — Rage / Magnet / Freeze in pickup spawn + collection logic
6. **Supabase SQL migrations** — 4 steps in `storage.js` comments; run manually in Supabase console

## Important constraints

- `npm run build` must pass before any push
- `vite.config.js` base must stay `/call-of-doodie/` (lowercase)
- Never commit `.env`, credentials, or large binaries
- `bossKillFlash` is decremented in App.jsx game loop ONLY — never in drawGame.js
- `perkPendingRef` and `shopPendingRef` both halt the game loop; always set both ref and state together
