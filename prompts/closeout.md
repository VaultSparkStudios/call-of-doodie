# Closeout Protocol

Use this when the user says only `closeout`.

Treat that one word as a full closeout command.

## Closeout actions

If meaningful work happened this session, update in this order:

1. `context/CURRENT_STATE.md`
2. `context/PORTFOLIO_CARD.md` when portfolio truth changed
3. `context/PROJECT_STATUS.json` when machine-readable status changed
4. `context/TASK_BOARD.md`
5. `context/LATEST_HANDOFF.md`
6. `logs/SESSION_LOG.md`
7. `context/DECISIONS.md` if reasoning changed
8. `docs/CREATIVE_DIRECTION_RECORD.md` if human creative direction changed
9. `docs/INNOVATION_PIPELINE.md` if a high-value idea emerged
10. `plans/CONSTRAINTS_LEDGER.md` if constraints changed
11. `plans/EXPERIMENT_REGISTRY.md` if experiments changed
12. `docs/QUALITY_BAR.md` if release expectations changed
13. any project-type or repo-specific files whose truth changed

## Closeout rules

- `context/LATEST_HANDOFF.md` is the authoritative handoff file
- do not write the active session handoff into `handoffs/LATEST_HANDOFF.md`
- if no meaningful work happened, say so explicitly and do not fabricate updates
- if code changed, mention whether validation ran
- if assumptions were made, record them in the appropriate memory file
- if deployment, launch, or external configuration changed, update the relevant repo-specific docs too

## Required closeout output

Reply with a concise `Session Closeout` containing:

1. what was completed
2. files changed
3. validation status
4. open problems
5. recommended next action
6. exact files the next AI should read first
