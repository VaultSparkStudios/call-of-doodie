# Implement Plan — 2026-05-17 Audit

<!-- generated-by: /implement skill v1.0 -->
<!-- source: docs/AUDIT_2026-05-17.md -->

## Sequence

1. **replay-loadout-hydration** — Update HomeV2 replay URL and replay-code load paths to apply decoded `starterLoadout`.
2. **replay-bootstrap-regression** — Add focused HomeV2 regression coverage for replay URL hydration.
3. **audit-handoff-tightening** — Append execution results to the audit and context logs so the pass is idempotent.

## Success Criteria

- Replay links generated from a non-standard starter hydrate that starter when opened.
- Pasted replay codes hydrate the same starter before deployment.
- Focused HomeV2/replay tests pass.
- Audit execution log records shipped outcomes.
