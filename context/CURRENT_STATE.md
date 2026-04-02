# Current State

## Build
- Status: ✅ build passing (`npm run build` clean, 771KB bundle); ✅ tests passing (`npm test` 83/83); ✅ lint passes (`npm run lint`) with 13 warnings and 0 errors
- Latest commit: Session 37 (seeded lightning arcs, collapsible weapon breakdown, Overclocked ??= fix)
- Branch: `main`, pushing — sessions 33–37 deployed via GitHub Actions
- Deployed: live at `https://vaultsparkstudios.com/call-of-doodie/`; Edge Functions redeploy triggered via session 36 push (confirm Actions tab)

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

## Test suite (83 tests — Vitest 2 + jsdom 25)
- `src/utils/loadoutCode.test.js` — 26 tests (encodeLoadout, decodeLoadout, isValidLoadoutCode)
- `src/storage.test.js` — 16 tests (getAccountLevel + leaderboard normalization/time sorting helpers)
- `src/constants.test.js` — 41 tests (shape validation, uniqueness, required fields; NEW_FEATURES shape; ACHIEVEMENT_PROGRESS integrity; mode-gated achievement behavioral regression)

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
- Live state: migration was run by the user and both GitHub Actions workflows succeeded on 2026-03-31, so the hardened online submit path is now deployed

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
- Validate one live Call of Doodie leaderboard submission end-to-end in production
- Spot-check any other game/platform sharing this Supabase `leaderboard` table to confirm the policy change did not break legacy direct-submit flows
- VITE_POSTHOG_KEY → add to GitHub Actions secrets when PostHog project created
- VITE_SENTRY_DSN → add to GitHub Actions secrets when Sentry project created
- Discord URL: uncomment footer link in `MenuScreen.jsx` when invite URL available

## PWA
- `public/manifest.json` + `public/sw.js` v3 deployed
- SW strategy: cache-first assets, stale-while-revalidate shell, network-only API, offline fallback

## Auth (Session 33 change)
- `initAnonAuth()` removed — was CAPTCHA-gated and caused `dn is not defined` crash via supabase-js error handler
- Replaced with `getOrCreateClientUid()` — generates/persists a UUID in `cod-client-uid-v1` (localStorage)
- Both Edge Functions (`issue-run-token`, `submit-score`) now accept `clientUid` from request body as fallback when no Supabase user session; anon auth no longer required
- Existing Supabase sessions (stored from before CAPTCHA was enabled) still work via `auth.getUser()` check

## localStorage keys (complete, session 33 addition)
| Key | Purpose |
|-----|---------|
| `cod-client-uid-v1` | Stable anonymous client UUID — replaces Supabase anon auth |

## Session 34 bug fixes (14 total)
- CRITICAL: drawGame.js `dn` scope — player auras (adrenaline/rage/freeze/time dilation) no longer crash
- CRITICAL: Railgun hitscan beam now uses GW()/GH() instead of undefined W/H — weapon is functional
- CRITICAL: Blitz route no longer permanently mutates settSpawnMult — uses blitzSpawnMult correctly
- CRITICAL: SupporterModal useState now calls isSupporter() instead of passing function ref
- HIGH: Level-up no longer resets player speed to base (preserves loadout/perk/shop bonuses)
- HIGH: Synergy burst uses weapon.damage instead of non-existent bulletDamage
- HIGH: Weapon switch analytics now captures previous weapon before updating ref
- HIGH: Renamed speed-boost perk from "Adrenaline Rush" to "Speed Surge" (removes duplicate name)
- HIGH: claimCallsign now verifies ownership after upsert (no more silent false-success)
- HIGH: Local leaderboard fallback sort no longer uses a.mode for mixed-mode comparisons
- MEDIUM: Ground slam damage text now shows actual damage dealt (including Glass Jaw multiplier)
- MEDIUM: Acid hazard now applies _treeArmorMult like all other damage sources
- MEDIUM: Respawn timer now pauses during shop/route/cutscene (matches startGame)
- LOW: statsRef.weaponKills initial array size fixed from 10 to WEAPONS.length (12)

## Session 35 fixes (live prod bugs — deployed)
- CRITICAL: HUD.jsx `DesktopToolbar` — `Tooltip` prop destructured as `_Tooltip` but JSX used `<Tooltip>` → ReferenceError crashed app via ErrorBoundary on every load
- CSP: Inline SW registration script blocked by enforced `script-src` CSP — moved to `public/register-sw.js` (covered by `'self'`)
- CSP: Supabase realtime WebSocket blocked by `connect-src` — realtime disabled in `createClient` options (unused feature)
- Favicon 404 fixed — `<link rel="icon" href="/call-of-doodie/favicon.svg">` added to `index.html`

## Icon / Branding (Session 35)
- `public/icon.svg` — custom-drawn poop mascot: clipPath union silhouette, radial gradient, sheen highlight, soldier beret + star badge, orange crosshair badge, subtle grid bg, brand accent bar
- `public/favicon.svg` — minimal version for browser tab (poop + eyes + orange dot at 64×64 viewBox)
- `public/manifest.json` — updated icons array with explicit 192/512 entries
- `public/register-sw.js` — extracted from inline `<script>` in index.html

## Supabase realtime (Session 35 change)
- `createClient` now passes `{ realtime: { enabled: false } }` — game does not use realtime subscriptions; auto-open of WebSocket caused `connect-src wss://` CSP violation

## Deferred (user action, non-blocking)
- Re-deploy Edge Functions: `supabase functions deploy issue-run-token submit-score` (session 33 changes not yet deployed)
- Validate one live Call of Doodie leaderboard submission end-to-end in production
- Spot-check any other game/platform sharing this Supabase `leaderboard` table to confirm the policy change did not break legacy direct-submit flows
- VITE_POSTHOG_KEY → add to GitHub Actions secrets when PostHog project created
- VITE_SENTRY_DSN → add to GitHub Actions secrets when Sentry project created
- Discord URL: uncomment footer link in `MenuScreen.jsx` when invite URL available

## Known issues (minor, low priority)
- Boss ground slam: random stagger can shorten 90-frame warning on first cycle
- Gamepad rumble requires Chrome 68+
- Discord link in MenuScreen footer commented out
- Warning debt: 13 warnings — react-hooks/exhaustive-deps in 2 non-game files; lint:strict not yet a gate
- mutAlwaysEnraged + berserker elite compounds speed (~3x) — may be intentional difficulty scaling
- Lightning arcs jitter every frame (Math.random per frame) — cosmetic only
