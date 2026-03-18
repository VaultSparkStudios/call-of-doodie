# Latest Handoff

Last updated: 2026-03-18 (Session 10 — gamepad rumble + ambient room tone)

## What was completed this session

### Commit `53ac0c5` — Gamepad rumble and ambient room tone

**Gamepad Haptics / rumble (App.jsx)**

Added `rumbleGamepad(weakMagnitude, strongMagnitude, durationMs)` module-level helper (placed before `buildFlowField`). Calls `navigator.getGamepads()[0]?.vibrationActuator.playEffect("dual-rumble", {...})` — Chrome 68+ only, wrapped in try/catch for silent no-op elsewhere.

Rumble fires at:
- **Enemy hit** (inside `soundHit` throttle block): weak=0.05, strong=0.10, 40ms for normal; weak=0.25, strong=0.35, 80ms for crit
- **Player hit by enemy bullet**: weak=0.30, strong=0.45, 100ms
- **Player hit by enemy contact**: weak=0.35, strong=0.50, 120ms
- **Player hit by rent nuke**: weak=0.40, strong=0.60, 150ms
- **Player hit by ground slam**: weak=0.40, strong=0.65, 150ms
- **Player hit by kamikaze explosion**: weak=0.50, strong=0.70, 200ms
- **Boss kill**: weak=0.50, strong=1.00, 500ms (with `soundBossKill()`)
- **Player death**: weak=0.70, strong=1.00, 600ms (with `soundDeath()`)

**Ambient room tone (sounds.js)**

Added `startAmbient(themeIndex)` / `stopAmbient()` / `_tickAmbient()` / `_playAmbientTick(theme, beat)` — independent setInterval-style timer running alongside background music at very low volumes (~0.004–0.018).

6 themes (matching `gs.mapTheme` 0–5):
- **0 = office**: HVAC noise burst (vol 0.007, 0.5s) + rare keyboard click (1500Hz square, vol 0.003)
- **1 = bunker**: deep sine drone 38Hz (vol 0.013, 0.6s) + every-8-beats metal thud (noise + 80Hz sawtooth)
- **2 = factory**: sawtooth machinery hum 58Hz (vol 0.013, 0.45s) + steam bursts + clank every 8 beats
- **3 = ruins**: long wind noise (vol 0.005, 0.6s) + drip ping 750Hz (vol 0.007) + echo 380Hz (vol 0.005)
- **4 = desert**: long wind noise (vol 0.004, 0.8s) + heat shimmer sine 200Hz (vol 0.005, 0.38s)
- **5 = forest**: cricket chirp (3800–4160Hz sine, vol 0.006) + breeze noise every 8 beats

Tick intervals per theme (ms): `[900, 700, 550, 1400, 1900, 950]`

`startAmbient` called in `startGame` (same `setTimeout` block as `startMusic`), passing `gsRef.current.mapTheme`.
`stopAmbient` called at: player death (`handlePlayerDeath`), `startGame` (before music restart), mute toggle off, pause→menu leave, death screen→menu.

## What is mid-flight

Nothing — session 10 is a clean, complete feature drop.

## What to do next

1. **Push main** → GitHub Actions deploys automatically
2. **Playtest rumble** — requires Chrome + wired/Bluetooth gamepad; test all rumble tiers (hit, crit, damage, boss kill, death)
3. **Playtest ambient** — start runs on each of the 6 themes; verify volumes are pleasant and not distracting
4. **Supabase callsign enforcement** — still pending manual SQL migration in Supabase console (SQL in storage.js comments)
5. **Leaderboard pagination** — next feature on task board (currently shows only top 100)

## Important constraints

- `npm run build` must pass before any push
- Vite base must stay `/call-of-doodie/` (lowercase) in vite.config.js
- All game logic in single RAF loop in App.jsx — use refs, not state, for loop-internal values
- drawGame.js is pure render — never call React setters inside it, never decrement gs fields inside it
- bossKillFlash / adrenalineRushTimer / lightningArcs decremented in App.jsx game loop ONLY
- `rumbleGamepad` is module-level (no React context needed) — can be called freely from game loop
- `startAmbient` / `stopAmbient` must be kept in sync with `startMusic` / `stopMusic` at all call sites
- localStorage keys: `cod-lb-v5`, `cod-career-v1`, `cod-meta-v2`, `cod-missions-YYYY-MM-DD`, `cod-callsign-v1`, `cod-music-muted`, `cod-colorblind`, `cod-settings-v1`, `cod-presets-v1`
- Supabase anon key is public (in JS bundle) — RLS policies are the only protection layer
- Never commit .env.local (gitignored via *.local)
- RPG (index 1) has no ricochet; all other weapons ricochet up to 10 times
- gs.mapTheme is set during `initGame` and does not change mid-run — safe to read in startGame setTimeout
