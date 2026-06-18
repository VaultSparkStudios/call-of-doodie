# Implement Plan — AUDIT_2026-06-18_3

Source: `docs/AUDIT_2026-06-18_3.json`

Execution is ordered for context efficiency and launch confidence, not raw priority.

## Wave Plan

1. `visitor-safe-status-copy` — small public-surface cleanup, unlocks cleaner front-door work.
2. `release-security-header-gate` — launch/security automation while account routes are fresh in context.
3. `obelisk-verify-guest-migration` — account verification foundation before any account-facing UX copy expands.
4. `legacy-home-retirement-gate` — document and test the fallback boundary before consolidating the front door.
5. `front-door-clarity-spine` — larger HomeV2 consolidation after debug/status/fallback boundaries are cleaner.
6. `first-run-control-rite` — first-run flow builds on the clarified front door.
7. `deathscreen-next-run-drill-bridge` — post-run feedback loop after front-door entry points are less crowded.
8. `local-balance-lab` — zero-token intelligence surface using existing Studio events.
9. `hud-collision-budget` — visual layout safety before adding more in-run chips.
10. `launch-screenshot-truth-pack` — browser-verified visual media pass.
11. `app-death-submit-extraction` — larger architecture extraction once behavior changes settle.
12. `persistent-ghost-path-opponents` — deepest gameplay/retention item, depends on trust/path clarity.

## Quality Gates

- Preserve guest-first play: `/`, `/daily`, and unknown routes must keep rendering gameplay.
- Keep Run Brain local and zero-token.
- Preserve keyboard/mouse, mobile, and controller play paths.
- No visitor-facing operational copy unless it is player-actionable.
- Run focused tests for each changed surface, then broader lint/test/build as scope expands.

## Execution Result

Completed 2026-06-18: 12/12 audit items shipped. Validation: full `npm test` 540/540, `npm run build` passing, `npm run lint` passing during item gates, `node scripts/security-release-gate.mjs --npm-audit` passing with 0 vulnerabilities, and `npm run launch:media-check` passing with verified gameplay captures.
