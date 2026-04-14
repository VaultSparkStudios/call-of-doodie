# Improvement Plan

Public-safe roadmap derived from the Session 42 audit.

## Current rating

- Overall: 8.4/10
- Strengths: feature breadth, replay variety, launch readiness, comedy-first identity
- Primary constraints: monolithic runtime architecture, weak post-run coaching, limited server-side plausibility validation, and UI complexity at first contact

## Ranked implementation order

1. Score plausibility validation in `submit-score` so leaderboard trust improves before content expansion
2. Post-run command debrief so every death teaches the player what to do next
3. Front-door strategy guidance so the menu helps players choose a mode/loadout intentionally
4. Build identity layer: archetypes, capstones, stronger synergy fantasy, clearer power spikes
5. Wave director pacing: tension, recovery, elite telegraph rhythm, event cadence
6. Combat readability pass: stronger silhouettes, less visual competition, clearer threat language
7. Economy clarity: route/shop previews, stronger risk-reward communication, less opaque randomness
8. Social retention layer: weekly contracts, rival ghosts, studio seeds, async competition
9. Render/update optimization pass for mobile headroom and safer future content growth
10. Domain refactor of `src/App.jsx` into combat, progression, pacing, rewards, and session modules

## Current execution slice

- Ship the anti-cheat plausibility gate
- Upgrade the death screen into a tactical debrief
- Add menu-side strategic guidance for the selected mode/loadout
- Add a build-identity layer with archetype capstones tied to perk composition
- Thread that archetype model through perk/shop/route UI so the economy teaches stronger decisions
- Record the full roadmap in durable project context so future sessions inherit it
