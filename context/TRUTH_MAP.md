# Truth Map

Use this file to define which records are authoritative when sources conflict.

## Source of truth by area

- Product identity: `context/PROJECT_BRIEF.md`, `context/SOUL.md`, `context/BRAIN.md`
- Current scope and project reality: `context/CURRENT_STATE.md`
- Active next actions: `context/TASK_BOARD.md`
- Design and architecture reasoning: `context/DECISIONS.md`
- Live session handoff for this repo right now: `context/LATEST_HANDOFF.md`
- Historical handoff archive only: `handoffs/LATEST_HANDOFF.md`, `HANDOFF.md`, `CODEX_HANDOFF_*.md`
- Brand and creative direction: `docs/BRAND_SYSTEM.md`, `docs/CREATIVE_DIRECTION_RECORD.md`
- IP protection and origin trail: `docs/RIGHTS_PROVENANCE.md`
- Gameplay structure: `docs/GAME_LOOP.md`, `docs/PLAYER_EXPERIENCE_PRINCIPLES.md`
- Startup and closeout aliases: `prompts/start.md`, `prompts/closeout.md`

## Conflict rules

- If code conflicts with stale docs, the code wins and the stale doc should be updated
- If `context/LATEST_HANDOFF.md` conflicts with older handoff records, the newer `context/LATEST_HANDOFF.md` wins
- If a user says only `start`, follow `prompts/start.md`
- If a user says only `closeout`, follow `prompts/closeout.md`
- If a brainstorm conflicts with `SOUL.md` or `BRAND_SYSTEM.md`, the stable identity docs win
- If a new creative decision changes the identity of the project, append it to `docs/CREATIVE_DIRECTION_RECORD.md`

## Canonical example note

This repo is the Call of Doodie reference implementation for the VaultSpark
project system. The structure is intentionally additive so existing workflows do
not break while the higher-value records are introduced.
