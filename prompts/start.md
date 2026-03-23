# Start Protocol

Use this when the user says only `start`.

Treat that one word as a full startup command.

## Read order

1. `AGENTS.md`
2. `docs/README.md`
3. `context/PROJECT_BRIEF.md`
4. `context/PORTFOLIO_CARD.md`
5. `context/SOUL.md`
6. `context/BRAIN.md`
7. `context/CURRENT_STATE.md`
8. `context/DECISIONS.md`
9. `context/TRUTH_MAP.md`
10. `context/TASK_BOARD.md`
11. `context/LATEST_HANDOFF.md`
12. `context/MEMORY_INDEX.md`
13. `docs/SYSTEMS.md`
14. `docs/CONTENT_PLAN.md`
15. `docs/LIVE_OPS.md`
16. `docs/QUALITY_BAR.md`
17. `plans/CONSTRAINTS_LEDGER.md`
18. `plans/EXPERIMENT_REGISTRY.md`
19. only then task-specific files

## Startup rules

- treat repository files as source of truth, not prior chat memory
- do not change code during startup unless the user explicitly asks for implementation immediately
- use `context/LATEST_HANDOFF.md` as the only active handoff source
- treat `handoffs/LATEST_HANDOFF.md`, `HANDOFF.md`, and `CODEX_HANDOFF_*.md` as historical context only
- if the user has extra context not yet in the repo, ask only for the current goal and any external changes that are not written down
- preserve existing functionality unless explicitly told otherwise
- note assumptions clearly

## Required startup output

Reply with a concise `Startup Brief` containing:

1. project identity
2. current state
3. active priorities
4. important constraints
5. likely next best move
6. any blockers or ambiguities
7. exact files that matter most for this session
