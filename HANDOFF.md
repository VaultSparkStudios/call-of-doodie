# Session Handoff — Call-Of-Doodie

## Project Overview

**Call-Of-Doodie** is a Call of Duty parody browser-based shooter game built with Vite + React. It is deployed via GitHub Pages.

- **Repo**: `VaultSparkStudios/Call-Of-Doodie`
- **Default branch**: `main`
- **Deployment**: GitHub Pages via GitHub Actions (`.github/workflows/deploy.yml`)
- **Domain**: vaultsparkstudios.com (custom domain configured)

## Tech Stack

| Layer     | Technology       |
|-----------|------------------|
| Framework | React 19         |
| Bundler   | Vite 6           |
| Language  | JavaScript (JSX) |
| Hosting   | GitHub Pages      |

## Project Structure

```
Call-Of-Doodie/
├── index.html
├── package.json
├── vite.config.js
├── .github/workflows/deploy.yml
├── src/
│   ├── main.jsx          # Entry point
│   └── App.jsx           # Main app (~122KB, single-file game)
└── dist/                 # Build output
```

> **Note**: The entire game logic lives in `src/App.jsx` — a large single-file React component.

## Scripts

```bash
npm run dev      # Local dev server
npm run build    # Production build
npm run preview  # Preview production build
```

## Git Configuration

- **user.name**: `VaultSparkStudios`
- **user.email**: `founder@vaultsparkstudios.com`

## Recent Development History

| Commit | Description |
|--------|-------------|
| `5f4d0fe` | Rename Bestiary to Most Wanted List, fix menu exit bug, improve UI/UX |
| `3e03454` | Fix React hooks violation causing white screen on menu |
| `cd0f800` | Fix menu cutoff, add responsive design, restore missing features |
| `2eea24c` | Implement boss shield ability and enhanced boss rendering |
| `c6ff42a` | Fix leaderboard, respawn system, add Guardian Angel power-up and difficulty levels |
| `fc40772` | Set up Vite + React project for GitHub Pages deployment |

## Current Branch State

- **Active branch**: `claude/bestiary-to-wanted-list-ssZil` (latest work)
- **master**: exists locally (may be behind `main`)
- **main**: default remote branch, deploys to GitHub Pages on push

## Key Features Implemented

- Home screen menus
- Career stats tracking
- Weapon upgrades system
- Boss waves with shield abilities
- Leaderboard
- Respawn system with Guardian Angel power-up
- Difficulty levels
- "Most Wanted List" (renamed from Bestiary)

## Known Considerations

- `src/App.jsx` is very large (~122KB). Future work should consider splitting it into smaller components.
- The project uses React 19 — ensure hook rules are followed (prior white-screen bug was caused by hooks violation).
- Deployment is automatic on push to `main` via GitHub Actions.

## Transition Notes for Terminal-Based AI Agent

1. **Authentication**: Claude Code CLI OAuth token was expired as of last session — run `/login` to re-authenticate.
2. **Local setup**: Run `npm install` if `node_modules` is missing or stale.
3. **Testing changes**: Use `npm run dev` to test locally before pushing.
4. **Deploying**: Merge feature branch into `main` and push to trigger GitHub Pages deploy.
5. **Branch naming**: Claude Code branches follow the pattern `claude/<description>-<sessionId>`.
