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
- [ ] [SIL:2⛔] Domain refactor of `src/App.jsx` — split combat, progression, rewards, pacing, and session orchestration into dedicated modules
- [ ] [SIL:2⛔] Front-door simplification — continue refining the new recommended-next-action menu flow with even stronger mode/onboarding guidance
- [ ] [SIL:2⛔] Leaderboard trust v2 — signed run summaries, server-side recomputation, and anomaly logging beyond heuristic plausibility checks
- [ ] [SIL:2⛔] Post-run coaching v2 — cause-of-death readout, missed-value hints, and seeded corrective rematch flows
- [ ] [SIL:2⛔] Render/update optimization pass — continue beyond the shipped chunk split cleanup into runtime instrumentation and mobile frame-budget policy
- [ ] [SIL:1] Combat readability pass — clearer enemy silhouettes, less visual competition, and stronger threat language during crowded fights
- [ ] [SIL:1] Front-door action stack — `Play Now`, `Daily Challenge`, `Best Next Upgrade`, and `Challenge Friend` should dominate first contact
- [ ] [SIL:1] Bundle split cleanup — keep pushing the initial chunk down after the shipped panel split cleanup
- [ ] [SIL:1] Balance telemetry v2 — capture first-death wave, mode abandonment, perk/shop pick rates, and debrief follow-through
- [ ] [SIL:1] User feedback clarity pass — explain local-save fallback, score rejection reasons, mode stakes, and mutation/shop consequences in plainer language

## Next
- [ ] [SIL:1] Build identity depth — irreversible forks, stronger archetype capstones, and clearer build milestones
- [ ] Optional: Ko-fi → leaderboard end-to-end test once the webhook is live and a real donation flows through
- [ ] [SIL:1] Economy clarity pass, slice 2 — deeper route forecasting, reroll/lock mechanics, and stronger shop tradeoff language
- [ ] Social retention layer — weekly contracts, rival ghosts, and studio seeds
- [ ] Social rivalry loop — featured seeds, revenge links, rival ghosts, and async competitions that feel native to the game
- [ ] Telemetry/balance loop — instrument first-death wave, abandonment points, perk picks, route picks, and debrief follow-through
- [ ] [SIL:1] Replace launch-asset SVG placeholders with real PNG gameplay screenshots — improves Itch.io listing fidelity and Chrome install-card presentation
- [ ] Meta clarity pass — recommended next unlock, recommended spend, and player weakness-aware loadout advice
- [ ] Security/trust v2 ops surface — anomaly review logs and clearer rejection telemetry around suspicious leaderboard submissions
- [ ] [SIL] Boss-wave anticipation pass — teach concrete boss attack verbs and escort pressure in the preview/cutscene layer instead of relying on generic danger copy
- [ ] [SIL] Director telemetry hooks — record stage transitions, alive-budget saturation, and elite-climax deaths so pacing can be tuned from real run data after launch

## Done
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
- [x] [SIL] Bundle split cleanup, slice 1 — converted App/Pause/Death panel imports to real `lazy()` boundaries so the build now emits separate Achievements, Settings, and Leaderboard chunks
- [x] [SIL] App domain extraction, slice 1 — wave shop and coin shop option generation moved from `src/App.jsx` into `src/systems/shopOptions.js`
- [x] [SIL] Wave director pacing — non-boss waves now run through scouting/pressure/climax/recovery pacing plans with alive-budget-aware spawn cadence, telegraphed elite spikes, and clearer incoming-wave identity
- [x] Protocol sync — start/closeout prompts, prompt templates, mode/secrets helpers, and local closeout wrapper now align with the latest Studio OS/ops workflow without pointing at missing repo-local commands

## Deferred
- [ ] Discord invite/community link when the community entry point is ready

## Deferred to Project Agents

- cross-repo item owned by another repo agent:
