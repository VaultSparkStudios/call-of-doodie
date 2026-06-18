# Implement Plan — 2026-06-18 continuation

Source audit: `docs/AUDIT_2026-06-18_2.json`

## Wave Plan

1. `codex-plan-mode-truth` — foundational startup honesty fix. Restore non-Claude agent handling before rerunning startup probes so the lock/status surfaces stop reporting a false missing state.
2. `unicode-safe-model-router-transport` — shared API transport fix. Patch the model-router chokepoint after the verifier fix so every Claude API caller inherits safe JSON payload serialization.

## Results

- `codex-plan-mode-truth`: shipped and verified with focused Vitest temp-project coverage plus live `node scripts/verify-plan-mode.mjs --json`.
- `unicode-safe-model-router-transport`: shipped and verified with focused Vitest API-payload coverage plus live `node scripts/compact-handoff.mjs --force`.
