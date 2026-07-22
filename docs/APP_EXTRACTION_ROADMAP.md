# App.jsx Extraction Roadmap

Verified 2026-07-21 (Session 126): `src/App.jsx` is 4,828 physical lines. The
previous ~3,500-line estimate had drifted as new modes and trust surfaces landed.
This roadmap is a decomposition recipe, not evidence that extraction itself has
happened; line counts must be re-measured before claiming progress.

Extracted system boundaries now include:

- `src/systems/mutationResolution.js` (S51)
- `src/systems/pickupSpawning.js` (S51)
- `src/systems/combatResolution.js`, `deathFlow.js`, `gameStep.js`
- `src/systems/runSession.js`
- `src/systems/shopResolution.js`, `shopOptions.js`
- `src/systems/perkResolution.js`, `progressionFlow.js`
- `src/systems/bossPhases.js`, `bossWaveFlow.js`, `waveDirector.js`
- `src/systems/objectiveDirector.js`, `runRng.js`, `scoreLedger.js`
- `src/systems/runDrill.js`, `rematchDrill.js`, `runIntegrity.js`
- `src/systems/transientLifecycle.js` (in-place hot-array compaction, S125)
- `src/systems/pauseTransition.js` (centralized pause/input-release contract, S126)
- `src/systems/defeatEconomy.js` (shared railgun/projectile score, boss, and coin parity, S126)
- `src/utils/metaClarity.js`, `roastDirector.js`, `routeForecast.js`, `shopForecast.js`

The remaining heavy clusters in `App.jsx`, in priority order:

## 1 — Game loop (~800 lines · S56)
The `gameLoop` useCallback. Largest single block. Already references
`drawGame`, `useGameLoop`, and pure systems above. Candidate slices:

- **Player update** (movement, dash, weapon switch, reload) → `src/systems/playerUpdate.js`
- **Bullet update** (collision, bounces, ricochet, lifecycle) → `src/systems/bulletUpdate.js`
- **Enemy update** (AI, ranged fire, boss phases) → `src/systems/enemyUpdate.js`
- **Pickup magnet + apply** → already partially extracted; finish

S125 removed recurring replacement allocations for bullets, enemy bullets,
grenades, pickups, trail particles, death effects, floating text, arcs, and beams
through `transientLifecycle.js`; S126 also extracted score, career-boss, and
coin-drop planning shared by the railgun and projectile kill paths into
`defeatEconomy.js`. Collision and behavior still remain inline.

Test boundary: each module gets a pure `step(gs, frame)` signature returning
the next gs delta. Loop becomes orchestration only.

## 2 — Death + run-end pipeline (~250 lines · S56-57)
`handlePlayerDeath` is currently inline. It does: stat finalization, mission
write, GIF encode kickoff, leaderboard submit, run history save, studio
events, analytics, screen change.

Slice:
- `src/systems/runFinalization.js` — stat math, history write, mission write
- `src/utils/highlightEncoder.js` — GIF encode (already a closure; lift it
  out so it's testable + reusable from future replay UI)

## 3 — Run-start pipeline (~200 lines · S57)
`startGame` has the draft gate, daily challenge gate, gauntlet gate, fresh
state init. Already partially in `runSession.js`. Finish moving:
- starter loadout application
- weapon ammo init
- mutation/route flag init

## 4 — Refs + state declarations (~300 lines · low priority)
The top of `App.jsx` is ~150 useRef + useState lines. Could be extracted to a
custom hook `useGameState()` returning `{ refs, state, setters }`. Mainly
ergonomic — not a bug fix. Defer.

## 5 — Input handlers (~200 lines · S58)
Mouse, keyboard, gamepad, touch joystick. Multiple useEffect blocks. Could
collapse into `src/hooks/useGameInput.js` with a single registration point.

## Deferred
- `src/utils/analytics.js` is fine as-is.
- `src/sounds.js` is fine.
- `src/storage.js` is the right size.

## Target post-extraction
`App.jsx` ≤ 1,500 lines, all top-level orchestration + JSX. Each system file
≤ 300 lines with its own test.

Completion proof: `Measure-Object -Line` for `App.jsx`, focused unit tests for
every new boundary, full suite, production build, and no frame-loop allocation regression.
