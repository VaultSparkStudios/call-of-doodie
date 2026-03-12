# Decisions

- **Single-file game loop**: All game logic lives in one `gameLoop` useCallback in App.jsx. Chosen for simplicity and to avoid cross-module ref-sharing complexity. Accepted tradeoff: file is large (~1300 lines).

- **Refs over state for game loop**: Heavy use of useRef (gsRef, perkModsRef, statsRef, etc.) to avoid stale closure issues inside the RAF loop. React state is used only for UI rendering.

- **Web Audio API synthesis**: Zero audio files — all sounds are synthesized at runtime using the Web Audio API. Chosen to keep the repo lightweight and avoid asset licensing issues.

- **localStorage only**: No backend. Leaderboard, career stats, meta-progression, and daily missions all persist in localStorage. Accepted tradeoff: scores are not global. Future work: Supabase free tier.

- **Perk every 3 levels**: Originally every level-up; changed to every 3rd level to reduce frequency and give perks more weight.

- **Auto-aim as opt-in**: Was always-on when moving on mobile (bug). Changed to a toggleable 🎯 button in the mobile action bar. Default off.

- **Obstacles don't affect enemy pathfinding**: Enemies walk through walls. Acceptable for the arcade feel — walls mainly serve as player cover and bullet blockers. Full pathfinding would require A* or similar and significantly increase complexity.

- **Cursed perks at 35% chance**: Appear as the last of 3 perk options. High risk/reward. Styled in red. Intended to create memorable moments and difficult choices.

- **Starter loadouts**: Applied at run start via perkModsRef, not as a separate system. Keeps the perk system as the single source of truth for stat modifiers.

- **vite.config.js base `/call-of-doodie/`**: Lowercase slug matches the GitHub repo name and studio URL standard. Previously was `/Call-Of-Doodie/` (capital letters broke routing).
