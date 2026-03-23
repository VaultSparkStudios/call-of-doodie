# Agent Instructions — Call of Doodie

## Studio identity

- Studio site repo: `VaultSparkStudios/VaultSparkStudios.github.io`
- Studio public URL: `https://vaultsparkstudios.com/`
- Game repos live under: `VaultSparkStudios/`

## Per-game identity

- Repo name: `call-of-doodie`
- Public slug: `call-of-doodie`
- Public URL: `https://vaultsparkstudios.com/call-of-doodie/`
- Gameplay origin: `https://play-call-of-doodie.vaultsparkstudios.com` (reserved — no backend yet, frontend-only game)
- API origin: `https://api-call-of-doodie.vaultsparkstudios.com` (reserved — no backend yet)

## Deployment standards

Before making deployment, domain, GitHub Pages, or studio-site integration
changes, read these files from the studio repo first:

- `docs/STUDIO_DEPLOYMENT_STANDARD.md`
- `docs/STUDIO_BACKEND_PLAN.md`
- `docs/DEPLOY_PAGES.md`
- `docs/templates/deploy-pages.template.yml`
- `docs/templates/GAME_LAUNCH_CHECKLIST.template.md`

## Required behavior

- Treat `STUDIO_DEPLOYMENT_STANDARD.md` as the default studio-wide policy.
- Game repo name and public slug are identical: `call-of-doodie`.
- The Vite base path must stay `/call-of-doodie/` (lowercase) in `vite.config.js`.
- GitHub Pages source is set to **GitHub Actions** (already configured).
- `npm run build` must pass before any commit is pushed.
- Update `CODEX_HANDOFF_YYYY-MM-DD.md` after any significant session of work.
- Never commit `.env` files, credentials, or large binaries.
- `context/LATEST_HANDOFF.md` is the single authoritative session handoff file.
- `handoffs/LATEST_HANDOFF.md` is legacy and should not be used as the active write target.
- `context/MEMORY_INDEX.md` should be used as the quick map of where project truth lives.

## Session aliases

If the user says only `start`, run the startup protocol in `prompts/start.md`.

If the user says only `closeout`, run the closeout protocol in
`prompts/closeout.md`.

These aliases are mandatory shortcuts, not suggestions.

## Tech stack

| Layer      | Technology                         |
|------------|------------------------------------|
| Framework  | React 19                           |
| Bundler    | Vite 6                             |
| Language   | JavaScript (JSX)                   |
| Hosting    | GitHub Pages                       |
| Backend    | Supabase (leaderboard + anon auth) |
| Storage    | Supabase (primary) + localStorage (fallback) |

## Project structure

```
call-of-doodie/
├── index.html
├── package.json
├── vite.config.js              # base: "/call-of-doodie/"
├── AGENTS.md                   # this file
├── HANDOFF.md                  # legacy handoff (superseded)
├── context/
│   ├── PROJECT_BRIEF.md
│   ├── SOUL.md
│   ├── BRAIN.md
│   ├── CURRENT_STATE.md
│   ├── DECISIONS.md
│   ├── TASK_BOARD.md
│   ├── OPEN_QUESTIONS.md
│   ├── ASSUMPTIONS_REGISTER.md
│   ├── RISK_REGISTER.md
│   ├── TRUTH_MAP.md
│   ├── MEMORY_INDEX.md
│   └── LATEST_HANDOFF.md       # authoritative session handoff
├── docs/
│   ├── README.md
│   ├── GAME_LOOP.md
│   ├── SYSTEMS.md
│   ├── CONTENT_PLAN.md
│   ├── LIVE_OPS.md
│   ├── PLAYER_EXPERIENCE_PRINCIPLES.md
│   ├── QUALITY_BAR.md
│   ├── BRAND_SYSTEM.md
│   ├── CREATIVE_DIRECTION_RECORD.md
│   ├── RIGHTS_PROVENANCE.md
│   └── INNOVATION_PIPELINE.md
├── handoffs/
│   └── LATEST_HANDOFF.md       # legacy redirect only
├── logs/
│   └── SESSION_LOG.md
├── plans/
│   ├── CONSTRAINTS_LEDGER.md
│   └── EXPERIMENT_REGISTRY.md
├── prompts/
│   ├── bootstrap_prompt.md
│   ├── start.md
│   └── closeout.md
├── .github/workflows/deploy.yml
└── src/
    ├── main.jsx
    ├── App.jsx                 # Game loop + state orchestrator (~1400 lines)
    ├── drawGame.js             # Extracted render function (~640 lines) — pure, no React deps
    ├── gameHelpers.js          # spawnEnemy, spawnBoss — pure module-level helpers
    ├── constants.js            # WEAPONS, ENEMY_TYPES, PERKS, ACHIEVEMENTS, DIFFICULTIES, META_UPGRADES, STARTER_LOADOUTS, etc.
    ├── settings.js             # SETTINGS_DEFAULTS, loadSettings(), saveSettings(), loadPresets(), savePresets()
    ├── storage.js              # Leaderboard (Supabase + localStorage), career stats, meta, missions, callsign
    ├── supabase.js             # Supabase client + initAnonAuth() + getAuthUid()
    ├── sounds.js               # Web Audio API synthesis — zero audio files
    └── components/
        ├── UsernameScreen.jsx
        ├── MenuScreen.jsx
        ├── DeathScreen.jsx
        ├── HUD.jsx
        ├── PauseMenu.jsx
        ├── LeaderboardPanel.jsx
        ├── AchievementsPanel.jsx
        ├── PerkModal.jsx
        ├── WaveShopModal.jsx
        └── SettingsPanel.jsx
```

