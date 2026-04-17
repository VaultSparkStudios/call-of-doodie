# Improvement Plan

Public-safe roadmap derived from the Session 43 audit refresh.

## Current rating

- Overall: 8.7/10
- Strengths: feature breadth, replay variety, launch readiness, comedy-first identity, and a stronger trust/feedback baseline than the prior session
- Primary constraints: monolithic runtime architecture, heuristics-based leaderboard validation, UI complexity at first contact, high initial JS weight, and limited telemetry-guided balancing

## Ranked implementation order

0. Run Intelligence Spine: one reusable layer for menu recommendations, post-run diagnosis, rematch/rivalry prompts, balance telemetry, and Studio Hub event shape
1. Domain refactor of `src/App.jsx` into combat, progression, pacing, rewards, and session modules
2. Front-door simplification so the menu recommends the next best action instead of exposing the full system wall immediately
3. Leaderboard trust v2: signed run summaries, event-derived validation, and anomaly logging beyond plausibility envelopes
4. Post-run coaching v2: cause-of-death breakdown, missed-value callouts, and one-click corrective rematches
5. Wave director pacing: tension, recovery, elite telegraph rhythm, authored encounter cadence
6. Combat readability pass: stronger silhouettes, less visual competition, clearer threat language
7. Build identity depth: irreversible forks, stronger archetype capstones, and clearer power spikes
8. Economy clarity v2: route/shop forecasting, stronger risk-reward language, and less opaque randomness
9. Social retention layer: weekly contracts, rival ghosts, studio seeds, async competition
10. Render/update optimization pass for mobile headroom and safer future content growth
11. Telemetry/balance loop: instrument where runs fail, what choices players make, and what advice actually changes behavior
12. Warning-debt cleanup and UI architecture separation so future feature work lands on a cleaner surface

## 2026-04-17 integrated tranche target

- Implement a first production slice of the Run Intelligence Spine so existing systems share the same diagnosis/recommendation language.
- Improve the front door and debrief loop with the shared intelligence output instead of adding another isolated recommendation widget.
- Add telemetry primitives that can feed balance, coaching, rivalry, and Studio Hub/Social Dashboard surfaces without introducing LLM/API token spend.
- Push trust and performance forward with compact event-digest foundations and lazy/deferred non-first-run work.
- Repair local protocol drift enough that startup/action-queue helpers stop being missing-command blockers.

## Next 10 non-human execution steps

1. Continue the `src/App.jsx` split by extracting another self-contained runtime domain instead of growing orchestration logic in place.
2. Turn the front door into a stronger onboarding surface with explicit "why now" guidance, action prioritization, and lower first-contact clutter.
3. Push leaderboard trust from envelope checks to signed run claims, anomaly logging, and clearer server-side rejection semantics.
4. Expand post-run coaching into a true corrective loop: debrief diagnosis, missed-value coaching, follow-through tracking, and fast rematch actions.
5. Finish the combat readability pass so high-pressure waves communicate danger earlier and with less visual competition.
6. Deepen build identity with clearer milestones, stronger doctrine language, and more meaningful archetype commitment.
7. Improve player-facing feedback around score submission, offline fallback, mode stakes, and risk/reward consequences.
8. Add telemetry that captures not only pacing state but also run failure points, choice patterns, and whether coaching changes player behaviour.
9. Extend social rivalry hooks around seeded rematches, challenge-link reuse, and replayable async competition loops.
10. Continue bundle/runtime optimization with a specific focus on reducing the main game chunk and protecting mobile frame budget.

## Current execution slice

- Record the expanded audit and execution sequence in durable project context
- Keep moving the front door from "menu of systems" to "recommended next move plus rationale"
- Harden leaderboard trust without silently degrading into misleading local-save behaviour on rejected competitive runs
- Turn the death screen into a stronger rematch/replay surface rather than a passive result dump
- Continue the `src/App.jsx` domain split by extracting self-contained systems instead of growing the file further
- Treat leaderboard trust, front-door UX, post-run coaching, readability, telemetry, and performance as one linked quality program rather than separate polish buckets

## Last shipped slice

- Durable context updated so the combined roadmap and execution order live in `context/` and `logs/`
- `src/utils/runSubmission.js` now owns run-claim / leaderboard-entry construction as a small but real `src/App.jsx` extraction instead of inlining submit-shape logic in the main component
- `src/storage.js` now distinguishes trusted server rejection from real offline fallback, so competitive runs are not mislabeled as "saved locally" when the server explicitly rejects them
- `issue-run-token` now returns a signed run summary claim, while `submit-score` validates that claim and best-effort logs anomalies to the optional `run_anomalies` table (`supabase/migrations/2026-04-15_run_anomalies.sql`)
- Front-door guidance, build-archetype milestone language, and debrief action telemetry were tightened across `MenuScreen`, `HUD`, `PerkModal`, `WaveShopModal`, `RouteSelectModal`, and `DeathScreen`
- Validation after the slice: targeted tests passing, `npm run lint` clean, `npm run build` passing
