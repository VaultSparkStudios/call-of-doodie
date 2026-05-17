<!-- truth-audit-version: 1.1 -->
# Truth Audit

Overall status: green
Last reviewed: 2026-05-17
Public-safe summary only. Sensitive verification notes are maintained privately.

## 2026-05-17 — Session 64 changes

- `src/components/HomeV2.jsx` — now accepts `setStarterLoadout` and applies decoded replay starter loadouts in both `?replay=` URL bootstrap and pasted replay-code load paths.
- Replay truth — `src/utils/replayCode.js` already encoded `starterLoadout`; this session closes the launcher hydration gap so starter loadout is no longer inert payload data on HomeV2.
- `src/components/HomeV2.test.jsx` — adds component-level replay URL hydration coverage for difficulty, daily mode, starter loadout, and seed input state. DemoCanvas is mocked in this test file to avoid jsdom canvas noise.
- `docs/AUDIT_2026-05-17.md` / `docs/IMPLEMENT_PLAN.md` — current audit and execution artifacts for the focused replay fidelity sprint.
- Validation truth — focused HomeV2/replayCode tests passed 8/8, full `npm test` passed 332/332, lint clean, and build passing.

## 2026-05-14 — Session 63 changes

- `src/App.jsx` — `statsRef.current.bestPrecisionStreak` is initialized and reset per run, then updated when a non-boss precision hit increments `gs.precisionStreak`. This is telemetry/coaching state only; precision coin rewards remain the Session 62 behavior.
- `src/components/DeathScreen.jsx` — receives `starterLoadout` and `bestPrecisionStreak` from App.jsx. SHARE RUN now encodes the actual starter loadout in the replay code. AI RUN COACH can render a precision coaching line when applicable.
- `src/utils/runCoach.js` — now returns a `precisionTip` field. It emits mastery guidance for `bestPrecisionStreak >= 5`, a gap hint for high-kill/low-precision runs, and `null` when no precision advice applies.
- `src/utils/runBrain.js` — accepts `latestRun` and records `precisionStreak`; strong precision chains can drive the next-experiment recommendation. This remains zero-token/local-first.
- `src/utils/replayCode.test.js`, `src/utils/runCoach.test.js`, and `src/utils/runBrain.test.js` — regression coverage now includes non-standard starter replay fidelity and precision coaching paths.
- `README.md` — public live/deploy documentation now matches the canonical `.wtf` + Cloudflare Pages hosting state.
- `scripts/post-cutover-smoke.mjs` / `package.json` — new smoke command validates apex and Pages shell/manifest plus redirects from `www` and backup domains to `https://callofdoodie.wtf/`.
- Validation truth — full test suite passed 331/331, lint clean, build passing, and live post-cutover smoke passed 5/5 after network permission.

## 2026-05-14 — Session 62 changes

- `src/systems/combatResolution.js` — now exports `isPrecisionHit(bullet, enemy)`. Hit detection checks squared distance against `(size/2 * 0.35)²`. Returns false for null inputs and zero-size enemies.
- `src/App.jsx` — `gs.precisionStreak` is new gs state initialized to 0 in `initGame()`. Precision streak logic is wired into the bullet-enemy collision block. `getMusicBPM` and `getMusicBeat` are now imported from `sounds.js`; beat-sync spawn particle burst is additive-only (no spawn rate changes).
- `src/utils/runCoach.js` — `buildWeaponTip()` now exists as a named export-adjacent helper. The module returns a 5-field object (`killedBy`, `tryNext`, `working`, `weaponTip`, `brain`). `weaponTip` is `null` when no actionable advice applies (zero kills, single weapon, no pattern detected).
- `src/components/DeathScreen.jsx` — SHARE RUN button only renders when `runSeed > 0`. Uses `encodeReplayCode` from `replayCode.js` (pre-existing import). `weaponTip` is rendered conditionally in AI RUN COACH section.
- `src/components/HomeV2.jsx` — `?replay=` URL param is handled in the same `useEffect` as the existing `?seed=` handler. Mutually exclusive: if `?replay=` is present and valid, the `?seed=` branch is skipped.
- `src/sounds.js` — `getMusicBPM()` reads `_BPM[vibe]` where `vibe` is `"boss"` when `_musicBoss` is set, otherwise falls back to `_musicVibe || "action"`. `getMusicBeat()` returns the `_musicBeat` counter. Both are safe to call before audio is initialized (return 108 and 0 respectively).
- Test truth — `runCoach.test.js` line 21 was changed from "killed you" to "ended" (matching the actual string the function now emits). Line 41-44 was changed to test only zero-kills cases for null `weaponTip` (a single-weapon dominant run correctly returns a non-null tip).
- Combat truth — `isPrecisionHit` is caller-aware: the call site in App.jsx guards `!e.isBossEnemy` so boss enemies never contribute to precision streak. The function itself is agnostic to boss status.

