# Implement Plan — Session 152

Source: `docs/AUDIT_2026-08-12_2.json`. Default rung: L2.

1. [x] `menu-revenge-drill-continuity` — bounded `menu-run-drill-v1` envelopes now survive DeathScreen → menu → every deploy path, preserve accepted seed/baseline evidence, and reject malformed or oversized fields.
2. [x] `drill-outcome-first` — the prior observed result now precedes ONE VERDICT exactly once with comparable-only score delta, repeatability evidence, and explicit non-causal language.
3. [x] `mastery-command-brief` — mature-player Commander's Orders now carries the nearest authoritative per-weapon target from `career.weaponLegendKills` without changing weapon availability or higher-priority orders.

Per-item gates: focused tests, strict lint on touched source, architecture budget, and the applicable canon checker. Final gates: full test suite, production build, public contract, security/supply-chain checks, hosted staging smoke, and rendered-pixel review for both themes at desktop and mobile widths.
