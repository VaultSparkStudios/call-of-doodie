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
- Rework the menu around a recommended-next-action front door, fast Daily access, and progressive disclosure for deep systems
- Remove static imports that defeat lazy-loading so leaderboard/settings/achievements panels split into real async chunks
- Continue the `src/App.jsx` domain split by extracting self-contained systems instead of growing the file further
- Treat leaderboard trust, front-door UX, post-run coaching, readability, and performance as one linked quality program rather than separate polish buckets

## Last shipped slice

- Durable context updated so the combined roadmap and execution order live in `context/` and `logs/`
- `src/components/MenuScreen.jsx` now leads with a recommended-next-action hero plus Daily Challenge, Challenge Friend, and a progressive `Command Center`
- Shared panel loading is now real rather than nominal: App/Pause/Death lazily load Achievements, Settings, and Leaderboard surfaces
- `src/systems/shopOptions.js` now owns wave-shop and coin-shop option generation as the first concrete `src/App.jsx` domain extraction
- Validation after the slice: `npm test` 116/116, `npm run lint` clean, `npm run build` passing, main bundle reduced from ~800.74 kB to ~773.89 kB with new async UI chunks emitted
