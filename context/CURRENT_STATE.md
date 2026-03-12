# Current State

Build status:
- Build: passing (`npm run build` clean)
- Latest commit: `1220a5d`
- Deployed: live at `https://vaultsparkstudios.com/call-of-doodie/`
- Branch: `main`, up to date with `origin/main`

Current priorities:
1. Playtest new wall layouts + bullet ricochet feel
2. Balance pass on wall count / size (5–7 walls, seeded random)
3. Potential App Store path via Capacitor (researched, not started)

Known issues:
- App.jsx is ~1400+ lines; game loop could be extracted to a custom hook
- No gamepad/controller support
- Mobile action bar may be tight with 6 weapons on very small screens
- Callsign names on leaderboard are not locked — no auth, anyone can use any name
- `starterLoadout` column added to Supabase but only populates on future score submissions (old rows will show no loadout badge)
- Enemies slide along walls (push-out) but do not pathfind around them — they can get briefly stuck in concave wall arrangements

Backend:
- Supabase global leaderboard live (`fjnpzjjyhnpmunfoycrp.supabase.co`)
- RLS enabled: public SELECT + INSERT (score 1–10M), no UPDATE/DELETE
- Table columns: id, name, score, kills, wave, lastWords, rank, bestStreak, totalDamage, level, time, achievements, difficulty, starterLoadout, ts, created_at
- Secrets set in GitHub Actions: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY
