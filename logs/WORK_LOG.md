# Work Log

This public repo no longer carries the detailed internal work log. Internal session-by-session execution detail is maintained privately.

## 2026-04-22 (Session 53)

## 2026-05-02 (Session 56)

- Diagnosed transient outage report at `vaultsparkstudios.com/call-of-doodie/` — confirmed via `git log` that `deploy.yml`, `vite.config.js`, and CNAME state in this repo were unchanged from S41 baseline; routed the issue to the apex-domain repo (`VaultSparkStudios.github.io`); founder reported the path resolved on its own
- Scored 8 hosting deployment options for the game (GH Pages, Cloudflare Pages, Vercel, Netlify, Itch.io, R2+Pages, AWS S3+CloudFront, self-hosted VPS) across cost/perf/DX/reliability/features/migration-effort; Cloudflare Pages and Vercel tied at 57/60, CF Pages chosen on bandwidth-cap headroom
- Scored 3 domain candidates (`callofdoodie.wtf` 49/60, `playcallofdoodie.com` 47/60, `callofdoodie.win` 35/60); founder purchased both `.wtf` and `.com` per the hedge recommendation
- Drafted public-safe parody / fair-use analysis: copyright fair use is favorable, trademark dilution-by-tarnishment is the live risk lane (Ko-fi tips weaken the §1125(c)(3)(A) noncommercial-parody safe-harbor), specified non-affiliation disclaimer + no-Activision-assets + no-CoD-keyword-ads + no-paid-loot-boxes + don't-trademark-the-name
- Added parody disclaimer footer to `src/components/HomeV2.jsx` (line 586, default `?home=v2` surface) — text: "Call of Doodie is an independent comedy parody and is not affiliated with, endorsed by, sponsored by, or associated with Activision Publishing, Inc. or the Call of Duty&reg; franchise. All trademarks are property of their respective owners."
- Mirrored the same disclaimer into `src/components/MenuScreen.jsx` (line 1601, legacy `?home=v1` surface) using monospace `Courier New` styling for parity with the older footer
- Verified ESLint clean on both edited files (`npx eslint src/components/HomeV2.jsx src/components/MenuScreen.jsx` → exit 0, no warnings)
- Began Cloudflare migration: verified `CLOUDFLARE_API_TOKEN` is active via `/user/tokens/verify`; listed existing zones (4 — promogrind.app, promogrind.bet, usemindframe.com, vaultsparkstudios.com); confirmed all use NS pair `journey.ns.cloudflare.com` + `piers.ns.cloudflare.com`
- Attempted to create new zones via API; both stored tokens (`CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_DNS_TOKEN`) returned `Requires permission "com.cloudflare.api.account.zone.create"` — surfaced two unblock paths (manual dashboard add ~60s, or generate a broader-scope token)
- Confirmed Namecheap API is blocked from this machine — public IP `45.144.114.159` does not match allowlisted `52.124.42.65`; flagged the IP-allowlist update as a manual step regardless
- Wrote the migration step ordering with the founder explicitly to lock in the cutover sequence (zones → NS swap → code changes on `feat/standalone-domain` branch → CF Pages project → custom domains → 301 → CORS update → retire GH Pages → old-path 301 in apex repo); session paused at the "founder must add zones to CF dashboard + swap Namecheap NS" gate

## 2026-04-30 (Session 55)

