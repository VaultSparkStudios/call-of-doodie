# Task Board

Public-safe launch roadmap summary.

## Human Action Required
- [ ] Physical launch QA — verify PWA install prompt/accept flow on a real mobile/browser combination
- [ ] Physical launch QA — verify one real gamepad/browser combo end-to-end
- [ ] Create Itch.io listing and publish the prepared launch copy package from `docs/LAUNCH_EXECUTION.md`
- [ ] Add `VITE_POSTHOG_KEY` to GitHub repo Settings → Secrets → Actions (workflow already wired in deploy.yml)
- [ ] Add `VITE_SENTRY_DSN` to GitHub repo Settings → Secrets → Actions (workflow already wired in deploy.yml)
- [ ] Apply `supabase/migrations/2026-04-14_kofi_webhook.sql` in the Supabase SQL editor (creates `kofi_events` audit table)
- [ ] Set `KOFI_VERIFICATION_TOKEN` as a Supabase function secret, then paste the webhook URL into Ko-fi → More → Settings → API & Webhooks

## Now
- [ ] [SIL:2⛔] HomeV2 Lighthouse measurement — capture real LCP/CLS deltas vs legacy MenuScreen on production, confirm ≥200ms LCP improvement before removing v1 fallback
- [ ] [SIL:1] HomeV2 analytics funnel — compare `home_v2_deploy` vs legacy `front_door_action` completion rates after 48h of traffic
- [ ] [SIL:1] HomeV2 mobile polish — verify DEPLOY split-button layout on iPhone SE (375px) and dismiss intel-ticker sticks across sessions
- [ ] [SIL:2⛔] Domain refactor of `src/App.jsx` — split combat, progression, rewards, pacing, and session orchestration into dedicated modules
- [ ] [SIL:2⛔] Front-door simplification — continue refining the recommended-next-action flow beyond the shipped action stack + "why now" layer with even stronger onboarding and lower first-contact clutter
- [ ] [SIL:2⛔] Leaderboard trust v2 — continue beyond signed run claims + anomaly logging into richer server-side recomputation and review tooling
- [ ] [SIL:2⛔] Post-run coaching follow-through — measure which debrief actions players actually take and tighten replay/rematch loops from that data
- [ ] [SIL:2⛔] Render/update optimization pass — continue beyond the shipped chunk split cleanup into runtime instrumentation and mobile frame-budget policy
- [ ] [SIL:1] Level-flow cadence pass, slice 2 — tune reward cadence further with safer mutation/shop/perk sequencing and verify live feel after the new perk banking policy
- [ ] [SIL:1] Build identity depth — move beyond capstones into stronger doctrine milestones, sharper commitment, and more irreversible forks
- [ ] [SIL:1] Bundle split cleanup — keep pushing the initial chunk down after the shipped panel split cleanup
- [ ] [SIL:1] Balance telemetry v2 — capture first-death wave, mode abandonment, perk/shop pick rates, and debrief follow-through
- [ ] [SIL:1] User feedback clarity pass — explain local-save fallback, score rejection reasons, mode stakes, and mutation/shop consequences in plainer language

