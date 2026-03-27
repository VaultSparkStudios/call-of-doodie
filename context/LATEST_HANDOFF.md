# Latest Handoff — Session 28 Closeout

This is the authoritative active handoff file for this repo.

**Date:** 2026-03-27
**Branch:** `main`, clean, pushed
**Build:** ✅ passes (`npm run build` — 765KB bundle, 0 errors; `npm test` — 65/65 passing; `npm run lint` — 0 errors)

---

## Where We Left Off (Session 28)
- Shipped: 19 improvements across 4 groups — analytics, accessibility, testing/CI, monetization
- Tests: 65 passing (loadoutCode 26 / storage 11 / constants 28) · delta: +65 this session
- Deploy: deployed to github-pages (commit 158c459)

---

## Human Action Required

- [ ] **Supabase prestige migration** — Run in SQL Editor: `ALTER TABLE leaderboard ADD COLUMN IF NOT EXISTS prestige integer DEFAULT 0;` — enables prestige ★ badge on leaderboard rows
- [ ] **Supabase supporter migration** — Run: `ALTER TABLE leaderboard ADD COLUMN IF NOT EXISTS supporter boolean DEFAULT false;` AND `ALTER TABLE callsign_claims ADD COLUMN IF NOT EXISTS supporter boolean DEFAULT false;` — enables ⭐ badge sync when Option B webhook ships
- [ ] **PostHog setup** — Create PostHog project → add `VITE_POSTHOG_KEY` to GitHub Actions secrets → analytics will start tracking immediately
- [ ] **Sentry setup** — Create Sentry project → add `VITE_SENTRY_DSN` to GitHub Actions secrets → error reporting will activate

---

## What was done this session (Session 28)

### Focus: Analytics, Accessibility, Testing & CI, Monetization

### Analytics
- Added `gameCtx({difficulty, mode, wave, score})` helper + `resolveMode(...)` to `analytics.js`
- `identify(name, {accountLevel, prestige})` called on username continue
- `perk_chosen` + `perk_skipped` events in `applyPerk` (includes all non-chosen perk options)
- `game_start` + conditional `mode_start` events at end of `startGame`
- `death` event before death screen transition
- `wave_reached` + `wave_milestone` (waves 5/10/20/50) in wave increment logic
- `weapon_switch` event throttled to once per 2s via `weaponSwitchTrackRef`
- Added `perkOptionsRef` mirror of `perkOptions` state for stale-closure-safe access in game loop

### Accessibility
- Skip link: `<a href="#game-canvas" className="skip-link">Skip to game</a>` in App.jsx
- `aria-live="polite"` region announces wave start + boss cutscene name
- Canvas: `id="game-canvas"` for skip-link target
- Global CSS: `:focus-visible` gold outline (3px solid #FFD700) + `.skip-link` off-screen-until-focused
- `src/hooks/useFocusTrap.js` — Tab/Shift+Tab trap within modal container + focus restore on unmount
- Applied `useFocusTrap` to `SupporterModal.jsx`

### Testing & CI
- `src/utils/loadoutCode.test.js` — 26 tests (all weapons 0-12, starters, edge cases, clamping, case-insensitivity)
- `src/storage.test.js` — 11 tests (getAccountLevel: 0/null/undefined/specific values/monotonic/tier thresholds)
- `src/constants.test.js` — 28 tests (WEAPONS, ENEMY_TYPES, DIFFICULTIES, PERKS, ACHIEVEMENTS shape + uniqueness)
- `vite.config.js` — `test:` block added (jsdom env, globals, include patterns, coverage config)
- `package.json` — `"test"`, `"test:watch"`, `"test:coverage"` scripts + vitest/jsdom devDeps
- `.github/workflows/deploy.yml` — `quality` job (lint + test) added; `build` now `needs: quality`

### Monetization
- `src/utils/supporter.js` — `isSupporter()` + `setSupporter()` (localStorage `cod-supporter-v1`)
- `src/components/SupporterModal.jsx` — Ko-fi link + "I already supported" claim; `role="dialog"` + `aria-modal` + `useFocusTrap` + Escape-to-close
- `src/components/LeaderboardPanel.jsx` — `SupporterBadge` component; ⭐ badge rendered on rows where `e.supporter === true`
- `src/components/MenuScreen.jsx` — "❤️ SUPPORT THE DEV" / "⭐ SUPPORTER" footer button; `SupporterModal` render

### Bug fix
- `src/components/PauseMenu.jsx` — `useRef(null)` and `useEffect` for mini-map were after early `return` statements (react-hooks/rules-of-hooks error); moved both to before first early return

---

## Files added (session 28)
- `src/hooks/useFocusTrap.js`
- `src/utils/supporter.js`
- `src/components/SupporterModal.jsx`
- `src/utils/loadoutCode.test.js`
- `src/storage.test.js`
- `src/constants.test.js`

## Files modified (session 28)
- `src/utils/analytics.js` — gameCtx(), resolveMode()
- `src/App.jsx` — analytics tracking (7 sites), perkOptionsRef, weaponSwitchTrackRef, liveAnnounce state, skip link, aria-live, canvas id, global CSS
- `src/components/PauseMenu.jsx` — hooks-after-return bug fix
- `src/components/LeaderboardPanel.jsx` — SupporterBadge
- `src/components/MenuScreen.jsx` — supporter button + SupporterModal
- `vite.config.js` — test block
- `package.json` — test scripts + vitest devDeps
- `.github/workflows/deploy.yml` — quality gate job

---

## Suggested next session priorities

1. Fix Speedrun leaderboard sort: time ascending (currently sorts by score — **wrong**)
2. Achievements for Speedrun + Gauntlet modes (0 currently)
3. Gauntlet difficulty sub-tabs (parity with Boss Rush)
4. Run Supabase migrations (prestige + supporter columns — see Human Action Required above)
5. Add PostHog + Sentry env vars to GitHub Actions secrets

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

## Key env vars (GitHub Actions secrets)

| Var | Purpose |
|-----|---------|
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon key |
| `VITE_SCORE_HMAC_SECRET` | Score integrity HMAC |
| `VITE_POSTHOG_KEY` | PostHog analytics (optional — silent no-op if absent) |
| `VITE_SENTRY_DSN` | Sentry error tracking (optional — silent no-op if absent) |