- Rewrote `src/App.jsx` highlight-GIF encoder — single shared palette (sampled mid-frame) instead of per-frame quantization; capped at 36 frames (~3.6s); yields every 6 frames so the death screen stays interactive
- Throttled rolling frame capture in `src/App.jsx` from every-6 frames @ 320px → every-10 frames @ 240px; capture buffer skipped entirely on mobile and when adaptive-quality flag is on
- Replaced `src/components/PerkModal.jsx` tier-label pill colors (text and bg were both `tierColor`, ~invisible) with black-on-solid-tier
- Upgraded `src/components/DraftScreen.jsx` `TIER_COLORS` from 3-char to 6-char hex so `${col}20` no longer yields invalid 5-char hex; darkened unhovered card bg to `rgba(0,0,0,0.55)`
- Promoted `useGameLoop.js` frame-budget monitor from DEV-only to production; exposed `makeFrameMonitor` for testing; flips `window.__codReducedEffects` after sustained drops with hysteresis
- Wired `src/drawGame.js` particle pass to render every-other particle when reduced flag is on
- Added `⚡ PERF MODE` HUD chip in `src/components/HUD.jsx` (poll-subscribed via `useSyncExternalStore`)
- Collapsed `src/components/SettingsPanel.jsx` from 17 settings × 3 tabs into `Quick` (6 essentials) + `Advanced` (the rest); default tab = Quick; LB/RB cycles
- Added `↺ RESET` button to SettingsPanel footer that previews `SETTINGS_DEFAULTS` without saving
- Added `WEAPON_UNLOCK_LEVELS` + `isWeaponUnlocked()` to `src/constants.js`
- Wired weapon-unlock gating into `src/components/MenuPanels.jsx` LoadoutBuilder weapon grid; saved-but-now-locked weapons remain selectable as `🔒legacy` (grandfathered)
- Added `✕` dismiss button to weekly mutation banner in `src/components/HomeV2.jsx` with sessionStorage persistence (`cod-mutation-dismissed`)
- Added `src/weaponUnlocks.test.js` (6 tests) and `src/hooks/useGameLoop.test.js` (4 tests); 10/10 passing
- Wrote `docs/QA_CHECKLIST.md` (60+ browser-driven QA checks), `docs/AUTH_INTEGRATION_PLAN.md` (4-phase Supabase Auth migration plan), `docs/APP_EXTRACTION_ROADMAP.md` (App.jsx extraction priorities for S56-S58)

## 2026-04-22 (Session 54)

- Added `src/systems/runSession.js` + tests and moved run-start artifact creation, run-history entry shaping, death-event generation, and score-submit event generation out of `src/App.jsx`
- Added `src/utils/challengeLinks.js` + tests so seeded rivalry/replay URLs are built and copied from one shared helper
- Updated `src/components/DeathScreen.jsx` to use the shared challenge-link helper instead of duplicating query-param logic
- Upgraded `src/components/MenuPanels.jsx` Run History with direct replay/rematch/copy-link actions for rivalry rows, featured seeds, ghost-board cards, weekly-contract rematches, and seeded run-history entries
- Updated `src/components/HomeV2.jsx` to surface measurement readiness (analytics key + local Studio-event sync state) and launch seeded replays from Run History back into the menu deploy flow
- Added `scripts/generate-launch-assets.mjs` / `npm run launch:assets` and generated raster launch stills in `public/launch-assets/*.png`
- Added `scripts/launch-readiness.mjs` / `npm run launch:readiness` to summarize raster asset readiness, telemetry-key status, and remaining owner-side launch gates
- Updated `docs/LAUNCH_EXECUTION.md` and `context/TASK_BOARD.md` to reflect the new launch tooling and shipped S54 slice
- Validation: `npm run lint` clean, `npm test` 264/264, `npm run build` passing, `npm run launch:readiness` reports 5/5 PNG assets present

## 2026-04-22 (Session 53)

- Added browser-local Studio event queue metadata in `src/storage.js` (`clientEventId`, sync status, retry metadata) plus opportunistic sync helpers
- Added `supabase/functions/sync-studio-events/index.ts` and migration `supabase/migrations/2026-04-22_studio_game_events.sql` so front-door/debrief/trust/social events can be mirrored server-side with idempotent upserts
- Wired `HomeV2`, `MenuScreen`, and `DeathScreen` to request Studio event sync without making any gameplay or trust surface network-dependent
- Expanded `RunHistoryPanel` trust ops summary to show sync health (`synced`, `queued`, `retry`) alongside trust flags and telemetry counts
- Finished the remaining live Roast Director hooks in `src/App.jsx`: `wave_clear`, `perk_chosen`, `coin_milestone`, and `death`
- Cleared the stale warning in `src/systems/pickupSpawning.test.js`
- Removed the ineffective HomeV2 `HUD.jsx` prefetch and converted `register-sw.js` to a base-aware module path so the production build no longer emits those warnings
- Validation: `npm test` 258/258 passing, `npm run lint` passing, `npm run build` passing