## Next
- [ ] Optional: Ko-fi → leaderboard end-to-end test once the webhook is live and a real donation flows through
- [ ] [SIL:1] Economy clarity pass, slice 2 — deeper route forecasting, reroll/lock mechanics, and stronger shop tradeoff language
- [ ] Social retention layer — weekly contracts, rival ghosts, and studio seeds
- [ ] Social rivalry loop — featured seeds, revenge links, rival ghosts, seeded rematch reuse, and async competitions that feel native to the game
- [ ] Telemetry/balance loop — instrument first-death wave, abandonment points, perk picks, route picks, and debrief follow-through
- [ ] [SIL:1] Replace launch-asset SVG placeholders with real PNG gameplay screenshots — improves Itch.io listing fidelity and Chrome install-card presentation
- [ ] Meta clarity pass — recommended next unlock, recommended spend, and player weakness-aware loadout advice
- [ ] Security/trust v2 ops surface — anomaly review logs and clearer rejection telemetry around suspicious leaderboard submissions
- [ ] App-runtime architecture pass — extract another production domain from `src/App.jsx` after the run-submission slice
- [ ] Roast Director — rule-based comedic announcer/callout layer tied to structured run events, with rate limits and player control
- [ ] Studio Hub/Social Dashboard event contract — normalize game session, challenge, anomaly, debrief, and rivalry events for downstream Studio OS surfaces
## Done
- [x] [SIL:3⛔] Run Intelligence Spine — reusable intelligence foundation shipped across front door, post-run diagnosis, rematch/rivalry prompts, balance telemetry, Studio event shape, and trust digest slices
- [x] [SIL:3⛔] Integrated refinement tranche — coordinated slices shipped across App extraction, coaching, telemetry, trust, performance, rivalry, roast/personality, and protocol repair
- [x] [SIL] Run Intelligence Spine, slice 2 — menu recommendations now consider recent run history and unresolved rivalry losses instead of only current mode/loadout context
- [x] [SIL] Leaderboard trust v3, slice 1 — compact event digest upgraded to v2 timeline bands, and the submit Edge Function validates timeline coherence before accepting leaderboard rows
- [x] [SIL] Studio Hub/Social Dashboard event contract, slice 1 — local `vaultspark.game-event.v1` event persistence now captures front-door and debrief intelligence events for downstream Studio surfaces
- [x] [SIL] Rivalry network, slice 1 — local rivalry history records seed, target score, win/loss, delta, mode, difficulty, and wave, then feeds rematch recommendations back into the menu
- [x] [SIL] App-domain extraction, slice 6 — score/session submission now routes through `buildSessionSubmission`, keeping the digest-aware leaderboard payload out of `App.jsx`
- [x] [SIL] Run Intelligence Spine, slice 1 — `src/utils/runIntelligence.js` now centralizes menu recommendations, post-run diagnosis, rivalry prompts, compact trust digests, Studio event shape, and a first rule-based roast callout layer
- [x] [SIL] Integrated refinement tranche, slice 1 — menu run intel, death-screen run intelligence, debrief telemetry, event-digest score submission, DeathScreen code-splitting, and startup/action-queue protocol repair shipped together
- [x] [SIL] Protocol repair — `scripts/ops.mjs action-queue`, `scripts/ops.mjs blocker-preflight`, `scripts/render-startup-brief.mjs`, and `scripts/validate-brief-format.mjs` now exist and pass local dry runs
- [x] [SIL] Bundle split cleanup, slice 2 — `DeathScreen` is lazy-loaded from `App.jsx`; production build now emits a separate `DeathScreen` chunk and reduces the main app chunk
- [x] Phase 1 launch validation — live Edge Function health check added at `scripts/health-check.mjs` and passed against production (`issue-run-token` + `submit-score`)
- [x] Phase 1 launch validation — minimal launch smoke test added at `src/App.launch.test.jsx` and passing in the full suite
- [x] Phase 1 live QA (terminal-verifiable) — repeatable live site checks added at `scripts/live-site-check.mjs`
- [x] Phase 1 live QA (terminal-verifiable) — `npm run launch:qa` passes against the live backend and deployed site shell/PWA assets
- [x] Source-controlled the Cloudflare Worker / CSP config used by the live deployment path in `cloudflare/`
- [x] Launch execution package prepared in `docs/LAUNCH_EXECUTION.md` with screenshot shot list, Itch.io copy, launch sequence, and telemetry decision
- [x] Added `npm run launch:verify` to combine launch smoke, live function checks, and live site verification
- [x] Added launch-surface visibility checks via `scripts/launch-surface-check.mjs`
- [x] Added shared leaderboard audit via `scripts/shared-leaderboard-check.mjs`
- [x] Prepared a ready-to-upload launch media pack in `public/launch-assets/`
- [x] Verified launch-surface visibility on production: homepage, sitemap, live page branding, and `/games/` all reference Call of Doodie
- [x] Verified readable shared-table state on production: no non-`cod` rows found in the latest 200 leaderboard entries
- [x] Confirmed Edge Function redeploy succeeded (deploy-supabase-function.yml — last run 2026-04-02, success)
- [x] Validated live leaderboard submit end-to-end: `npm run health:check` → 5/5 assertions passed against production
- [x] Gameplay smoke test — `src/gameHelpers.test.js` (26 tests: spawnEnemy wave 1–3 logic, spawnBoss, BOSS_ROTATION, mutation flag propagation)
- [x] Wired VITE_POSTHOG_KEY + VITE_SENTRY_DSN into deploy.yml build env
- [x] PWA manifest screenshots populated — 5 screenshots added to `public/manifest.json` (4 wide/desktop, 1 narrow/mobile)
- [x] `apple-mobile-web-app-title` added to `index.html` for correct iOS home screen label
- [x] [SIL] PNG icon build pipeline — `scripts/generate-icons.mjs` (sharp), `icon-192.png` + `icon-512.png` committed, manifest + index.html wired, sw.js bumped to `cod-v4`, `prebuild` hook ensures PNGs stay in sync with `icon.svg`
- [x] [SIL] Ko-fi webhook Edge Function — `supabase/functions/kofi-webhook/index.ts` with verification-token validation, idempotent `kofi_events` audit log, callsign extraction from Ko-fi `message`, auto-deploy wired into `.github/workflows/deploy-supabase-function.yml`, migration `2026-04-14_kofi_webhook.sql` added
- [x] CI stability — raised Vitest `testTimeout` to 15000ms in `vite.config.js` after observing launch-smoke variance (1.2s–5.5s) near the 5s default
- [x] Session 42 audit recorded in `docs/IMPROVEMENT_PLAN.md` with ranked implementation order for trust, UX, depth, speed, and architecture
- [x] Session 42 execution slice expanded: perk-driven build archetypes now unlock capstone bonuses, and perk/shop/route surfaces now mark build-fit recommendations
- [x] [SIL] Score plausibility validation in Edge Function — reject runs whose kills/damage ratios exceed realistic ceilings for the reported wave
- [x] [SIL] Upgrade the death screen into a tactical debrief — show build identity, strengths, and next-step guidance after each run
- [x] [SIL] Add menu-side command briefing — surface mode/loadout strategy and weekly mutation context before deploy
- [x] [SIL] Build identity layer — archetypes/capstones so runs feel more memorable than “more perks”
- [x] [SIL] Economy clarity pass, slice 1 — perk/shop/route screens now signal build fit instead of presenting flat choices
- [x] [SIL] Session 43 architecture/perf groundwork — extracted perk/route helper logic from component files, lazy-loaded non-core menu panels, fixed RouteSelect focus outline bug, and reduced UI-layer warning debt
- [x] [SIL] Session 43 closeout — cleared the remaining `src/App.jsx` lint warnings; validation baseline is now lint-clean (`0` warnings / `0` errors)
- [x] Session 43 audit expansion — combined refinement roadmap now explicitly ranks architecture split, front-door simplification, pacing/readability, social rivalry, telemetry, trust, and bundle cleanup as one quality program
- [x] [SIL] Front-door simplification, slice 1 — menu now leads with a recommended-next-action card plus Daily Challenge, Challenge Friend, and a progressive `Command Center` reveal for deep systems
- [x] [SIL] Front-door action stack — `Play Now`, `Daily Challenge`, `Best Next Upgrade`, and `Challenge Friend` now run through a reusable priority stack backed by `src/utils/menuGuidance.js`
- [x] [SIL] Bundle split cleanup, slice 1 — converted App/Pause/Death panel imports to real `lazy()` boundaries so the build now emits separate Achievements, Settings, and Leaderboard chunks
- [x] [SIL] App domain extraction, slice 1 — wave shop and coin shop option generation moved from `src/App.jsx` into `src/systems/shopOptions.js`
- [x] [SIL] App domain extraction, slice 2 — leaderboard/run-claim payload shaping moved into `src/utils/runSubmission.js` instead of staying embedded in `src/App.jsx`
- [x] [SIL] App domain extraction, slice 3 — progression reward sequencing now routes through `src/systems/progressionFlow.js` instead of being hand-wired inline in `src/App.jsx`
- [x] [SIL] App domain extraction, slice 4 — perk synergy resolution and archetype capstone effects now live in `src/systems/perkResolution.js` instead of being embedded inside the perk-pick callback
- [x] [SIL] App domain extraction, slice 5 — regular shop and coin-shop consequence rules now live in `src/systems/shopResolution.js` instead of long inline `switch` blocks in `src/App.jsx`
- [x] Public-facing copy refresh — README, launch/store copy, manifest metadata, OG preview text, and in-product share copy now match the current shipped feature set
- [x] Closeout wrapper hardening — `scripts/closeout-autopilot.mjs` now uses argv-based git execution and top-level error handling so non-interactive closeout runs finish their cleanup/status path reliably
- [x] [SIL] Wave director pacing — non-boss waves now run through scouting/pressure/climax/recovery pacing plans with alive-budget-aware spawn cadence, telegraphed elite spikes, and clearer incoming-wave identity
- [x] [SIL:2⛔] Post-run coaching v2 — death screen now includes collapse reason, missed-value hints, and seeded corrective rematch guidance
- [x] [SIL] Boss-wave anticipation pass — boss preview/cutscene layer now includes concrete dodge verbs and escort-pressure guidance
- [x] [SIL] Director telemetry hooks — wave-director stage transitions and pressure bands now emit telemetry snapshots for future tuning
- [x] [SIL] Trust v2 groundwork — `issue-run-token` now returns a signed run summary claim, `submit-score` validates it, and optional anomaly logging is wired via `supabase/migrations/2026-04-15_run_anomalies.sql`
- [x] [SIL] Score-submit clarity pass — rejected competitive runs now report server reasons instead of being mislabeled as local-save fallbacks
- [x] [SIL] Build-identity milestone pass — HUD/perk/shop/route surfaces now explain doctrine state and the next archetype milestone
- [x] [SIL] Debrief follow-through telemetry — replay/copy actions and score-submit outcomes now emit analytics events
- [x] [SIL:1] Combat readability pass, slice 1 — dangerous enemies now get stronger contrast rings, threat brackets, and ranged prefire telegraphs in `src/drawGame.js`
- [x] [SIL:1] Level-flow cadence pass, slice 1 — perk rewards are now banked during combat, opened at the next wave-clear safe point, exposed in the HUD, and shifted onto a softer perk-breakpoint curve via `src/utils/levelFlow.js`
- [x] Protocol sync — start/closeout prompts, prompt templates, mode/secrets helpers, and local closeout wrapper now align with the latest Studio OS/ops workflow without pointing at missing repo-local commands

## Deferred
- [ ] Discord invite/community link when the community entry point is ready

## Deferred to Project Agents

- cross-repo item owned by another repo agent:
