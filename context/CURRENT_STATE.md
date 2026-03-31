# Current State

## Build
- Status: ✅ build passing (`npm run build` clean, 768.25KB bundle); ✅ tests passing (`npm test` 70/70); ✅ lint passes (`npm run lint`) with 67 warnings and 0 errors
- Latest commit: `d1142a4` — Session 29
- Branch: `main`, working tree dirty (Session 30 changes not yet committed)
- Deployed: live at `https://vaultsparkstudios.com/call-of-doodie/`

## Architecture sizes (approx)
- `App.jsx`: ~3500 lines (game loop + state orchestrator)
- `drawGame.js`: ~1050 lines (pure render, no React setters)
- `gameHelpers.js`: ~200 lines — spawnEnemy/spawnBoss/BOSS_ROTATION
- `constants.js`: large — WEAPONS(12), ENEMY_TYPES(22), PERKS(27+cursed), ACHIEVEMENTS(61), DIFFICULTIES, META_TREE, getWeeklyGauntlet, etc.
- `sounds.js`: ~571 lines — Web Audio API synthesis + procedural background music
- `storage.js`: ~400 lines — Supabase + localStorage, career, meta, missions, meta tree, run history

## CI / Quality gate
- `quality` job: ESLint (`npx eslint src --report-unused-disable-directives`) + `npm test` runs before build/deploy
- `build` job: `needs: quality` → `deploy` job: `needs: build`
- Local `npm run lint` now matches CI and passes on warnings; `npm run lint:strict` remains available for warning-debt cleanup

## Test suite (70 tests — Vitest 2 + jsdom 25)
- `src/utils/loadoutCode.test.js` — 26 tests (encodeLoadout, decodeLoadout, isValidLoadoutCode)
- `src/storage.test.js` — 16 tests (getAccountLevel + leaderboard normalization/time sorting helpers)
- `src/constants.test.js` — 28 tests (shape validation, uniqueness, required fields)

## Active game modes (all mutually exclusive)
- **Normal**: standard run — mode: null
- **Score Attack**: 5-min countdown, 1.5× spawn — mode: "score_attack"
- **Daily Challenge**: fixed LCG seed per day — mode: "daily_challenge"
- **Cursed Run**: all cursed perks, 3× score — mode: "cursed"
- **Boss Rush**: every wave a boss, dual from wave 4 — mode: "boss_rush"
- **Speedrun**: live green ⏱ MM:SS HUD timer — mode: "speedrun"
- **Gauntlet**: weekly fixed weapon/perk, no shop — mode: "gauntlet"

## Enemy roster (22 types, indices 0–21)
- Regular: 0–15, 19 (Doomscroller)
- Boss-only: 4 (Mega Karen), 16 (Splitter), 17 (Juggernaut), 18 (Summoner), 9 (Landlord), 20 (The Algorithm)
- Secret: 21 (The Developer) — wave 50+, one-time spawn
- BOSS_ROTATION: [4, 16, 17, 18, 9, 20]

## Prestige skins (PLAYER_SKINS in MenuScreen.jsx)
- P0: "" Soldier (default) · P1: 🤖 Robot · P2: 👾 Alien · P3: 🐸 Frog · P4: 🦊 Fox · P5: 🐉 Dragon

## Supabase leaderboard columns (all live)
- id, name, score, kills, wave, lastWords, rank, bestStreak, totalDamage, level, time
- achievements, difficulty, starterLoadout, customSettings, inputDevice, seed, accountLevel, ts, created_at
- mode (score_attack/daily_challenge/cursed/boss_rush/speedrun/gauntlet/null), game_id ('cod'), sig (HMAC)
- callsign_claims table + RLS policy ✅ live 2026-03-26
- `prestige`, `supporter`, and `callsign_claims.supporter`: included in `supabase/migrations/2026-03-30_launch_security.sql`; not live until that migration is applied

## Analytics (PostHog — gated on VITE_POSTHOG_KEY)
- Events tracked: game_start, mode_start, death, wave_reached, wave_milestone, perk_chosen, perk_skipped, weapon_switch
- `gameCtx({difficulty, mode, wave, score})` — standard context builder
- `resolveMode(...)` — canonical mode string from boolean refs
- `identify(name, {accountLevel, prestige})` — called on username continue
- ⚠ VITE_POSTHOG_KEY not yet in GitHub Actions secrets (silent no-op until added)

## Accessibility (Session 28)
- Skip link: `<a href="#game-canvas" className="skip-link">` — keyboard users bypass nav
- aria-live region: `<div aria-live="polite">` announces wave start + boss cutscene
- Canvas: `id="game-canvas"` for skip-link target
- `:focus-visible` gold outline CSS (3px solid #FFD700, outline-offset 2px)
- `.skip-link` CSS: off-screen until focused, then visible
- `useFocusTrap(ref, enabled)` hook — Tab/Shift+Tab trap + focus restore on unmount

## Supporter system (Session 28 — cosmetic only)
- `src/utils/supporter.js` — isSupporter(), setSupporter() (localStorage `cod-supporter-v1`)
- `src/components/SupporterModal.jsx` — Ko-fi link + "already supported" claim; role="dialog", aria-modal
- `LeaderboardPanel.jsx` — ⭐ badge on rows where `e.supporter === true`
- `MenuScreen.jsx` — "❤️ SUPPORT THE DEV" / "⭐ SUPPORTER" footer button
- Session 30 fix: leaderboard reads/writes now preserve `supporter` so local supporter claims actually survive submission/display

## Leaderboard integrity + ranking (Session 30)
- `src/storage.js` now normalizes leaderboard entries before save/read (text cleanup, numeric clamping, mode/device allowlists)
- Speedrun rows now sort by `time` ascending in the leaderboard UI and in post-submit rank lookup
- Supporter badge state is included in Supabase/local fallback reads
- Death-screen rank lookup is now mode-aware for speedrun submissions
- Repo path: online leaderboard submission now targets the Supabase Edge Function `submit-score` instead of direct browser inserts
- Repo path: `issue-run-token` mints one-time run tokens bound to mode/difficulty/seed; `submit-score` now requires and consumes them
- Repo path: `submit-score` verifies auth, re-checks callsign ownership server-side, validates token age/shape, normalizes payloads, and awards Vault points for real members
- Live state caveat: these protections are not active in production until the new Supabase migration is applied and both functions are deployed

## Marketing surface (Session 30)
- `index.html` now has stronger SEO/share metadata: improved title, description, canonical, Open Graph, and Twitter tags
- `public/og-image.svg` gives Open Graph/Twitter previews a dedicated branded card
- `public/manifest.json` description updated to reflect the live feature set
- `public/sw.js` pre-caches the OG image with the rest of the shell assets
- `README.md` and menu share copy updated to reflect current weapon/enemy/mode/achievement counts and launch positioning

## localStorage keys (complete)
| Key | Purpose |
|-----|---------|
| `cod-lb-v5` | Leaderboard fallback |
| `cod-career-v1` | Career stats |
| `cod-meta-v2` | Meta progression (prestige, playerSkin, upgradeTiers, careerPoints) |
| `cod-meta-tree-v1` | META_TREE unlocked node IDs (Set) |
| `cod-missions-YYYY-MM-DD` | Daily mission progress |
| `cod-daily-YYYY-MM-DD` | Daily challenge submitted marker |
| `cod-callsign-v1` | Locked callsign |
| `cod-run-history-v1` | Last 10 run summaries |
| `cod-custom-loadouts-v1` | 3-slot custom loadout presets |
| `cod-supporter-v1` | Supporter badge claim (localStorage Option A) |
| `cod-ghost-{mode}-v1` | sessionStorage per-mode ghost positions |
| `cod-music-muted` / `cod-music-vibe` / `cod-colorblind` / `cod-settings-v1` / `cod-presets-v1` / `cod-tutorial-v1` | Prefs |

## New utilities (session 28)
- `src/hooks/useFocusTrap.js` — focus trap + restore for modals
- `src/utils/supporter.js` — isSupporter(), setSupporter()
- `src/components/SupporterModal.jsx` — Ko-fi supporter modal
- Test files: loadoutCode.test.js, storage.test.js, constants.test.js

## Vault Member Integration (server-side as of Session 30)
- `supabase/functions/submit-score/index.ts` now awards Vault points after verified online leaderboard submits
- Writes to `game_sessions` table (game_slug: 'call-of-doodie') + calls `award_vault_points` RPC (3 pts)

## Deferred (user action, non-blocking)
- Run `supabase/migrations/2026-03-30_launch_security.sql` against the project
- GitHub Actions secrets: `SUPABASE_ACCESS_TOKEN` + `SUPABASE_PROJECT_REF` to enable `.github/workflows/deploy-supabase-function.yml`
- Supabase Edge Function secrets: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- VITE_POSTHOG_KEY → add to GitHub Actions secrets when PostHog project created
- VITE_SENTRY_DSN → add to GitHub Actions secrets when Sentry project created
- Discord URL: uncomment footer link in `MenuScreen.jsx` when invite URL available

## PWA
- `public/manifest.json` + `public/sw.js` v3 deployed
- SW strategy: cache-first assets, stale-while-revalidate shell, network-only API, offline fallback

## Known issues (minor, low priority)
- Boss ground slam: random stagger can shorten 90-frame warning on first cycle
- Overclocked perk: taking it twice resets overclockedShots mid-game
- Gamepad rumble requires Chrome 68+
- Discord link in MenuScreen footer commented out
- Warning debt still exists (67 warnings), but it is no longer a launch blocker because local lint and CI now agree
