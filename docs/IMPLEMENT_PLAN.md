# Implementation Plan — Session 127

Source: `docs/AUDIT_2026-07-22.json`

## Efficiency order

1. **Edge runtime truth contract** — establish the typed `/_health` boundary and HSTS invariant first because staging/release checks depend on them.
2. **Service-worker lifecycle truth** — repair the existing PWA receipt semantics and registration transport before adding broader UI status.
3. **Storage durability receipt** — establish one safe local-persistence contract, migrate critical writes, and surface bounded degraded/recovered state.
4. **Observed-action onboarding** — use the existing command-trace boundary to advance first-run instruction from real evidence without changing input behavior.
5. **Recoverable lazy panels** — add one accessible panel boundary and replace invisible loading gaps after the shared runtime truth primitives exist.
6. **Expansion pass** — refresh the Unified Genius List, generate the innovation pack, inspect the newest runtime boundaries, and ship every safe second-order refinement while the context meter remains `CONTINUE`.

## Per-item gate

- Implement the selected L3 recipe and add focused behavioral coverage.
- Preserve deterministic random-number-generator draw timing, replay truth, keyboard/touch/controller parity, accessibility, and cost-neutral architecture.
- Run the game medium-quality gate after input/gameplay changes.
- Run `node scripts/context-meter.mjs --json`; continue while the verdict is `CONTINUE`.
- Record exact evidence in the audit execution log and mark the matching Task Board row done.

## Final matrix

`npm run lint:strict` · `npm test` · `npm run build` · `npm run deps:check` · `npm run public:contract` · `npm run protocol:drift` · `npm run security:release:audit` · replay state/edge fixtures · launch media · typed health/HSTS checks · isolated staging + hosted browser/visual evidence · direct doctor JSON · `git diff --check`.
