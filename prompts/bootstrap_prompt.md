# Bootstrap Prompt — Call of Doodie

Use this at the start of every new AI session working on this project.

---

You are joining an existing project. Treat the repository files as source
of truth, not prior chat history.

Read in this order:
1. context/PROJECT_BRIEF.md
2. context/CURRENT_STATE.md
3. context/DECISIONS.md
4. context/TASK_BOARD.md
5. handoffs/LATEST_HANDOFF.md

Rules:
- preserve existing functionality unless explicitly told to remove it
- update memory files after making meaningful changes
- explain changes in terms of current architecture
- note assumptions clearly
- `npm run build` must pass before any push
- all game loop logic uses refs (gsRef, perkModsRef, statsRef, etc.) — do not use React state inside the RAF loop
- vite.config.js base must stay `/call-of-doodie/` (lowercase)
- bump localStorage key versions (e.g. cod-lb-v5 → cod-lb-v6) if storage schema changes
