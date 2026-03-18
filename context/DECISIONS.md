# Decisions

- **Single-file game loop**: All game logic lives in one `gameLoop` useCallback in App.jsx. Chosen for simplicity and to avoid cross-module ref-sharing complexity. Accepted tradeoff: file is large (~1600 lines).

- **Refs over state for game loop**: Heavy use of useRef (gsRef, perkModsRef, statsRef, etc.) to avoid stale closure issues inside the RAF loop. React state is used only for UI rendering.

- **Web Audio API synthesis**: Zero audio files — all sounds and music are synthesized at runtime using the Web Audio API. Chosen to keep the repo lightweight and avoid asset licensing issues.

- **Procedural background music**: 8-beat loop using scheduled Web Audio API tone/noise calls. BPM and pattern change on boss waves. Controlled via startMusic/stopMusic/setMusicIntensity. Mute state persists in localStorage (`cod-music-muted`).

- **localStorage only (leaderboard fallback)**: Supabase is primary. Leaderboard, career stats, meta-progression, and daily missions all have localStorage as fallback.

- **Perk every 3 levels**: Originally every level-up; changed to every 3rd level to reduce frequency and give perks more weight.

- **Wave shop every non-boss wave**: Shows 3 free reward options (health, ammo, upgrade, speed, maxHP, damage) after each regular wave clear. Implemented with `shopPendingRef` blocking the game loop, parallel to `perkPendingRef`.

- **Auto-aim as opt-in**: Was always-on when moving on mobile (bug). Changed to a toggleable 🎯 button in the mobile action bar. Default off.

- **Flow field pathfinding**: Enemies use a BFS-computed flow field (24px cell grid) rebuilt every 30 frames or when player moves >48px. Eliminates the "enemies walk straight into walls" problem. Falls back to direct angle if cell has no data (e.g., player cell or edge cells).

- **Obstacles don't block bullets from passing**: Bullets ricochet up to 10 times off walls. Enemy bullets are destroyed on wall contact.

- **Colorblind mode**: CSS filter on canvas element (`saturate + contrast + hue-rotate`). Stored in localStorage (`cod-colorblind`). Toggle in PauseMenu.

- **Boss kill hit-stop**: Visual gold flash overlay (`bossKillFlash` field, 22 frames) + large particle burst + extra screen shake. No physics freeze (would require refactoring the interleaved update/render loop).

- **Cursed perks at 35% chance**: Appear as the last of 3 perk options. High risk/reward. Styled in red. Intended to create memorable moments and difficult choices.

- **Starter loadouts**: Applied at run start via perkModsRef, not as a separate system. Keeps the perk system as the single source of truth for stat modifiers.

- **Multi-pellet / burst weapons via shoot()**: `weapon.pellets` fires N bullets with independent spread angles. `weapon.burst` schedules subsequent shots via setTimeout (direction captured at trigger time). RPG (index 1) is the only weapon with no ricochet.

- **vite.config.js base `/call-of-doodie/`**: Lowercase slug matches the GitHub repo name and studio URL standard. Previously was `/Call-Of-Doodie/` (capital letters broke routing).

- **App.jsx refactor — partially executed**:
  - ✅ `src/drawGame.js` extracted (session 8) — ~640 lines. Pure function `drawGame(ctx, canvas, W, H, gs, refs)`. Zero React deps. Called once per frame from gameLoop.
  - ✅ `src/gameHelpers.js` extracted (session 11) — ~100 lines. `spawnEnemy(gs,W,H,diffId)` and `spawnBoss(gs,W,H,diffId,typeIndex)`. Pure module-level functions; App.jsx useCallbacks are thin wrappers.
  - `buildFlowField` and `getShopOptions` remain as module-level helpers in App.jsx (safe, no React deps, but not yet moved).
  - Input handler useEffects remain in App.jsx.
  - The RAF loop stays in App.jsx — closes over too many refs to safely decouple without a Context refactor. Don't move it until there's a test harness.
