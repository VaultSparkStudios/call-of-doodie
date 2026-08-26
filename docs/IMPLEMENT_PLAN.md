# Implement Plan — Session 162

Source: `docs/AUDIT_2026-08-25_2.json`

The three promoted items are sequenced by truth dependency: centralize the evidence contract first, consume it in player history second, then update documentation from shipped behavior.

| Wave | Audit item | Rung | Why this order | Verification gate |
|---|---|---|---|---|
| 1 | `evidence-backed-rematch-hud` | L2 | Establishes one normalized, drill-specific evidence authority before any surface renders it. | Malformed/duplicate/multi-drill fixtures; desktop and compact HUD models show the persisted label without mastery or causality language. |
| 2 | `player-order-evidence-archive` | L2 | Reuses the settled authority to make recent corrective work discoverable without leaking raw event payloads. | Bounded newest-first archive; player-visible static component coverage; empty state remains quiet. |
| 3 | `run-drill-loop-contract-refresh` | L2 | Records only behavior that already exists after Waves 1–2. | Protocol/public Game Loop sources name the same lifecycle and evidence ceiling. |

## Session-wide gates

- Keyboard, mouse, controller, and touch paths remain playable and equivalent.
- Player-facing copy expands acronyms on first use and avoids causal/mastery overclaiming.
- No dependency, hosted inference, identity boundary, or variable per-player cost is added.
- `/start`, `/audit`, `/implement`, and `/closeout` remain executable.
- Every rendered change receives desktop/mobile and dark/light browser review before release.
