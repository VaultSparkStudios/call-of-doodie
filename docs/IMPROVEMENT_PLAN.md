# Improvement Plan

Public-safe roadmap derived from the Session 43 audit refresh.

## Current rating

- Overall: 8.7/10
- Strengths: feature breadth, replay variety, launch readiness, comedy-first identity, and a stronger trust/feedback baseline than the prior session
- Primary constraints: monolithic runtime architecture, heuristics-based leaderboard validation, UI complexity at first contact, high initial JS weight, and limited telemetry-guided balancing

## Ranked implementation order

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

## Current execution slice

- Record the expanded audit and execution sequence in durable project context
- Strip helper logic out of component files where it blocks fast-refresh and inflates coupling
- Lazy-load non-core menu surfaces so first-contact payload and UI cost shrink modestly before deeper code-splitting
- Continue the `src/App.jsx` domain split by extracting self-contained systems instead of growing the file further
- Treat leaderboard trust, front-door UX, post-run coaching, readability, and performance as one linked quality program rather than separate polish buckets