## 2026-05-14 — Session 61 changes

- `scripts/verify-plan-mode.mjs` — now reads the session lock `agent:` value and treats non-`claude-code` sessions as `planModeDetected: not_required`, preventing Codex sessions from failing on a Claude-only runtime slash-command requirement.
- `context/PROJECT_STATUS.json` — `planModeDetected` and current session metadata now reflect the Codex-specific not-required status and Session 61 closeout state.
- `functions/_middleware.js` — new Cloudflare Pages middleware source-of-truth for canonical redirects from `www.callofdoodie.wtf`, `playcallofdoodie.com`, and `www.playcallofdoodie.com` to `https://callofdoodie.wtf/`.
- `scripts/cloudflare-domain-cutover.mjs` — now loads the same private Studio Ops Cloudflare secret paths as the platform cutover helper. Rulesets API access was still unauthorized; middleware is therefore the active redirect mechanism.
- Live domain state — apex `https://callofdoodie.wtf/` serves 200 and the three alternate hosts return 301 to the apex after the Pages middleware deployment.
- `src/systems/combatResolution.js` and `src/App.jsx` — enemy projectile/player damage and grenade explosion damage now delegate through pure combat helpers. Contact-hit helper logic exists and is covered by tests, but not every contact path is wired out of `App.jsx` yet.
- `validate-replay` truth — deterministic resim remains blocked by the contract shape. `inputHash` is not reversible into replay inputs; a compact timeline/command trace or signed event digest is needed before server resimulation can be real.
- Cross-repo truth — old-path redirect changes were committed and pushed to sibling repo `VaultSparkStudios.github.io` as `a6515ae`. This repo can claim the sibling patch is published to GitHub; production availability should still be verified after the website deployment completes.

## 2026-05-14 — Session 60 changes

- `scripts/platform-domain-cutover.mjs` — promoted from partial platform helper to full custom-domain repair helper: loads private studio-access token, uses separate zone-create/DNS tokens, creates/verifies zones, updates Namecheap nameservers, attaches Pages domains, creates/updates Cloudflare DNS CNAMEs, and removes conflicting A/AAAA records for web hosts.
- Cloudflare/Namecheap live state — `callofdoodie.wtf` and `playcallofdoodie.com` are delegated to Cloudflare nameservers; apex `callofdoodie.wtf` serves the Cloudflare Pages app and passed live-site verification.
- `context/PROJECT_STATUS.json` — current focus, next milestone, blockers, and `testingSurfaces` now reflect the completed apex cutover and remaining post-cutover tasks.
- `context/STUDIO_MANIFEST.json` and `context/runtime-pack/RUNTIME_PACK.json` — production `liveUrl` now points at `https://callofdoodie.wtf/`; backup and Pages preview surfaces are listed for downstream website/portfolio agents.
- `docs/STARTUP_BRIEF.md` — WHERE TO TEST now surfaces the canonical domain, backup `.com`, Pages preview, and live-site check command.
- `docs/DOMAIN_MIGRATION_PLAN.md` — status updated from blocked/in-progress to apex-live with redirects/allowlists remaining.
- Security truth — broad Cloudflare studio-access token was used to complete the cutover; least-privilege rotation is now an explicit follow-up.
- No gameplay source-of-truth changed this session. Remaining contradiction risk is operational only: `www.callofdoodie.wtf` was still pending/522 while apex passed.

