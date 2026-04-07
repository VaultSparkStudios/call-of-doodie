# Call of Doodie

A comedy-first top-down roguelite shooter. Play free in your browser.

**Live:** https://vaultsparkstudios.com/call-of-doodie/

---

## What it is

Survive endless waves of absurd enemies using increasingly ridiculous weapons. Each run is different thanks to perk builds, challenge modes, seeded runs, daily missions, and multiple difficulty paths. Pick your loadout, chase the leaderboard, and see how far you get.

- 12 weapons — Banana Blaster, RPG, Railgun, Boomerang Blaster, and more
- 22 enemy types including bosses, elites, hazards, and a secret developer encounter
- 27+ perks plus cursed perks, starter loadouts, and synergy combos
- 7 run modes: Normal, Score Attack, Daily Challenge, Cursed Run, Boss Rush, Speedrun, and Gauntlet
- Global leaderboard (Supabase), career stats, meta progression, and 57+ achievements
- Mobile and desktop — gamepad supported
- PWA installable

---

## Tech stack

| Layer    | Technology                         |
|----------|------------------------------------|
| Framework | React 19                          |
| Bundler  | Vite 6                             |
| Language | JavaScript (JSX)                   |
| Hosting  | GitHub Pages (auto-deploy on push) |
| Backend  | Supabase (leaderboard + anon auth) |
| Audio    | Web Audio API (zero audio files)   |

---

## Development

```bash
npm install
npm run dev      # local dev server at http://localhost:5173/call-of-doodie/
npm run build    # production build — must pass before any push
npm run preview  # preview production build
npm run launch:verify  # launch smoke + live function check + live site check
```

Env vars for local dev (create `.env.local`, gitignored):
```
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
VITE_POSTHOG_KEY=...   # optional
VITE_SENTRY_DSN=...    # optional
```

Audit them locally:
```bash
npm run audit:env:site
```

## Deploy

Push to `main` — GitHub Actions builds and deploys to GitHub Pages automatically.

Client build secrets required in GitHub Actions:
```text
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
```

Optional client build secrets:
```text
VITE_POSTHOG_KEY
VITE_SENTRY_DSN
```

The hardened leaderboard path also requires Supabase-side setup:

1. Run the DB migration:
```text
supabase/migrations/2026-03-30_launch_security.sql
```

2. Set Supabase Edge Function runtime secrets:
```text
SUPABASE_URL
SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
```

3. Deploy the functions:
```bash
supabase functions deploy issue-run-token --project-ref <project-ref>
supabase functions deploy submit-score --project-ref <project-ref>
```

4. Optional CI/CD for function deploys via GitHub Actions:
```text
SUPABASE_ACCESS_TOKEN
SUPABASE_PROJECT_REF
```

Audit env groups locally:
```bash
npm run audit:env
npm run audit:env:site
npm run audit:env:functions
npm run audit:env:deploy
```

---

## Project layout

```
src/
├── App.jsx          # Game loop + state orchestrator
├── drawGame.js      # Pure render function — extracted from App.jsx
├── gameHelpers.js   # spawnEnemy, spawnBoss — pure helpers
├── constants.js     # WEAPONS, ENEMY_TYPES, PERKS, ACHIEVEMENTS, DIFFICULTIES, META_UPGRADES
├── settings.js      # Settings defaults, load/save helpers, presets
├── storage.js       # Leaderboard, career stats, meta-progression, daily missions
├── supabase.js      # Supabase client + anonymous auth
├── sounds.js        # All audio synthesized via Web Audio API
└── components/      # React UI components (HUD, menus, modals, panels)
```

See `AGENTS.md` for agent/contributor instructions and `context/` for architecture decisions and current state.
Launch execution details live in `docs/LAUNCH_EXECUTION.md`.
