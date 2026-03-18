# Latest Handoff

Last updated: 2026-03-18 (Session 12 — seed info in Rules modal, custom-settings leaderboard badge)

## What was completed this session

### Commit `a031204`

**1. Seed info in Rules modal (MenuScreen.jsx)**

Two new entries added at the bottom of the Rules modal (after the Leaderboard entry):

- 🌱 **Seeds:** Each run uses a unique seed (0–999998) controlling map layout, walls, terrain, and theme. Enter a custom seed on the menu to replay any run!
- 🔄 **Replay:** After death, hit 🔄 REPLAY to rerun the exact same map with the same seed

**2. Custom settings ⚙️ badge on leaderboard (App.jsx + storage.js + LeaderboardPanel.jsx)**

- `App.jsx` — `import { loadSettings, SETTINGS_DEFAULTS }` (added SETTINGS_DEFAULTS import). In `submitScore`, computes `customSettings = GAMEPLAY_KEYS.some(k => sett[k] !== SETTINGS_DEFAULTS[k])` where `GAMEPLAY_KEYS = ["enemySpawnMult","enemyHealthMult","enemySpeedMult","playerSpeedMult","xpGainMult","pickupMagnet","grenadeRadiusMult"]`. Field added to `entry` object.
- `storage.js` — `saveToLeaderboard`: destructures `customSettings` out before Supabase INSERT (`const { customSettings: _cs, ...supabaseRow } = row`). The full `row` (including `customSettings`) is still used in the localStorage fallback.
- `LeaderboardPanel.jsx` — After the `loadoutEmoji` badge, renders `{e.customSettings && <span title="Custom settings used">⚙️</span>}`.

**Note:** ⚙️ badge only shows for locally-submitted entries until the `customSettings` boolean column is added to the Supabase leaderboard table:
```sql
ALTER TABLE leaderboard ADD COLUMN "customSettings" boolean;
```

## What is mid-flight

Nothing — all features are complete and build-verified (`a031204`).

## What to do next

1. **Run Supabase SQL migration** — `ALTER TABLE leaderboard ADD COLUMN "customSettings" boolean;` — to enable the ⚙️ badge for all leaderboard entries (currently only shows for localStorage-fallback entries)
2. **Run callsign enforcement SQL** — documented in storage.js comments, needs manual run in Supabase console
3. **Playtest space + arctic themes** — check ambient feels right, wall/floor colors are distinct
4. **Verify "Load More"** in production with Supabase real data (hard to test locally without 50+ entries)
5. **Capacitor wrapper** — next item on task board (iOS App Store submission)

## Important constraints

- `npm run build` must pass before any push
- Vite base must stay `/call-of-doodie/` (lowercase) in vite.config.js
- All game logic in single RAF loop in App.jsx — use refs, not state, for loop-internal values
- drawGame.js is pure render — never call React setters inside it
- `spawnEnemy` and `spawnBoss` are now in gameHelpers.js — if adding new enemy fields, update BOTH gameHelpers.js AND App.jsx (spawnBoss thin wrapper only passes the 4 fixed args)
- Map theme count is now 8 — any new code that branches on `gs.mapTheme` needs to handle indices 0–7
- `gs.damageThisWave` resets at wave clear — do NOT reset at death (handlePlayerDeath), only at wave clear
- `statsRef.current.weaponKills` is a length-10 array; if new weapons are added, update the array size in both useRef init and statsRef reset
- `customSettings` is stripped from Supabase INSERT until the column is added — add the SQL migration before expecting it in leaderboard queries
- localStorage keys: `cod-lb-v5`, `cod-career-v1`, `cod-meta-v2`, `cod-missions-YYYY-MM-DD`, `cod-callsign-v1`, `cod-music-muted`, `cod-colorblind`, `cod-settings-v1`, `cod-presets-v1`