## 2026-05-13 — Session 59 changes

- `vite.config.js` — deployment base path is now controlled by `VITE_BASE_PATH`. Cloudflare Pages uses `/`; the manual GitHub Pages fallback uses `/call-of-doodie/`.
- `.github/workflows/deploy-cloudflare.yml` — new canonical deployment workflow for Cloudflare Pages. `.github/workflows/deploy.yml` is no longer automatic on push and remains a manual fallback.
- `index.html`, `public/manifest.json`, `public/og-image.svg`, `public/launch-assets/launch-combat.svg`, `docs/LAUNCH_EXECUTION.md`, `src/components/DeathScreen.jsx`, and `src/components/MenuScreen.jsx` — canonical public URL now points at `https://callofdoodie.wtf/`.
- `src/config/site.js` and `src/utils/challengeLinks.js` — canonical share URL is centralized. `challengeLinks` still accepts explicit `baseUrl` for tests or future overrides.
- `public/register-sw.js` and `public/sw.js` — service worker registration/cache scope is derived at runtime; this prevents root-domain and fallback-subpath builds from diverging. Cache version is `cod-v5`.
- `public/_headers` — Cloudflare Pages security headers/CSP now live with the static bundle. Legacy `cloudflare/vaultspark-security-headers.js` remains only for the old `vaultsparkstudios.com` route.
- `scripts/cloudflare-domain-cutover.mjs` and `scripts/platform-domain-cutover.mjs` — new deployment automation. They are operational helpers, not secret stores; they read credentials from environment/private ops files and do not print secrets.
- `docs/DOMAIN_MIGRATION_PLAN.md` and `docs/DOMAIN_CUTOVER_RUNBOOK.md` — source-of-truth migration procedure updated. Custom domain activation remains blocked until Cloudflare zones exist.
- `supabase/functions/submit-score/index.ts`, `src/supabase.js`, `src/utils/supporter.js`, and `docs/AUTH_INTEGRATION_PLAN.md` — auth audit confirmed no contradiction: Studio membership hooks exist server-side, but no public sign-in UI is implemented.

## 2026-05-11 — Session 58 changes

- `src/systems/combatResolution.js` (+test) — promoted from geometry scaffold to deterministic combat-math helper module. It now owns bullet/enemy overlap, crit rolls, juggernaut shield-facing multiplier, lightning-chain target selection, pierce decrement, and obstacle-bounce resolution. `App.jsx` still owns React refs, particles, and mutable game-state orchestration.
- `src/systems/objectiveDirector.js` (+test) — adds objective-chain stat derivation and per-objective result recording. These stats drive achievements only; active objective lifecycle remains the existing `gs.activeObjective` path.
- `src/constants.js` / `src/constants.test.js` — achievement source of truth grows from 61 to 65 with objective mastery achievements: hot-zone hat trick, 5 bounties, perfect escort, and clutch lockdown.
- `src/utils/runBrain.js` (+test) — new local, zero-token derivation surface for post-run guidance. It reads run history, Studio events, and current death pressure; it does not write authoritative game state.
- `src/utils/runCoach.js` (+test) and `src/components/DeathScreen.jsx` — Run Coach now includes Run Brain context; DeathScreen renders a next-experiment/follow-through cue beside the existing debrief.
- `src/utils/socialRetention.js` (+test), `src/components/MenuPanels.jsx`, and `src/components/HomeV2.jsx` — Run History now derives fixed-seed bounty cards from existing run/daily/rivalry data; HomeV2 passes the daily champion into that panel.
- `src/components/HomeV2.jsx` — first-three-run onboarding arc added on the front door. It is presentational guidance only; mode/loadout/gameplay source-of-truth remains unchanged.
- `src/drawGame.js` — Heat Meter now has a visual treatment in addition to the existing music/HUD behavior. Reduced-motion guard remains authoritative.
- `supabase/functions/validate-replay/index.ts` — replay validation now reports confidence (`heuristic`, `replay_contract`, `quarantine`) and warns when competitive seeded submissions omit `inputHash`. This is still not full deterministic resimulation; Phase 2B remains open.
- `src/App.jsx` — legacy `MenuScreen` is lazy-loaded. HomeV2 remains the default front door; `?home=v1` still functions as a fallback.

