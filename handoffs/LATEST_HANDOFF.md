# Latest Handoff

Last updated: 2026-03-12

What was completed:
- Session 3: Boss unique mechanics (Mega Karen charge + spread, Landlord tenant summon), daily missions, meta-progression, cursed perks, MenuScreen modals for missions/upgrades
- Session 4: 2 new weapons (Sniper-ator 3000, Spicy Squirt Gun), 3 new enemies (Shield Guy, YOLO Bomber, Sergeant Karen), 6 arena obstacles, death animations, arena border, synergy perks, starter loadouts, personal best highlights, meta toast, perk countdown HUD, auto-aim opt-in fix
- Session 5 (closeout): Committed and pushed Studio System Template folders (context/, handoffs/, logs/, prompts/) that were created but not yet pushed at end of session 4

What is mid-flight:
- Nothing — all changes are committed, built, and deployed (`19b9f51`)

What to do next:
1. Playtest new content — especially obstacle placement, Shield Guy shield arc direction, YOLO Bomber explosion radius
2. Balance pass on Sniper-ator 3000 (may be too powerful) and Spicy Squirt Gun (very short range)
3. Consider global leaderboard (Supabase free tier) — highest retention impact missing feature

Important constraints:
- `npm run build` must pass before any push
- Vite base must stay `/call-of-doodie/` (lowercase) in vite.config.js
- All game logic runs in a single RAF loop in App.jsx — use refs, not state, for loop-internal values
- localStorage keys are versioned (e.g. `cod-lb-v5`) — bump version if schema changes
