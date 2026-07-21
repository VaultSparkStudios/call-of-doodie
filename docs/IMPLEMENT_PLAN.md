# Implementation Plan — Session 125

Source: `docs/AUDIT_2026-07-16_4.json`

## Efficiency order

1. **Dependency-tree truth gate** — repair the local install after package-trust approval, then make release verification fail closed on invalid root dependencies.
2. **Zero-allocation transient lifecycles** — establish reusable in-place lifecycle primitives and extract safe transient stepping from the 60 FPS callback.
3. **Competitive integrity fault boundary** — use the new bounded runtime contract to record recovered stage faults and keep degraded runs local-only.
4. **HUD airspace allocator + live drill progress** — centralize top-center placement, then compose observed drill progress into the same deterministic stack.
5. **Public IP/provenance surface** — add the missing public route and wire legal, footer, sitemap, agent, visual, and validation parity.
6. **Expansion pass** — refresh the Unified Genius List, generate the innovation pack, inspect the three newest systems, and ship second-order refinements until no live agent-owned candidate remains.

## Per-item gate

- Implement the selected L3 recipe.
- Add focused behavioral coverage before marking shipped.
- Run the game medium-quality gate: input/gameplay/replay changes must stay explicitly verified and cost-neutral.
- Run `node scripts/context-meter.mjs --json`; continue while verdict is `CONTINUE`.
- Record exact evidence in the audit execution log and mark the matching Task Board row done.

## Final matrix

`npm run lint` · `npm test` · `npm run deps:check` · `npm run public:contract` · `npm run protocol:drift` · `npm run security:release:audit` · replay state/edge fixtures · launch media · production build · isolated staging deploy + visual matrix · direct doctor JSON · `git diff --check`.
