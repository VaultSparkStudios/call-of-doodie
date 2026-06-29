# Implement Plan — 2026-06-29

1. startup-brief-canonical-surface-regression — shipped first because /start was failing its own validator.
2. model-router-unicode-transport-regression — restored handoff transport safety before any model-backed closeout work.
3. codex-plan-mode-truth-regression — restored agent-aware plan-mode truth so Codex sessions stop false-warning.
4. windows-hide-closeout-parity — fixed the closeout shell spawn that the new guard flagged.
5. protocol-drift-windows-hide-coverage — added the new guard/wrapper/shim/codemod to protocol drift so the surface cannot lie.

Rejected-on-verification: app-survival-timer-duplication. The premise is not strong enough to ship without browser timing evidence because both timer setup sites clear the prior interval first.