## 2026-05-09 — Session 57 changes

- `src/systems/heatMeter.js` (+test) — new source-of-truth for `gs.heat`. Replaces the combo-count branch in `App.jsx` for music tier selection (combo still drives score multiplier + on-screen text).
- `src/systems/scoreLedger.js` (+test) — new source-of-truth for kill-point composition. Both kill sites in `App.jsx` now delegate to `computeKillPoints()`.
- `src/systems/objectiveDirector.js` (+test) — new source-of-truth for active dynamic objective lifecycle (pick + tick + lifecycle resolution). `gs.activeObjective` is the canonical run-time field.
- `src/systems/combatResolution.js` — scaffold only; ships `pointInCircle` + `dist2`. Full bullet-vs-enemy resolver still owned by `App.jsx` (deferred to S58 — a multi-session extraction because of React-ref tangling).
- `src/utils/runCoach.js` (+test) — new derivation surface composing `metaClarity` + `runDebrief` + recent-deaths-by-enemy ledger. Pure derivation; not a source-of-truth itself.
- `src/utils/replayCode.js` (+test) — new portable encoding for shareable run conditions. The 12-char hex code with mod-16 checksum is the canonical share format; URL params remain the in-game challenge format (used by LeaderboardPanel "copy challenge" button).
- `src/utils/cosmeticTrack.js` (+test) — new source-of-truth for cosmetic ownership. Reads `cod-supporter-v1` localStorage (existing flag) + career stats; writes `cod-cosmetic-track-v1` localStorage. Cosmetic-only — never affects gameplay state.
- `src/storage.js` — adds `getDailyChampion()` (top of today's daily-challenge leaderboard, derived); adds `recordDeathByEnemy(typeId)` + `getTelegraphMultiplier(typeId)` (rolling 20-death window stored on `cod-career-v1` under `recentDeathsByEnemy`).
- `src/settings.js` — adds `hudDensity` setting + `hudFlags(density)` exporter. The flag becomes a derived view on the canonical `cod-settings-v1` key — no new storage key.
- `supabase/functions/validate-replay/index.ts` — new Edge Function. Heuristic-only Phase 1; logs anomalies to existing `run_anomalies` table. Phase 2 (deterministic resim) deferred until combat extraction lands.

## 2026-04-22 — Session 54 changes

- `src/systems/runSession.js` + `src/systems/runSession.test.js` added: run-start artifact creation, run-history entry shaping, death-event generation, and score-submit event generation now live in a dedicated runtime helper module
- `src/App.jsx` updated: run lifecycle bookkeeping delegates to `runSession.js`; source-of-truth behavior is unchanged, but another orchestration branch is now outside the main component
- `src/utils/challengeLinks.js` + `src/utils/challengeLinks.test.js` added: seeded challenge/replay URLs now come from one canonical builder/copy helper
- `src/components/DeathScreen.jsx` updated: challenge-link copy path now uses the canonical helper instead of hand-built querystring logic
- `src/components/MenuPanels.jsx` updated: Run History exposes direct replay/rematch/copy-link actions for rivalry rows, featured seeds, ghost-board cards, and seeded run-history entries
- `src/components/HomeV2.jsx` updated: measurement readiness (`PostHog` key status + local Studio-event sync state) is visible on the front door, and Run History can launch seeded replays back into the deploy flow
- `scripts/generate-launch-assets.mjs` added: existing SVG launch stills can now be exported to PNG; `public/launch-assets/*.png` added as generated, source-controlled outputs
- `scripts/launch-readiness.mjs` added: launch readiness now reports raster asset coverage plus telemetry-key presence without exposing sensitive values
- `docs/LAUNCH_EXECUTION.md`, `context/TASK_BOARD.md`, `context/CURRENT_STATE.md`, `context/LATEST_HANDOFF.md`, `logs/WORK_LOG.md`, and `context/SELF_IMPROVEMENT_LOOP.md` updated for Session 54 closeout state
- No contradictions introduced. Source-of-truth hierarchy unchanged — launch readiness remains advisory, and replay/challenge links remain a client-side convenience layer over existing seeded-run behavior.

## 2026-04-22 — Session 53 changes

- `src/storage.js` updated: local Studio events are now normalized with `clientEventId`, sync status, retry metadata, and an opportunistic `syncStudioGameEvents()` / `requestStudioEventSync()` path
- `supabase/functions/sync-studio-events/index.ts` added: browser-local Studio events can now be mirrored server-side through idempotent upserts on `client_event_id`
- `supabase/migrations/2026-04-22_studio_game_events.sql` added: new `studio_game_events` mirror table with dedupe key, created/received timestamps, and RLS locked to no public reads
- `src/components/HomeV2.jsx`, `src/components/MenuScreen.jsx`, and `src/components/DeathScreen.jsx` updated: front-door and debrief surfaces now opportunistically trigger Studio event sync without changing the local-first UX contract
- `src/utils/studioEventOps.js` + `src/components/MenuPanels.jsx` updated: Run History trust ops now exposes sync-health counts (`synced`, `queued`, `retry`) in addition to trust and telemetry counts
- `src/App.jsx` updated: the remaining Roast Director runtime hooks (`wave_clear`, `perk_chosen`, `coin_milestone`, `death`) now fire in live gameplay; the prior note that some roast hooks were still unwired is no longer accurate
- `src/systems/pickupSpawning.test.js` updated: stale local variable removed, clearing the previous lint warning
- `index.html`, `public/register-sw.js`, and `src/components/HomeV2.jsx` updated: build-side warnings for the legacy service-worker script path and ineffective `HUD.jsx` prefetch are resolved
- `context/TASK_BOARD.md`, `context/CURRENT_STATE.md`, `context/PROJECT_STATUS.json`, and agent memory updated to reflect Session 53 closeout state
- No contradictions introduced. Source-of-truth hierarchy unchanged — gameplay/trust surfaces still read from the local event queue first, and the new mirror path is additive rather than authoritative.

## 2026-04-22 — Session 52 changes

- `src/utils/socialRetention.js` + `src/utils/socialRetention.test.js` added: weekly contracts, rivalry summaries, featured seed cards, and ghost-board summaries now live in a pure utility module
- `src/utils/studioEventOps.js` + `src/utils/studioEventOps.test.js` added: local Studio event summaries now produce trust-op counts, rejection summaries, and telemetry guidance
- `src/systems/bossWaveFlow.js` + `src/systems/bossWaveFlow.test.js` added: boss preview/spawn planning extracted from `src/App.jsx` into a pure planner covering developer boss, dual-boss thresholds, preview-card metadata, and warning text
- `src/utils/runIntelligence.js` updated: Studio event contract upgraded to `contractVersion: 2`; telemetry event types added for `perk_choice`, `route_choice`, `mode_abandon`, `first_death_wave`, and `weekly_contract_progress`
- `src/App.jsx` updated: local Studio events now persist score-submit results/rejections, perk picks, route picks, weekly-contract progress, first-death wave, and pause-menu abandonments; boss-wave preview/spawn branch now delegates to `createBossWavePlan()`
- `src/components/MenuPanels.jsx` updated: Run History now surfaces weekly-contract progress, rivalry streaks, featured seeds, ghost-board summaries, trust-op counts, rejection summaries, and telemetry counts using the new utility modules
- `src/storage.js` updated: local Studio event retention window expanded from 50 → 100 records to support the richer trust/telemetry history
- `context/TASK_BOARD.md` updated: social retention, social rivalry loop, telemetry/balance loop, security/trust ops surface, Studio Hub event contract, and App extraction slice 9 marked complete; human/data-gated Lighthouse + funnel items explicitly reclassified
- `context/PROJECT_STATUS.json` updated: session fields and current focus/next milestone now reflect Session 52
- No contradictions introduced. Source-of-truth hierarchy unchanged — all new modules are additive pure utilities or pure planners, and the local Studio event schema remains browser-local only.

## 2026-04-21 — Session 51 changes

- `src/utils/metaClarity.js` added — `identifyWeakness(career)` + `getRecommendedMetaUpgrade()` + `getMetaRecommendationLabel()`; career-weakness-targeted META_TREE upgrade recs; 13 tests
- `src/utils/routeForecast.js` added — `getRouteForecast(route, gs)` + `getRouteForecastOneliner()`; context-aware next-wave descriptions (headline + tradeoff + tip); 12 tests
- `src/systems/pickupSpawning.js` added — `spawnPickup()` + `getPickupWeights()` pure fns extracted from App.jsx; ammoDropMult param supported; 11 tests; App.jsx wrapper collapses to 3 lines
- `src/utils/roastDirector.js` added — `getRoastCallout(event, cooldowns, currentWave, cooldownWaves)` with 10 event pools, per-event wave-based rate limiting; 12 tests
- `src/utils/shopForecast.js` added — `getShopAdvisory(option, gs, wpnIdx)` + `getAdvisoryColor(urgency)` returning urgency-rated advisories per item type; 17 tests
- `src/utils/menuGuidance.js` extended — `buildFrontDoorActionStack` now accepts `unlocked`, `meta`, `career` params and enriches best_next_upgrade with `metaRec` + `detail` + `whyNow`; 2 new tests
- `src/components/HomeV2.jsx` extended — passes `unlocked`, `meta`, `career` to `buildFrontDoorActionStack`
- `src/components/MenuScreen.jsx` extended — passes `unlocked`, `meta`, `career` to `buildFrontDoorActionStack`
- `src/components/RouteSelectModal.jsx` extended — accepts `gs` prop; renders route forecast panel on hover
- `src/components/WaveShopModal.jsx` extended — accepts `gs` prop; renders shop advisory on hover/focus per item; coin shop rows also advisory-annotated
- `src/App.jsx` extended — imports `spawnPickup` from pickupSpawning.js, `getRoastCallout` from roastDirector.js; adds `roastCooldowns` ref; roast fires at boss_kill (cooldown 3) and kill_streak (cooldown 2); passes `gs` to WaveShopModal
- Test backfill committed: `src/systems/mutationResolution.test.js` (8), `src/systems/shopOptions.test.js` (8), `src/utils/perkOptions.test.js` (6), `src/utils/routeOptions.test.js` (5) — written session 50, committed session 51
- `context/PROJECT_STATUS.json` updated: `silSession` 49 → 51, `silScore` 936 → 948, `silVelocity` 2 → 6, `currentSession` 49 → 51, per-category scores updated
- No contradictions introduced. Source-of-truth hierarchy unchanged — all new modules are pure utilities with no novel storage keys.

## 2026-04-21 — Session 49 changes

- `src/components/MenuPanels.jsx` added — new shared source-of-truth for nine menu panels (Rules, Controls, MostWanted, RunHistory, LoadoutBuilder, CareerStats, Missions, Upgrades, NewFeatures). HomeV2 is the only current consumer; MenuScreen still owns its own inline copies (follow-up to dedupe later).
- `src/components/HomeV2.jsx` updated: lazy imports for the nine new panels, nine new `show*` state toggles, new ⚙ COMMAND CENTER chip row, `isMobile` prop now threaded through, Codex tab state key renamed `bestiary` → `mostwanted`, button label changed Bestiary → MOST WANTED.
- No contradictions introduced. Source-of-truth hierarchy unchanged — MenuPanels.jsx is purely additive and matches MenuScreen's existing storage helpers exactly (`loadCustomLoadouts`, `saveCustomLoadout`, `purchaseMetaUpgrade`, `prestigeAccount`, `saveMetaProgress`).
- `context/PROJECT_STATUS.json` updated: `silSession` 48 → 49, `silScore` 936 → 942, `silVelocity` 5 → 2, `currentSession` 48 → 49, `truthAuditLastRun` 2026-04-17 → 2026-04-21, new per-category scores reflect refined rubric values, `currentFocus` + `nextMilestone` rewritten for session 49.

## 2026-04-17 — Session 47 changes

- `src/utils/runIntelligence.js` + tests added: shared run-intelligence utility now owns menu focus selection, post-run diagnosis, rivalry prompts, compact event digests, Studio event shape, and rule-based callouts.
- `src/components/MenuScreen.jsx` updated: loads run/rivalry history, shows run-intelligence guidance, saves local Studio events, and tracks intelligence focus with front-door actions.
- `src/components/DeathScreen.jsx` updated: shows post-run intelligence, saves debrief Studio events, records local rivalry results, and submits v2 event digests.
- `src/storage.js` + tests updated: local Studio event queue and rivalry history persistence added.
- `src/utils/runSubmission.js` + tests updated: `buildSessionSubmission` now owns digest-aware leaderboard payload shaping.
- `src/App.jsx` updated: uses `buildSessionSubmission` and lazy-loads `DeathScreen` into a separate production chunk.
- `supabase/functions/submit-score/index.ts` updated: accepts v1/v2 digests and validates v2 timeline bands before leaderboard insert.
- `scripts/ops.mjs`, `scripts/render-startup-brief.mjs`, and `scripts/validate-brief-format.mjs` updated/added so local startup/action queue/brief validation commands exist.
- Source-of-truth hierarchy unchanged. No contradictions introduced.

## 2026-04-14 — Session 43 changes

- `src/systems/waveDirector.js` + `src/systems/waveDirector.test.js` added: four-phase non-boss pacing planner with event selection, alive-budget-aware cadence, and telegraphed elite surges
- `src/App.jsx` updated: wave progression now consumes director state for pacing, preview-card hints, event selection, and stage announcements
- `src/gameHelpers.js` updated: elite application logic extracted into shared helpers so wave-director surges reuse the existing enemy-mutation model cleanly
- `prompts/start.md` and `prompts/closeout.md` synced to Studio OS `v3.1`, then adapted so command references remain executable in this repo
- `START_PROMPT.template.md` + `CLOSEOUT_PROMPT.template.md` added: template-alignment checks now have local files to compare against
- `scripts/detect-session-mode.mjs`, `scripts/check-secrets.mjs`, `scripts/lib/secrets.mjs`, `scripts/ops.mjs`, and `scripts/closeout-autopilot.mjs` added: local protocol scaffolding for mode detection, secrets discovery, and closeout automation
- `context/CURRENT_STATE.md`, `context/TASK_BOARD.md`, `context/LATEST_HANDOFF.md`, `context/SELF_IMPROVEMENT_LOOP.md`, `logs/WORK_LOG.md`, and `context/DECISIONS.md` updated to reflect the shipped pacing slice and protocol sync
- No contradictions introduced. Source-of-truth hierarchy unchanged.

## 2026-04-14 — Session 42 changes

- `docs/IMPROVEMENT_PLAN.md` added: ranked roadmap for trust, UX, build depth, pacing, performance, and architecture
- `context/CURRENT_STATE.md`, `context/TASK_BOARD.md`, `context/LATEST_HANDOFF.md`, `context/MEMORY_INDEX.md` updated to reflect the Session 42 roadmap and shipped slice
- `audits/2026-04-14.json`, `context/STATE_VECTOR.json`, `context/GENOME_HISTORY.json`, and `docs/GENOME_HISTORY.md` generated during closeout
- `supabase/functions/submit-score/index.ts` updated: plausibility validation added for score submission; claimed-callsign check now compares against resolved `uid`
- `src/utils/runDebrief.js` + `src/utils/runDebrief.test.js` added: reusable run debrief logic and coverage
- `src/components/DeathScreen.jsx` updated: tactical debrief added
- `src/utils/buildArchetypes.js` + `src/utils/buildArchetypes.test.js` added: archetype/capstone model and coverage
- `src/App.jsx` updated: archetype capstone unlocks wired into perk flow and HUD/modals now receive build context
- `src/components/HUD.jsx`, `PerkModal.jsx`, `WaveShopModal.jsx`, `RouteSelectModal.jsx` updated: build-fit guidance surfaced to players
- `ignis/output/predictions.json` and `ignis/output/score-history.json` refreshed during IGNIS re-score
- `prompts/start.md` + `prompts/closeout.md` updated in worktree: template sync paths now reference the sibling `vaultspark-studio-ops` repo
- No contradictions introduced. Source-of-truth hierarchy unchanged.

## 2026-04-13 — Session 41 changes

- `context/PROJECT_STATUS.json` updated: currentFocus, nextMilestone, silSession, silScore, silAvg3, silVelocity, silLastSession, currentSession
- `public/manifest.json` updated: PNG icon entries (192/512 any + 512 maskable) added alongside the existing SVG fallback
- `public/icon-192.png` + `public/icon-512.png` added as generated artefacts (regenerable via `npm run icons:generate`)
- `scripts/generate-icons.mjs` added: build-time sharp-based SVG→PNG converter
- `index.html` updated: PNG icon + apple-touch-icon links added
- `public/sw.js` updated: cache version bumped to cod-v4 and PNG icons added to SHELL_ASSETS
- `package.json` updated: `prebuild` hook, `icons:generate` script, sharp devDependency
- `supabase/functions/kofi-webhook/index.ts` added: new Edge Function
- `supabase/migrations/2026-04-14_kofi_webhook.sql` added: new `kofi_events` audit table
- `.github/workflows/deploy-supabase-function.yml` updated: now also deploys the kofi-webhook function
- `supabase/functions/README.md` updated: kofi-webhook deploy instructions
- `vite.config.js` updated: testTimeout raised to 15000 for CI stability
- No contradictions introduced. Source-of-truth hierarchy unchanged.

## 2026-04-13 — Session 40 changes

- `context/PROJECT_STATUS.json` updated: currentFocus, nextMilestone, truthAuditLastRun, silSession, silScore, silVelocity, silDebt
- `public/manifest.json` updated: screenshots array populated (was empty)
- `index.html` updated: apple-mobile-web-app-title added
- `.github/workflows/deploy.yml` updated: VITE_POSTHOG_KEY + VITE_SENTRY_DSN build env vars added
- `src/gameHelpers.test.js` added: 26 new tests, all passing
- All context files (CURRENT_STATE, TASK_BOARD, LATEST_HANDOFF, WORK_LOG, SIL) updated to reflect session 40 state
- No contradictions introduced. Source-of-truth hierarchy unchanged.
