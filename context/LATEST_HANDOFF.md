# Latest Handoff — Session 19 Closeout

This is the authoritative active handoff file for this repo.

If this file conflicts with `handoffs/LATEST_HANDOFF.md`, `HANDOFF.md`, or
`CODEX_HANDOFF_*.md`, this file wins.

**Date:** 2026-03-20
**Last commit:** `ec94066` — Session 19 polish — all outstanding items resolved
**Branch:** `main`, clean, pushed

---

## 2026-03-21 addendum

- Added operating overlays for `SYSTEMS`, `CONTENT_PLAN`, `LIVE_OPS`, and `QUALITY_BAR`
- Added `context/MEMORY_INDEX.md` for faster cold-start session loading
- Added `plans/CONSTRAINTS_LEDGER.md` and `plans/EXPERIMENT_REGISTRY.md`
- Updated startup and closeout prompts so these files are part of the gold-standard read and write path

---

## What was done this session (sessions 18 + 19)

### Session 18
Two new enemy types, controller overhaul, multiplayer alternatives:

**Enemies:**
- **Doomscroller** (typeIndex 19): regular enemy, wave 9+. Periodically freezes 70/280 frames while "doomscrolling". Color #7B68EE. Defined in `constants.js`, spawned in `gameHelpers.js`.
- **The Algorithm** (typeIndex 20): boss-only. 700HP, 3-shot spread, Viral Surge ability every ~480 frames (`gs.algorithmSurge` triples spawn rate for 3s). `BOSS_ROTATION = [4, 16, 17, 18, 9, 20]`.

**Controller:**
- LT/L2 = ADS zoom (1.28× centered on player, scope ring overlay in screen space in `drawGame.js`)
- LB/L1 = Grenade (primary); D-pad L/R = prev/next weapon
- PauseMenu shows both Xbox + PlayStation button labels

**Social / challenge:**
- **Daily Challenge mode**: `getDailyChallengeSeed()` LCG, `cod-daily-YYYY-MM-DD` localStorage marker. `dailyChallengeRef` + `dailyChallengeMode` state in App.jsx. Submits `mode: "daily_challenge"`.
- **Ghost mode**: `?vs=SCORE&vsName=NAME` URL params → `challengeVsScore`/`challengeVsName` state → HUD challenge tracker + DeathScreen result card (BEATEN/FAILED).
- **LeaderboardPanel**: DAILY tab, per-row ⚔️ challenge link button.
- `mode` column live in Supabase, `score_attack` and `daily_challenge` tagged correctly.

**Other:**
- Score Attack daily missions (sa_score, sa_kills, sa_wave) in `storage.js`
- TutorialOverlay redesigned: 6-step, progress dots, auto-advance, NEXT/SKIP/LET'S GO
- `MAX_PARTICLES=150`, death sound max 1/frame
- Prestige skin on share card

### Session 19
Polish pass on all outstanding items:

- `gs.algorithmSurge` now cleared on The Algorithm boss death (both kill paths in App.jsx)
- Doomscroller frozen visual: pulsing purple ring + "zzz 📱" label above enemy in `drawGame.js`
- `soundEnemyDeath(19)`: phone-buzz + sad chime; `soundEnemyDeath(20)`: glitch cascade
- DeathScreen challenge link: ✓ COPIED! green flash (1.5s) via `copiedChallenge` state
- WaveShopModal: "BOUGHT THIS RUN" history strip (`shopHistory` state in App.jsx → `boughtHistory` prop)
- LeaderboardPanel DAILY tab: TODAY badge where `e.seed === getDailyChallengeSeed()`
- Prestige skins P4 🦊 Fox (required: 4), P5 🐉 Dragon (required: 5) in `MenuScreen.jsx`
- PauseMenu: ⚔️ LEADERBOARD button opens full `LeaderboardPanel` mid-run (receives `leaderboard`, `lbLoading`, `lbHasMore`, `onLoadMore`, `onRefreshLeaderboard`, `username`)

---

## Key file map (updated)

