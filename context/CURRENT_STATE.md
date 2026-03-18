# Current State

Build status:
- Build: passing (`npm run build` clean)
- Latest commit: pending push (session 7 changes, pre-commit)
- Deployed: live at `https://vaultsparkstudios.com/call-of-doodie/`
- Branch: `main`, uncommitted changes

Current priorities:
1. Playtest ricochet feel + wall layouts (in progress — ricochet life fix applied)
2. Balance pass on wall count / size if needed
3. Potential App Store path via Capacitor (researched, not started)

Known issues:
- App.jsx is ~1400+ lines; game loop could be extracted to a custom hook
- No gamepad/controller support
- Mobile action bar may be tight with 6 weapons on very small screens
- Callsign locking is localStorage-only (no server-side enforcement — RLS still allows any name)
- `starterLoadout` column added to Supabase but only populates on future score submissions (old rows will show no loadout badge)
- Enemies slide along walls (push-out) but do not pathfind around them — concave wall arrangements can still slow them

Backend:
- Supabase global leaderboard live (`fjnpzjjyhnpmunfoycrp.supabase.co`)
- RLS enabled: public SELECT + INSERT (score 1–10M), no UPDATE/DELETE
- Table columns: id, name, score, kills, wave, lastWords, rank, bestStreak, totalDamage, level, time, achievements, difficulty, starterLoadout, ts, created_at
- Secrets set in GitHub Actions: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY
