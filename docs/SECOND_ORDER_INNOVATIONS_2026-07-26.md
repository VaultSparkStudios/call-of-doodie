# Second-Order Innovation Ledger — Session 131

Generated after the primary `/implement` pass from live boundaries created by the route graph, atlas pipeline, and responsive HUD. These are implementation receipts, not launch claims.

## Implemented

1. **Route contract proof ledger**
   - Premise: one route graph removes drift, but downstream consumers still needed a machine-readable proof that they share the same normalized source.
   - Shipped: deterministic SHA-256 route/gameplay fingerprint, exact consumer and coverage counts, `public/route-contract.json`, agent discovery, fail-closed public validation, and determinism tests.

2. **Synthetic chroma-matte canary**
   - Premise: the new WebP export revealed that provenance atlases are intentionally opaque chroma sources; alpha is a transformation contract rather than source metadata.
   - Shipped: repo-local deterministic soft-matte/despill implementation plus a synthetic canary proving border-key sampling, subject preservation, softened edges, spill cleanup, and byte-identical output.

3. **HUD capability receipt**
   - Premise: visible parity tests can still miss a silently dropped capability when the compact surface evolves.
   - Shipped: a pure receipt listing always-visible vitals/actions, live context identifiers, primary urgency signal, action identifiers, and uniqueness state; the compact DOM exposes the stable capability list for automated inspection.

4. **Bounded roster decode scheduler**
   - Premise: compressed atlases remove transfer weight but unbounded proactive decoding could reintroduce first-encounter frame pressure.
   - Shipped: active-roster preloading capped at two unique atlases per request, wired at spawn time with procedural rendering retained during load/failure, plus exact-plan tests.

## Rejected after live verification

- **Hosted run coach:** rejected because the deterministic local debrief system already covers the need and hosted inference would violate cost-neutral operation without evidence of benefit.
- **Balance retune:** rejected because no new participant or production evidence supports numeric combat changes.
- **Launch-state promotion:** rejected because current-SHA staging, external delivery, production metrics, physical-device proof, and founder launch approval remain separate evidence gates.