## Key architecture notes

- All game logic lives in a single `gameLoop` useCallback in `App.jsx`.
- Heavy use of refs (gsRef, perkModsRef, statsRef, etc.) to avoid stale closures in the RAF loop.
- React state is used only for UI rendering; refs drive all game-loop logic.
- `perkPendingRef` and `shopPendingRef` both halt the game loop while their modals are open.
- Canvas 2D context is cached in `ctxRef` for performance.
- Render is extracted to `drawGame(ctx, canvas, W, H, gs, refs)` in `drawGame.js` — pure drawing, no React setters. Called once per frame from `App.jsx` gameLoop.
- Spawn logic is extracted to `gameHelpers.js` — `spawnEnemy(gs,W,H,diffId)`, `spawnBoss(gs,W,H,diffId,typeIndex)`.

## localStorage keys

| Key | Purpose |
|-----|---------|
| `cod-lb-v5` | Leaderboard fallback (Supabase is primary) |
| `cod-career-v1` | Career stats |
| `cod-meta-v2` | Meta-progression |
| `cod-missions-YYYY-MM-DD` | Daily mission progress |
| `cod-callsign-v1` | Locked callsign for return visits |
| `cod-music-muted` | Music mute preference (`"1"`/`"0"`) |
| `cod-colorblind` | Colorblind mode preference (`"1"`/`"0"`) |
| `cod-settings-v1` | Settings panel values |
| `cod-presets-v1` | Up to 3 named settings presets |

## Active perkModsRef fields

`damageMult`, `critBonus`, `lifesteal`, `pickupRange`, `pierce`, `ammoMult`,
`grenadeCDMult`, `grenadeDamageMult`, `dashCDMult`, `comboTimerMult`, `xpMult`,
`lastResort`, `fireRateMult`, `adrenalineRush`, `ammoDropMult`, `ammoRestoreMult`

## Workflows

| File | Purpose |
|------|---------|
| `.github/workflows/deploy.yml` | Build + deploy to GitHub Pages on push to `main` |

## Gold-standard session protocol

### Startup read order

1. `prompts/start.md`
2. `context/PROJECT_BRIEF.md` 
3. `context/PORTFOLIO_CARD.md`
3. `context/SOUL.md`
4. `context/BRAIN.md`
5. `context/CURRENT_STATE.md`
6. `context/DECISIONS.md`
7. `context/TRUTH_MAP.md`
8. `context/TASK_BOARD.md`
9. `context/LATEST_HANDOFF.md`
10. only then any task-specific code or docs

### Mandatory closeout write-back

After meaningful work, update:

- `context/CURRENT_STATE.md`
- `context/TASK_BOARD.md`
- `context/LATEST_HANDOFF.md`
- `logs/SESSION_LOG.md`
- `context/DECISIONS.md` when reasoning changed
- `plans/CONSTRAINTS_LEDGER.md` when constraints changed
- `plans/EXPERIMENT_REGISTRY.md` when experiments changed
- `docs/CREATIVE_DIRECTION_RECORD.md` when human creative direction changed
- `docs/QUALITY_BAR.md` when the release bar changed
- `docs/INNOVATION_PIPELINE.md` when a strong new idea emerged

Do not end a meaningful work session without write-back.

## Scripts

```bash
npm run dev      # Local dev server
npm run build    # Production build (must pass before any push)
npm run preview  # Preview production build
```

## Known limitations / future work

- Callsign server-side enforcement: SQL migration in `storage.js` comments needs manual run in Supabase console; also requires "Anonymous sign-ins" enabled in Supabase Auth settings
- Add `customSettings` column to Supabase leaderboard (`ALTER TABLE leaderboard ADD COLUMN "customSettings" boolean`) so ⚙️ badge appears for all entries (not just localStorage ones)
- Railgun sound reuses Sniper-ator's CRACK! — may want a distinct sound in `sounds.js`
- Gamepad rumble is a silent no-op on Firefox/Safari (requires Chrome 68+ Vibration Actuator API)
- App.jsx is ~1400 lines — the RAF loop stays (closes over too many refs), but further extraction is possible
- No backend — `play-` and `api-` origins are reserved but not active
- Capacitor/PWA wrapping for App Store not yet started


