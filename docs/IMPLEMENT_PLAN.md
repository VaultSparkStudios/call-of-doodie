# Implement Plan — Session 151

Source: `docs/AUDIT_2026-08-12.json`. Default rung: L2.

1. [x] `seeded-arena-environment-boundary` — extracted deterministic arena-environment generation from `App.jsx` behind a pure, tested system boundary; 40/40 legacy seed/dimension parity and 116 lines of App headroom.
2. [x] `canonical-weapon-mastery-authority` — mastery now derives only from per-weapon kill evidence; account-level thresholds are named arsenal milestones across UI, telemetry, audits, and public contracts.
3. [x] `revenge-brief-first` — the actionable revenge brief now follows the death/challenge result, with build, statistics, evidence, and tactical analysis in one accessible disclosure.
4. [x] `analytica-stats-twin-v1` — the public descriptor, homepage showcase, and 15-second polling cadence share one tested contract; CANON-054 conforms.

Per-item gates: focused tests, strict lint on touched source, architecture budget, and the applicable canon checker. Final gates: full test suite, production build, public contract, security/supply-chain checks, hosted staging smoke, and rendered-pixel review for both themes at desktop and mobile widths.