## 2026-04-22 (Session 52)

- Added `src/utils/socialRetention.js` + tests — weekly contracts, rivalry summaries, featured seed cards, and ghost-board helpers extracted into pure utilities
- Added `src/utils/studioEventOps.js` + tests — trust-op and telemetry summarization for local Studio events
- Added `src/systems/bossWaveFlow.js` + tests — pure boss-wave planner extracted from `src/App.jsx` covering developer boss, dual-boss planning, preview cards, and warning text
- Expanded `src/utils/runIntelligence.js` Studio event contract to `contractVersion: 2`, adding telemetry event types for perk/route/abandon/death/contract progress
- Expanded `src/App.jsx` local Studio event persistence to log perk picks, route picks, score-submit outcomes/rejections, weekly-contract progress, first-death wave, and mode abandonment
- Upgraded `src/components/MenuPanels.jsx` Run History surface with rivalry streaks, featured seeds, ghost-board cards, weekly-contract progress, trust-op counts, rejection summaries, and telemetry guidance
- Updated `context/TASK_BOARD.md` and `context/PROJECT_STATUS.json` so the remaining queue is explicitly split between human/data-gated work and completed in-repo items
- Validation: `npm test` 258/258 passing, `npm run build` passing, `npm run lint` passing with one pre-existing warning in `src/systems/pickupSpawning.test.js`

## 2026-04-21 (Session 49)