| File | Role |
|------|------|
| `src/App.jsx` | ~1530 lines. Game loop, all state, refs, startGame, submitScore, applyShopOption, challenge/daily logic |
| `src/drawGame.js` | ~700 lines. Pure render. ADS zoom scale + scope overlay. Doomscroller zzz visual. |
| `src/gameHelpers.js` | ~140 lines. spawnEnemy (wave table incl. Doomscroller at wave 9+), spawnBoss (Algorithm init) |
| `src/constants.js` | WEAPONS(12), ENEMY_TYPES(21 incl. Doomscroller+Algorithm), PERKS, CURSED_PERKS, ACHIEVEMENTS(49), DIFFICULTIES, BOSS_ROTATION |
| `src/storage.js` | Supabase LB, career stats, meta (cod-meta-v2), missions(24 types incl. sa_*), getDailyChallengeSeed(), hasDailyChallengeSubmitted(), markDailyChallengeSubmitted() |
| `src/sounds.js` | soundEnemyDeath now handles all 21 types. soundSummonDismissed(). |
| `src/components/MenuScreen.jsx` | PLAYER_SKINS: 6 entries (P0–P5). getDailyChallengeSeed import. Daily Challenge button. Challenge banner shows vs score. |
| `src/components/HUD.jsx` | vsScore/vsName props → challenge tracker bar at top:46 |
| `src/components/DeathScreen.jsx` | vsScore/vsName/dailyChallengeMode props → challenge result card. copiedChallenge state. |
| `src/components/LeaderboardPanel.jsx` | MODE_TABS: ALL/NORMAL/SCORE ATK/DAILY. todaySeed from getDailyChallengeSeed(). Per-row ⚔️ button. |
| `src/components/WaveShopModal.jsx` | boughtHistory prop → "BOUGHT THIS RUN" strip |
| `src/components/PauseMenu.jsx` | ⚔️ LEADERBOARD button. showLb state. LeaderboardPanel import. |
| `src/components/TutorialOverlay.jsx` | 6-step sequential onboarding, auto-advance 6s, input-mode aware |

---

## Important gs fields (game loop state)

```js
gs.scoreAttackMode       // bool — score attack active
gs.scoreAttackTimeLeft   // frames remaining (18000 at start)
gs.scoreAttackDone       // bool — timer expired
gs.adsZoom               // bool — LT/L2 held on controller
gs.algorithmSurge        // bool — Algorithm Viral Surge active (cleared on boss death)
gs.playerSkin            // emoji string for helmet overlay ("" = soldier)
gs.bossKillFlash         // decremented in App.jsx game loop
gs._deathSoundsThisFrame // reset 0/frame; caps death sounds at 1/frame
```

---

## Refs added in sessions 18–19

```js
dailyChallengeRef     // useRef(false) — synced with dailyChallengeMode state
scoreAttackRef        // useRef(false) — synced with scoreAttackMode state
```

---

## State added in sessions 18–19

```js
dailyChallengeMode       // useState(false)
challengeVsScore         // useState(null) — parsed from ?vs= or set by challenge start
challengeVsName          // useState(null) — parsed from ?vsName=
shopHistory              // useState([]) — [{emoji, name}] — reset on startGame
```

---

## localStorage keys (complete)

| Key | Purpose |
|-----|---------|
| `cod-lb-v5` | Leaderboard fallback |
| `cod-career-v1` | Career stats |
| `cod-meta-v2` | Meta progression (prestige, playerSkin, upgradeTiers, careerPoints) |
| `cod-missions-YYYY-MM-DD` | Daily mission progress |
| `cod-daily-YYYY-MM-DD` | Daily challenge submitted marker |
| `cod-callsign-v1` | Locked callsign |
| `cod-music-muted` | Music mute pref |
| `cod-music-vibe` | Music vibe id |
| `cod-colorblind` | Colorblind mode |
| `cod-settings-v1` | Settings panel values |
| `cod-presets-v1` | Named settings presets |
| `cod-tutorial-v1` | Tutorial seen flag |

---

## Pending (manual, non-blocking)

1. **Callsign_claims SQL migration** — full SQL in `storage.js` comments. Must be run in Supabase console. Also requires "Anonymous sign-ins" enabled in Supabase Auth settings.
2. Nothing else is blocking gameplay or leaderboard functionality.

---

## What to tackle next

Suggested priorities for next session:
1. Run the callsign_claims SQL migration in Supabase console (client-side enforcement is already live)
2. Wave 40+ difficulty scaling / new boss type or ability
3. iOS Capacitor wrapper research
4. Any Discord link / community feature when an invite URL is ready

## 2026-03-23 portfolio addendum

- Added `context/PORTFOLIO_CARD.md` and `context/PROJECT_STATUS.json`
- Updated AGENTS, startup, closeout, and memory-index docs so portfolio status is part of standard project operation

