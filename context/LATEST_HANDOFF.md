# Latest Handoff — Session 26 Closeout

This is the authoritative active handoff file for this repo.

**Date:** 2026-03-26
**Branch:** `main`, clean, pushed
**Build:** ✅ passes (`npm run build` — 757KB bundle, no errors)

---

## Deferred (user to action — non-blocking)

| Item | What to do |
|------|-----------|
| **Supabase prestige migration** | Run in Supabase SQL Editor: `ALTER TABLE leaderboard ADD COLUMN IF NOT EXISTS prestige integer DEFAULT 0;` — enables prestige ★ badge on leaderboard rows |
| **Discord invite URL** | When ready, add URL to `MenuScreen.jsx` footer — search for `// no game Discord yet` comment |

---

## What was done this session (Session 26)

### Audit + quality pass
- Fixed critical QR mask bug (`qrEncode.js`) — mask was never applied because function-module check used post-fill state; added separate `fn[][]` boolean matrix
- Added QR error fallback in `DeathScreen.jsx` — shows raw URL as selectable text on encode failure
- Acid pool damage tuned: 0.8→0.5 dmg/frame (~30/sec, ~3.3s TTK on Normal)
- Boss Rush warmup extended: bosses now start at wave 4 (was wave 3)

### New systems shipped
- **ESLint 9 flat config** — `eslint.config.js` + `npm run lint` script; react-hooks + react-refresh plugins
- **PostHog analytics** — `src/utils/analytics.js`; gated on `VITE_POSTHOG_KEY` env var; no-op when absent
- **Sentry error tracking** — `@sentry/react` in `main.jsx` + `ErrorBoundary.jsx`; gated on `VITE_SENTRY_DSN`
- **Loadout Code** — `src/utils/loadoutCode.js`; 3-char hex share code (weapon + starter); import/export in loadout builder modal
- **Reactive Soundtrack** — `setMusicTier(0-2)` in `sounds.js`; combo count drives vibe upward every 60 frames
- **Reduced-Motion mode** — `reducedMotion` setting in `settings.js`; screens shake / flashes / pulses gated in `drawGame.js`; toggle in SettingsPanel Visual tab; also auto-detects `prefers-reduced-motion` media query
- **META_TREE** — 4-branch permanent upgrade tree (Offense/Defense/Utility/Chaos × 4 nodes each) in `constants.js`; `loadMetaTree()`/`unlockMetaNode()` in `storage.js`; `MetaTreePanel.jsx` UI; full bonus application in `App.jsx` `initGame`
- **Gauntlet Mode** — weekly fixed-weapon challenge via `getWeeklyGauntlet()` (Mulberry32 PRNG seeded by week#); no shop; leaderboard mode: `"gauntlet"`
- **Speedrun Mode** — live green timer in HUD (⏱ MM:SS, 500ms tick); leaderboard mode: `"speedrun"`
- **Adaptive Difficulty Assist** — tracks `_waveDeaths` per wave; after 3 deaths offers +50HP assist button in MenuScreen (once per wave, once per run)
- **Perk Synergy Combos** — 5 combos fire toast on matching perk pair (Death's Door, Afterburner, Fragile Fury, Pack Rat, Sniper's Mark)
- **Kill Frenzy** (META_TREE off4) — 1.2× move speed for 1s after each kill; `_killFrenzyTimer` countdown in game loop
- **META_TREE armor** (`_treeArmorMult`) applied to all 5 player damage points: enemy bullets, rent explosion, ground slam, charge, melee

### Files added
- `eslint.config.js`
- `src/utils/analytics.js`
- `src/utils/loadoutCode.js`
- `src/components/MetaTreePanel.jsx`

### Files modified
- `src/App.jsx` — initGame META bonuses, Kill Frenzy, armor mult, setMusicTier, speedrun/gauntlet mode wiring, new props to MenuScreen/HUD/DeathScreen
- `src/constants.js` — META_TREE, META_TREE_NODE_IDS, getWeeklyGauntlet()
- `src/storage.js` — loadMetaTree(), _saveMetaTree(), unlockMetaNode()
- `src/sounds.js` — setMusicTier(), _musicComboTier
- `src/settings.js` — reducedMotion default
- `src/drawGame.js` — _rm gate on shake/flash/pulse
- `src/main.jsx` — Sentry init
- `src/components/ErrorBoundary.jsx` — Sentry.captureException
- `src/components/HUD.jsx` — speedrunMode + startTime props, live timer, tick interval
- `src/components/MenuScreen.jsx` — Speedrun + Gauntlet mode buttons, Meta Tree button, Assist button, Loadout Code I/O, MetaTreePanel render
- `src/components/SettingsPanel.jsx` — reducedMotion toggle (Visual tab)
- `src/utils/qrEncode.js` — fn[][] mask fix
- `src/components/DeathScreen.jsx` — qrError fallback
- `package.json` — ESLint devDeps + lint script + @sentry/react

---

## Game Modes (all mutually exclusive, leaderboard mode field)

| Mode | Ref | mode string |
|------|-----|-------------|
| Normal | — | null |
| Score Attack | `scoreAttackRef` | `"score_attack"` |
| Daily Challenge | `dailyChallengeRef` | `"daily_challenge"` |
| Cursed Run | `cursedRunRef` | `"cursed"` |
| Boss Rush | `bossRushRef` | `"boss_rush"` |
| Speedrun | `speedrunRef` | `"speedrun"` |
| Gauntlet | `gauntletRef` | `"gauntlet"` |

---

## META_TREE nodes (constants.js)

| Branch | id | Bonus |
|---|---|---|
| Offense | off1 | +5% damage |
| | off2 | +10% fire rate |
| | off3 | +8% crit chance |
| | off4 | Kill Frenzy: +20% speed 1s/kill |
| Defense | def1 | +15 max HP |
| | def2 | -8% incoming damage (_treeArmorMult) |
| | def3 | +8 HP on wave clear |
| | def4 | Last Stand: 50 HP restore once/run |
| Utility | util1 | +15% ammo capacity |
| | util2 | +10% XP gain |
| | util3 | +10% coin drops |
| | util4 | Free first wave shop |
| Chaos | cha1 | +10% weekly mutation boost |
| | cha2 | +50% coin drops (stacks with util3) |
| | cha3 | Extra Gauntlet perk slot |
| | cha4 | Pandemonium: random modifier each run |

Storage key: `cod-meta-tree-v1`

---

## Key env vars (GitHub Actions secrets)

| Var | Purpose |
|-----|---------|
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon key |
| `VITE_SCORE_HMAC_SECRET` | Score integrity HMAC |
| `VITE_POSTHOG_KEY` | PostHog analytics (optional) |
| `VITE_SENTRY_DSN` | Sentry error tracking (optional) |

---

## Suggested next session priorities

1. Playtest Speedrun + Gauntlet modes — balance, leaderboard display
2. Add Speedrun/Gauntlet tabs to `LeaderboardPanel.jsx`
3. Balance playtest: Meta Tree node costs, Kill Frenzy duration, Adaptive Assist threshold
4. QR code scanner test on mobile device
5. Run Supabase prestige migration (see Deferred above)
6. Discord URL when ready
