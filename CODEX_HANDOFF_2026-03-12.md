# Codex Handoff — Call of Doodie — 2026-03-12

## Repo

- Name: `call-of-doodie`
- Remote: `https://github.com/VaultSparkStudios/Call-Of-Doodie.git`
- Branch: `main`
- Deploy: push to `main` → GitHub Actions → GitHub Pages

## Public URLs

- Frontend: `https://vaultsparkstudios.com/call-of-doodie/`
- Backend: none (frontend-only game, no server)

## Current build status

- Latest commit: `36f4081`
- Build: passing (`npm run build` clean)
- Deployed: yes, live at public URL above

## Features implemented (all sessions to date)

### Core game
- Canvas-based top-down shooter, React 19 + Vite 6
- 6 weapons: Banana Blaster, Rubber Chicken RPG, Nerf Minigun, Plunger Launcher, Sniper-ator 3000, Spicy Squirt Gun
- 14 enemy types including 3 boss-tier enemies (Mega Karen, Landlord) + Shield Guy, YOLO Bomber, Sergeant Karen
- 4 difficulty modes (Easy / Normal / Hard / INSANE)
- XP + level-up system; perk selection every 3 levels

### Boss system
- Boss waves every 5th wave (Mega Karen 5–9, Landlord 10–14, both 15+)
- Mega Karen: charge attack + phase 2 spread shot
- Landlord: summons tenant enemies every 6 seconds

### New enemies (session 4)
- Shield Guy (wave 10+): 20% damage from front, 160% from behind — visual shield arc
- YOLO Bomber (wave 13+): charges player and explodes on contact for 35 damage
- Sergeant Karen (wave 15+): pulsing aura buffs nearby enemies +35% speed

### Perks & progression
- 12 standard perks + 6 cursed perks (35% chance to appear)
- 2 synergy perks: Bloodlust (bonus with Vampire), Turbo Boots (bonus with Adrenaline)
- 4 starter loadouts: Standard, Glass Cannon, Iron Tank, Speed Freak
- Meta-progression: career points (1/kill), 6 permanent per-run upgrades (cod-meta-v1)

### Arena & obstacles
- 6 static obstacles per run — block player movement, player bullets, and enemy bullets
- Arena boundary with pulsing glow and corner accents

### Daily missions
- 3 LCG-seeded missions per day, tracked in-game, saved on run end

### UI / UX
- Mobile dual-joystick controls with optional auto-aim toggle (🎯 button, persists in localStorage)
- Death animation: enemies float up and fade out instead of instant removal
- Personal best highlights: "🏆 NEW BEST SCORE!" / "🌊 NEW BEST WAVE!" floating text mid-run
- Meta upgrades toast at run start showing active bonuses
- Perk countdown in HUD: "Perk in 2 lvls" / "✨ PERK NOW!"
- Share Score: generates a 1200×630 PNG scorecard, native share on mobile / download on desktop
- Leaderboard (localStorage, top 100)
- 38 achievements
- Career stats panel, daily missions panel, meta upgrades shop — all in main menu

## Architecture notes

- All game logic: single `gameLoop` useCallback in `src/App.jsx` (~1300 lines)
- Refs for game loop; React state for UI only
- localStorage keys: `cod-lb-v5`, `cod-career-v1`, `cod-meta-v1`, `cod-missions-YYYY-MM-DD`, `cod-autoaim`

## Required GitHub setup

- Settings → Pages: Source = **GitHub Actions** ✅ (already configured)
- No secrets required for Pages deployment
- No backend variables required (frontend-only)

## Workflow

| File | Status |
|------|--------|
| `.github/workflows/deploy.yml` | Active — builds and deploys on push to `main` |

## Known issues / next steps

- Leaderboard is localStorage only (no global backend)
- App.jsx is ~1300 lines — game loop extraction to a custom hook is a future refactor
- No gamepad/controller support
- Capacitor/PWA wrapping for App Store is a future project (see brainstorm notes)
- Obstacles don't affect enemy pathfinding (enemies walk through walls — by design for now)

## Last validation

```bash
npm run build   # clean
git push origin main  # deployed 2026-03-12
```