- Added `src/components/MenuPanels.jsx` — nine shared panels extracted from MenuScreen: RulesPanel, ControlsPanel, MostWantedPanel (renamed from Bestiary), RunHistoryPanel, LoadoutBuilderPanel, CareerStatsPanel (with advanced analytics), MissionsPanel, UpgradesPanel (with inline prestige confirm + player-skin picker), NewFeaturesPanel
- Wired those panels into `src/components/HomeV2.jsx` via a new ⚙ COMMAND CENTER chip row (10 buttons: STATS / MISSIONS / UPGRADES / META TREE / HISTORY / LOADOUTS / RULES / CONTROLS / MOST WANTED / WHAT'S NEW), lazy-loaded under Suspense so the home chunk stays thin
- Renamed the HomeV2 Codex tab Bestiary section to "MOST WANTED" (state key `bestiary` → `mostwanted`); legacy term no longer appears in HomeV2
- Added `isMobile` to HomeV2's destructured props so ControlsPanel receives it
- CareerStatsPanel now computes accuracy %, crit rate %, kills/min, avg damage/run, survival rate, and total upgrade tiers on top of the original Score/Combat/Progression/Meta sections
- Legacy `src/components/MenuScreen.jsx` left untouched; `?home=v1` opt-out still works as a full rollback
- Validation: `npm test` 151/151 passing; lint clean on touched files

## 2026-04-21 (Session 48)

- Added `src/components/HomeV2.jsx` — "Drop Pod" homepage redesign with single DEPLOY split-button (mode/difficulty/seed dropdown), merged Intel Ticker (Command Brief + Run Intel + Recommended Action in one dismissible line + (?) popover), quick-access chips (Daily/Gauntlet/Leaderboard/Achievements), slim top bar, and tabbed Career/Codex/Settings/Support sub-nav.
- Added `src/components/DemoCanvas.jsx` — self-contained 30fps background firefight sim (player drifts, enemies spawn from edges, particle bursts on kill). Deferred via `requestIdleCallback`, pauses on hidden tab, honors `prefers-reduced-motion`, does not import `drawGame.js`.
- Feature-flagged HomeV2 in `src/App.jsx` via `?home=v2` / `?home=v1` query params and `cod-home-v2` localStorage; v2 is now the default, v1 remains available for instant rollback. Legacy `MenuScreen.jsx` is untouched.
- Fixed `scripts/render-startup-brief.mjs` to read `silMax` from `context/PROJECT_STATUS.json` so the startup brief shows `881/1000` (SIL v3.0 rubric) instead of the stale hardcoded `/500`.
- Added `src/components/HomeV2.test.jsx` (2 tests: hero title + DEPLOY click → onStart, all 4 tab labels present) and updated `src/App.launch.test.jsx` with a matching HomeV2 mock so the launch smoke continues to pass now that v2 is default.
- Validation baseline: `npm test` 151/151, `npm run lint` clean, `npm run build` passes (792.29 kB raw / 230.92 kB gzipped index, 9.20s).
- Mid-session pivot: Ko-fi webhook activated end-to-end. Diagnosed a silent 500 where `callsign_claims.uid NOT NULL DEFAULT auth.uid()` broke every Edge Function write because service-role contexts have `auth.uid() = NULL`. Wrote migration `supabase/migrations/2026-04-21_callsign_claims_uid_nullable.sql` and applied it via `supabase db query --linked --file`. Set `KOFI_VERIFICATION_TOKEN` as Supabase function secret via `supabase secrets set`. Verified with two real Ko-fi test webhooks (Donation + Subscription) that both landed in `kofi_events` with `supporter_updated: true` before being cleaned up. Checked off three Ko-fi Human Action items in `context/TASK_BOARD.md` with dated evidence. Added feedback memory `feedback_supabase_service_role_auth_uid.md` so future Edge Functions are audited against this trap. Committed as `e316537`.
- Repo hygiene: moved `CODEX_HANDOFF_2026-03-12.md`, `CODEX_HANDOFF_2026-03-12_S6.md`, and `HANDOFF.md` from the public repo root to `vaultspark-studio-ops/docs/archive/call-of-doodie/` per the CLAUDE.md rule that this repo is limited to deployable code and public-safe docs. Updated `context/TRUTH_MAP.md` handoff pointer. Left `logs/SESSION_LOG.md` references in place since logs are append-only. Committed as `65e4d1d`. No credential leak: the Supabase publishable key in the moved files is the client-embedded anon key already present in the production JS bundle.

## 2026-04-17 (Session 47)

- Updated `context/TASK_BOARD.md`, `docs/IMPROVEMENT_PLAN.md`, `context/CURRENT_STATE.md`, `context/LATEST_HANDOFF.md`, and `context/PROJECT_STATUS.json` with the Run Intelligence Spine / integrated refinement stack and follow-up queue.
- Added `src/utils/runIntelligence.js` plus tests for menu recommendation, post-run diagnosis, rivalry prompts, compact event digests, Studio event shape, and rule-based roast callouts.
- Wired run intelligence into `MenuScreen` and `DeathScreen`, including history-aware recommendations, debrief drills, rivalry prompts, local Studio event persistence, and local rivalry outcome recording.
- Added local Studio event and rivalry persistence helpers in `src/storage.js` with test coverage.
- Upgraded event digests to v2 timeline bands and updated `supabase/functions/submit-score/index.ts` to validate digest timeline coherence before leaderboard insert.
- Extracted digest-aware leaderboard payload shaping into `buildSessionSubmission` and routed `App.jsx` through that helper.
- Lazy-loaded `DeathScreen` from `App.jsx`, keeping the death/debrief surface in a separate production chunk.
- Added local protocol repair helpers: `scripts/ops.mjs action-queue`, `scripts/ops.mjs blocker-preflight`, `scripts/render-startup-brief.mjs`, and `scripts/validate-brief-format.mjs`.
- Validation baseline: `npm test` 149/149, `npm run lint` clean, `npm run build` passing.

## 2026-04-14 (Session 42)

- Audited the project surface and converted the findings into a durable roadmap in `docs/IMPROVEMENT_PLAN.md`
- Hardened `supabase/functions/submit-score/index.ts` with plausibility gates for kills, damage, score, level, and rate-based envelopes
- Fixed claimed-callsign validation in the score submit path to compare against the resolved caller uid
- Added `src/utils/runDebrief.js` + tests and upgraded the death screen into a tactical debrief with verdict, identity, strengths, and next-step guidance
- Added a command briefing to the main menu so mode/loadout selection is framed before the player deploys
- Added `src/utils/buildArchetypes.js` + tests and wired archetype capstone unlocks into the perk flow
- Surfaced current build identity in the HUD and tagged build-fit recommendations in the perk, shop, and route modals
- Re-verified the client suite: `npm test` 116/116 and `npm run lint` 0 errors / 13 baseline warnings

## 2026-04-14 (Session 43)

- Shipped `src/systems/waveDirector.js` plus `src/systems/waveDirector.test.js` to give non-boss waves authored scouting/pressure/climax/recovery pacing instead of a single shrinking spawn timer
- Wired `src/App.jsx` into the director plan so spawn cadence now reacts to alive-budget saturation, preview cards surface wave identity/hints, and stage telegraphs announce incoming elite spikes
- Standardized elite mutation application in `src/gameHelpers.js`, reducing duplicated enemy-stat edits in the main loop and making director-forced elite surges reuse the existing combat model
- Synced `prompts/start.md` and `prompts/closeout.md` to the latest Studio OS `v3.1` protocol and added `START_PROMPT.template.md` plus `CLOSEOUT_PROMPT.template.md` so the template-alignment check no longer drifts by missing-file default
- Added repo-local protocol helpers: `scripts/detect-session-mode.mjs`, `scripts/check-secrets.mjs`, `scripts/lib/secrets.mjs`, `scripts/ops.mjs`, and `scripts/closeout-autopilot.mjs`
- Verified the gameplay + protocol baseline: `npm test` 121/121, `npm run lint` clean, `npm run build` passing, `node scripts/ops.mjs help`, `node scripts/detect-session-mode.mjs --json`, `node scripts/check-secrets.mjs --json`, and `node scripts/closeout-autopilot.mjs --dry-run`

## 2026-04-13 (Session 41)

- Launch-readiness audit: ran `npm test` (110/110), `npm run lint` (0 errors), `npm run launch:verify` (14/14 live assertions) — baseline clean
- Identified in-repo fixable gaps: PNG icons missing, Ko-fi webhook absent, flaky launch smoke near 5s timeout
- Shipped `scripts/generate-icons.mjs` using sharp; generated `public/icon-192.png` + `public/icon-512.png`
- Wired PNG icons into `public/manifest.json` (any + maskable), `index.html` (icon + apple-touch-icon links), `public/sw.js` (cache version bumped to cod-v4)
- Added `prebuild` npm script so icons regenerate on every `npm run build`; added manual `icons:generate` script
- Added sharp to devDependencies
- Shipped `supabase/functions/kofi-webhook/index.ts`: Ko-fi verification-token validation, callsign extraction from `message`/`from_name`, idempotent via `kofi_events.message_id`
- Added `supabase/migrations/2026-04-14_kofi_webhook.sql` with `kofi_events` audit table + RLS
- Extended `.github/workflows/deploy-supabase-function.yml` to auto-deploy the kofi-webhook function on push
- Updated `supabase/functions/README.md` with kofi-webhook deploy instructions
- Raised Vitest `testTimeout` to 15000ms in `vite.config.js` after observing launch-smoke variance of 1.2s–5.5s
- Re-verified end-to-end: `npm test` 110/110, `npm run build` produces working dist/ including generated PNGs, `npm run launch:verify` 14/14 live assertions

## 2026-04-06

- Public-safe summary: launch-prep session opened
- Added live Supabase Edge Function health check at `scripts/health-check.mjs`
- Added `npm run health:check`
- Validated production function behavior: missing token rejected, token issue succeeded, mode mismatch rejected, valid submit accepted, token replay rejected
- Added `src/App.launch.test.jsx` to cover username -> menu -> draft -> game startup flow and run-token request path
- Validation baseline after changes: `npm test` 84/84 passing, `npm run lint` passing with 13 warnings
- Added `scripts/live-site-check.mjs` and `npm run launch:qa`
- Verified deployed site shell, manifest, service worker registration, service worker file, and OG image against production
- Remaining Phase 1 checks are hardware/browser-specific and require a real device session

## 2026-04-07

- Source-controlled the Cloudflare security-header worker and Call of Doodie CSP override under `cloudflare/`
- Added `docs/LAUNCH_EXECUTION.md` so the Itch.io copy, screenshot shot list, launch sequence, and telemetry decision live in-repo
- Added `npm run launch:smoke` and `npm run launch:verify`
- Tightened `src/App.launch.test.jsx` to assert the startup run-token payload shape
- Reduced repo-side launch ambiguity so the remaining blockers are execution-only human/device checks
- Verified `npm run launch:verify` successfully against the live backend and live site after sandbox escalation
- Added `scripts/launch-surface-check.mjs` and confirmed homepage, sitemap, live game page branding, and `/games/` visibility on production
- Added `scripts/shared-leaderboard-check.mjs` and confirmed no non-`cod` rows are visible in the latest 200 readable leaderboard entries
- Added `public/launch-assets/` with a ready-to-upload launch media pack so listing publication is no longer blocked on manual screenshot capture

## 2026-04-13 (Session 40)

- Confirmed Edge Function redeploy: `deploy-supabase-function.yml` last ran 2026-04-02 with success
- Validated live leaderboard submit end-to-end: `npm run health:check` → 5/5 assertions passed against production
- Added `src/gameHelpers.test.js` — 26 tests covering spawnEnemy wave 1–3 logic, spawnBoss, BOSS_ROTATION, and mutation flag propagation; total suite now 110/110
- Wired `VITE_POSTHOG_KEY` and `VITE_SENTRY_DSN` into `deploy.yml` build env (secrets to be added via GitHub Settings)
- Populated `public/manifest.json` screenshots (5 entries: 4 wide/desktop, 1 narrow/mobile) to satisfy Chrome desktop PWA install prompt requirement
- Added `apple-mobile-web-app-title` to `index.html` for correct iOS home screen label
- Pushed 2 commits to main; CI confirmed in progress


## 2026-04-21 (Session 51)

- Meta clarity pass: `src/utils/metaClarity.js` — `getRecommendedMetaUpgrade()` identifies player weakness (defense/offense/utility/chaos) from career stats; wired into `buildFrontDoorActionStack` via `menuGuidance.js`, `HomeV2.jsx`, `MenuScreen.jsx`; `metaRec` attached to `best_next_upgrade` action; 13 tests
- Route forecasting: `src/utils/routeForecast.js` — `getRouteForecast()` returns context-aware headline/tradeoff/tip per route accounting for HP%, coins, weapon level, wave number, boss imminence; hover panel wired into `RouteSelectModal`; `gs` prop added; 12 tests
- App.jsx extraction slice 8: `src/systems/pickupSpawning.js` — pure `spawnPickup()` + `getPickupWeights()` extracted from App.jsx; App wrapper collapses to 2 lines passing `ammoDropMult`; 11 tests
- Roast Director: `src/utils/roastDirector.js` — 10 event pools, per-event wave cooldown, `getRoastCallout()` API; wired in game loop at kill_streak (every 5 kills, 2-wave cooldown) and boss_kill (3-wave cooldown); `roastCooldowns` ref resets on new run start; 12 tests
- Test backfill: mutationResolution.test.js (8), shopOptions.test.js (8), perkOptions.test.js (6), routeOptions.test.js (5) — written S50 but uncommitted; committed this session
- Archetype doctrine coverage: 3 new tests for `getDoctrineMilestones` + DOCTRINE FORGED tier; 2 new menuGuidance tests for first-run stack + metaRec wiring
- Economy clarity slice 2 — shop tradeoff: `src/utils/shopForecast.js` — `getShopAdvisory()` returns urgency-rated one-line advisory per shop item keyed to HP%, ammo, wave, weapon level, enemy count; `WaveShopModal` shows advisory on hover (wave shop + coin shop); `gs` prop added; 17 tests
- TASK_BOARD: meta clarity, pickup extraction, Roast Director, economy clarity slice 2 all marked DONE S51
- Validation: `npm test` 248/248 · `npm run lint` clean · `npm run build` clean
- All commits pushed to main (8 commits, 0bf4f20 latest)
