<!-- template-version: 1.0 -->
<!-- synced-from: docs/SESSION_PROTOCOL.md section 4 / vaultspark-studio-ops prompts/initiate.md -->
# INITIATE

Executed when the user says `initiate`, `initiate project: <name>`, or when
`prompts/start.md` detects an uninitialized project.

This repo is already a returning Studio OS project. For returning sessions, route
back to `prompts/start.md`.

---

## 1. Detect Initiation Type

| Signal | Type | Protocol |
|---|---|---|
| Missing `AGENTS.md` or missing `context/` folder | A - Bootstrap | Follow `docs/SESSION_PROTOCOL.md` section 4 bootstrap initiation |
| `AGENTS.md` exists and SIL has 0-1 bootstrap/foundation entries | B - Foundation | Follow `docs/SESSION_PROTOCOL.md` section 4 foundation initiation |
| SIL has 2+ real scored entries | C - Returning | Redirect to `prompts/start.md` |

Check the Session Improvement Loop (SIL) lightly:

```bash
Select-String -Path context/SELF_IMPROVEMENT_LOOP.md -Pattern '^## [0-9]' | Measure-Object
```

Do not read full raw context at startup unless the initiation protocol requires it.

---

## 2. Bootstrap Initiation

Use the canonical Studio OS project templates from `vaultspark-studio-ops` and the
full workflow in `docs/SESSION_PROTOCOL.md` section 4.

Required outcomes:

- Create the standard agent, context, prompt, log, audit, rights, cost, and
  engagement files.
- Run active canon adoption and tier-aware canon conformance checks.
- Preserve proprietary-by-default rights language unless an upstream license
  obligation is discovered.
- Register the project in the private Studio OS registry through the Studio OS
  workflow. Do not edit sibling repo trees directly from this repo.
- Seed the bootstrap SIL baseline and first task-board handoff.

If any project identity, license, or repository ownership fact is unknown, ask the
Studio Owner before scaffolding.

---

## 3. Foundation Initiation

Use `docs/SESSION_PROTOCOL.md` section 4 foundation initiation.

Required checks before scoring:

- `context/PROJECT_BRIEF.md` has project-specific scope and audience.
- `context/SOUL.md` has real non-negotiables, not placeholders.
- `context/TASK_BOARD.md` has at least one concrete Now item.
- `docs/RIGHTS_PROVENANCE.md` records proprietary rights, plus any required
  upstream copyleft exception if one exists.
- Engagement and cost-discipline scaffolds are present or explicitly not
  applicable.

Then append the foundation SIL entry, update project status, and emit the
foundation brief exactly as the canonical protocol specifies.

---

## 4. Returning Sessions

If this project already has 2+ real scored SIL entries, stop initiation and run
`prompts/start.md`. Call-Of-Doodie is currently in this returning-session state.

Do not duplicate bootstrap/foundation records in a mature repo.
