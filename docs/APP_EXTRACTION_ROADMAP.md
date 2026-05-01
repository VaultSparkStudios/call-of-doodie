# App.jsx Extraction Roadmap

`src/App.jsx` is ~3,500 lines. Sessions 50-51 already pulled out:

- `src/systems/mutationResolution.js` (S51)
- `src/systems/pickupSpawning.js` (S51)
- `src/systems/runSession.js`
- `src/systems/shopResolution.js`, `shopOptions.js`
- `src/systems/perkResolution.js`, `progressionFlow.js`
- `src/systems/bossPhases.js`, `bossWaveFlow.js`, `waveDirector.js`
- `src/utils/metaClarity.js`, `roastDirector.js`, `routeForecast.js`, `shopForecast.js`

The remaining heavy clusters in `App.jsx`, in priority order:

## 1 — Game loop (~800 lines · S56)
The `gameLoop` useCallback. Largest single block. Already references
`drawGame`, `useGameLoop`, and pure systems above. Candidate slices:

- **Player update** (movement, dash, weapon switch, reload) → `src/systems/playerUpdate.js`
- **Bullet update** (collision, bounces, ricochet, lifecycle) → `src/systems/bulletUpdate.js`
- **Enemy update** (AI, ranged fire, boss phases) → `src/systems/enemyUpdate.js`
- **Pickup magnet + apply** → already partially extracted; finish

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
