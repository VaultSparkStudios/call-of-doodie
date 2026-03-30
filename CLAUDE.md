# Studio OS — Agent Instructions

This project is **Call of Doodie** and runs on the VaultSpark Studio OS.
Type: Browser-based top-down arcade shooter (React 19 + Vite 6 + Canvas)

## Session aliases (mandatory)

When the user says only `start`, read and execute `prompts/start.md` exactly.
When the user says only `closeout`, read and execute `prompts/closeout.md` exactly.

Do NOT ask "what would you like to work on" — execute the prompt.

## Required reading

@AGENTS.md

## Project structure

- `context/` — Live project state (CURRENT_STATE, TASK_BOARD, LATEST_HANDOFF, etc.)
- `prompts/` — Session protocols (start, closeout)
- `audits/` — Session audit JSONs
- `src/` — Game source (App.jsx, drawGame.js, constants.js, sounds.js, etc.)
- `src/components/` — React UI components
- `src/hooks/` — Custom hooks (useGameLoop, useGamepadNav, useFocusTrap)
- `src/utils/` — Utilities (analytics, loadoutCode, qrEncode, supporter)

## Build and test

- Dev: `npm run dev`
- Build: `npm run build`
- Test: `npm test` (Vitest — 65 tests)
- Lint: `npm run lint`

## Key rules

- Never edit prior entries in DECISIONS.md, SELF_IMPROVEMENT_LOOP.md, or CREATIVE_DIRECTION_RECORD.md — append only
- LATEST_HANDOFF.md is the authoritative handoff source
- context/PROJECT_STATUS.json must stay current — Studio Hub reads it via GitHub API
