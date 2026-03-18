# Call of Doodie

A Call of Duty parody top-down arcade shooter. Play free in your browser.

**Live:** https://vaultsparkstudios.com/call-of-doodie/

---

## What it is

Survive endless waves of absurd enemies using increasingly ridiculous weapons. Each run is different thanks to a roguelite perk system, randomized daily missions, and 8 map themes. Pick your difficulty, choose a starter loadout, and see how far you get.

- 10 weapons — Banana Blaster, RPG, Railgun, Boomerang Blaster, and more
- 15 enemy types with elite variants and boss waves every 5th wave
- 30+ perks with cursed options and synergy combos
- Global leaderboard (Supabase), career stats, 38 achievements
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
```

Env vars for local dev (create `.env.local`, gitignored):
```
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

## Deploy

Push to `main` — GitHub Actions builds and deploys to GitHub Pages automatically. Supabase env vars are injected at build time via GitHub Actions secrets.

---

## Project layout

```
src/
├── App.jsx          # Game loop + state orchestrator (~1400 lines)
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
