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

- **Speedrun ranking is time-first at the client layer**: Until Supabase gets a dedicated speedrun ranking path, the leaderboard UI and post-submit rank lookup sort `mode === "speedrun"` by parsed `MM:SS` time ascending instead of score. This fixes the user-visible ranking bug without changing the whole storage model.

- **Leaderboard payloads are normalized before persistence**: Callsign text, last words, numeric stats, input device, and mode values are now normalized/clamped in `storage.js` before save/read. This is a pragmatic client-side integrity step for a browser game, even though authoritative anti-cheat still requires a server-side submit path.

- **Online score submission now goes through a Supabase Edge Function**: Browser clients no longer insert leaderboard rows directly. `submit-score` verifies auth, re-checks callsign ownership, normalizes payloads again server-side, and handles Vault point awards. This is the first authoritative boundary for launch integrity.

- **Lint commands align with ESLint 9 flat config**: Local and CI lint now use plain `eslint src --report-unused-disable-directives`. Warning debt still exists, but the command contract is now consistent and non-broken.

- **Score submission is gated by one-time run tokens**: A run must obtain a token from `issue-run-token` at start, and `submit-score` will only accept a matching unused token for the same mode, difficulty, and seed. This does not make the game cheat-proof, but it materially raises the cost of fabricated submissions and gives the server a real issuance/consumption flow.

- **Supabase function deployment is CI-first, not local-Docker-dependent**: Because local Docker availability blocked `supabase functions deploy` on this machine, the authoritative deployment path is now the GitHub Actions workflow. The workflow was fixed and confirmed working, which is more reliable for future deploys than depending on a specific local workstation state.

- **Replaced Supabase anonymous auth with client-generated UUID (Session 33)**: `initAnonAuth()` was removed. Supabase's CAPTCHA protection for anonymous sign-in caused the Edge Functions to return 401, which triggered an uncaught ReferenceError (`dn is not defined`) deep in the supabase-js error handler. Fix: `getOrCreateClientUid()` generates a stable UUID stored in `cod-client-uid-v1` (localStorage). Both Edge Functions now try `auth.getUser()` first and fall back to the `clientUid` from the request body. This maintains the run-token security model (tokens are still bound to a uid) while bypassing the CAPTCHA gate entirely.

- **ESLint 9 flat config now includes eslint-plugin-react (Session 33)**: Without the plugin, JSX component references were not recognized as variable usages, producing 50+ false-positive "unused import" warnings. Adding `react/jsx-uses-vars` eliminated the false positives. Also added `caughtErrors: "none"` to suppress `catch (_)` warnings. Warning count: 67 → 13.

- **Music reactive thresholds raised to 8/15 combo kills (Session 33)**: The previous thresholds (2/5) meant chill was overridden to action almost immediately after the first wave started. Raising to 8/15 makes the vibe selection meaningful during early and mid-game waves. Intense still triggers on sustained 15-kill streaks.

- **Level-up speed is additive, not absolute (Session 34)**: Previously `player.speed = 4 + level * 0.12` overwrote all accumulated speed bonuses from loadouts, perks, shop purchases, and meta tree on every level-up. Changed to `player.speed += 0.12` so speed bonuses are preserved. This means total speed scales with both build investment and level, which is the intended RPG-style stacking behavior.

- **Blitz route uses blitzSpawnMult, not settSpawnMult (Session 34)**: The Blitz route modifier was mutating the user's `settSpawnMult` (settings-based spawn multiplier) permanently, compounding on consecutive Blitz picks. Fixed to use `blitzSpawnMult`, which is already in the spawn rate formula and gets reset each wave. This preserves the user's spawn rate setting while still applying the Blitz speed-up for one wave.

- **Callsign claims verify ownership after upsert (Session 34)**: `ignoreDuplicates: true` in the Supabase upsert silently skips if the name already exists with a different uid. The function now reads back the row after upsert and returns `false` if the stored uid doesn't match the current user. This prevents the caller from thinking they claimed a name that actually belongs to someone else.

- **Renamed speed-boost perk to "Speed Surge" (Session 34)**: Two perks shared the display name "Adrenaline Rush" — the +15% speed perk (id: "adrenaline") and the below-30%-HP double-speed perk (id: "adrenaline_rush"). Players couldn't distinguish them in the perk selection UI. The simpler speed perk was renamed to "Speed Surge" while the conditional trigger perk keeps "Adrenaline Rush".
