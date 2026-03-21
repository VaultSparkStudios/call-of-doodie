# Bootstrap Prompt — Call of Doodie

Use `prompts/start.md` as the primary startup protocol.

This file remains as a compatibility alias for older workflows.

---

You are joining an existing project. Treat the repository files as source of
truth, not prior chat history.

Read in this order:
1. AGENTS.md
2. docs/README.md
3. context/PROJECT_BRIEF.md
4. context/SOUL.md
5. context/BRAIN.md
6. context/CURRENT_STATE.md
7. context/DECISIONS.md
8. context/TRUTH_MAP.md
9. context/TASK_BOARD.md
10. context/LATEST_HANDOFF.md

Rules:
- preserve existing functionality unless explicitly told to remove it
- update memory files after meaningful changes
- explain changes in terms of current architecture
- note assumptions clearly
- `npm run build` must pass before any push
- all game loop logic uses refs (gsRef, perkModsRef, statsRef, etc.) — do not use React state inside the RAF loop
- vite.config.js base must stay `/call-of-doodie/` (lowercase)
- bump localStorage key versions (e.g. cod-lb-v5 → cod-lb-v6) if storage schema changes
- `context/LATEST_HANDOFF.md` is the only authoritative active handoff
