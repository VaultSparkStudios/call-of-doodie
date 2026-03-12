# Latest Handoff

Last updated: 2026-03-12 (Session 6)

## What was completed this session

### Performance fixes (lag at deep waves)
- Particle hard cap: MAX_PARTICLES = 200 (was unbounded — main lag cause at wave 20+)
- FloatingText cap: MAX_FLOAT_TEXTS = 30 (big texts always get through, small ones dropped when full)
- DyingEnemy animation cap: MAX_DYING_ANIM = 20
- Wave enemy count capped at 40 (was `5 + wave * 3` unbounded)
- Bullet trail particles throttled to every 2nd frame
- Nuke particle burst limited to first 12 enemies only

### Boss ability ramp-up (per wave tier)
- Wave 20+: Mega Karen gets Shield Pulse (3s immunity every 8s, cyan glow)
- Wave 25+: Landlord gets Minion Surge (4 tenants, 4s CD vs normal 6s)
- Wave 30+: Both bosses get Enrage at 33% HP (1.8× speed, 2× fire rate, orange aura)
- Wave 35+: Mega Karen gets Teleport Blink (warps near player every 8s)
- Wave 40+: Landlord gets Rent Nuke (AoE pulse every 10s, damages player within 220px)
- Boss wave announcement text now shows active abilities for that tier

### Supabase global leaderboard
- Installed @supabase/supabase-js
- Created src/supabase.js (createClient, null fallback if env vars missing)
- Updated storage.js loadLeaderboard + saveToLeaderboard to use Supabase with localStorage fallback
- GitHub Actions workflow updated to inject VITE_SUPABASE_* secrets into build
- GitHub secrets set via gh CLI: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY
- .env.local created locally (gitignored via *.local)
- Supabase table created with RLS: public SELECT + INSERT (score 1–10M only)

### Leaderboard UI updates
- Title: "HALL OF SHAME" → "GLOBAL LEADERBOARD"
- Difficulty filter tabs (ALL / EASY / NORMAL / HARD / INSANE) with entry counts
- Difficulty column per row (color-coded badge)
- Kills column added (was stored, not displayed)
- Starter loadout emoji badge in player name cell (⚖️💀🛡️⚡)
- Last Words moved to hover tooltip

### Wall randomization
- Obstacles are now seeded-random per run (5–7 walls)
- Uses LCG seeded from runSeed for reproducible layouts
- Guaranteed 110px clear spawn zone at center
- Overlap check prevents walls stacking
- Mix of horizontal and vertical walls, varied sizes

### Bullet ricochet
- All player bullets except RPG get 1 wall bounce (bouncesLeft field)
- Reflect logic: detect which face was hit via pre-collision position, flip vx or vy
- Bullet repositioned from pre-hit point with new trajectory
- White spark particle on bounce
- RPG: 0 bounces (would be OP)

### Enemy-wall collision
- Enemies push out from walls using closest-point-on-rect math
- Applied after all movement (normal movement, boss charge, zigzag, teleport)
- Arena bounds clamp after push-out to prevent corner oscillation

### submitScore
- starterLoadout added to entry object and useCallback deps
- Supabase table has starterLoadout column (ALTER TABLE run manually)

## What is mid-flight
- Nothing — all changes committed, built, and deployed (`1220a5d`)

## What to do next
1. Playtest wall ricochet feel — may want to adjust bullet life extension on bounce if it feels too short
2. Check if enemies get visibly stuck in tight wall gaps — if so, consider a small jitter on push-out
3. Add Supabase anonymous auth if name impersonation becomes a problem
4. Consider enemy pathfinding (A* or flow field) as the next major gameplay upgrade

## Important constraints
- `npm run build` must pass before any push
- Vite base must stay `/call-of-doodie/` (lowercase) in vite.config.js
- All game logic runs in a single RAF loop in App.jsx — use refs, not state, for loop-internal values
- localStorage keys are versioned (e.g. `cod-lb-v5`) — bump version if schema changes
- Supabase anon key is public (in JS bundle) — RLS policies are the only protection layer
- Never commit .env.local (gitignored via *.local in .gitignore)
