# Second-Order Innovations — 2026-08-02

Generated after all five verified audit items shipped. The repo-local Genius generator reported
no remaining executable task-board items, so this pass derives candidates from the new evidence
and integration boundaries rather than recycling deferred work.

## Implemented candidates

1. **Data-plane entry isolation.** Production Lighthouse reports exposed a 57.8 KB Supabase
   chunk as an entry preload with roughly 46.5 KB unused. Removed the forced manual chunk,
   deferred the first leaderboard warm-up to browser idle time, added a cancellable/tested idle
   scheduler, and added a post-build boundary gate that proves the Supabase client remains a
   dynamic asset rather than an entry preload.
2. **Evidence-court hardening.** The performance receipt now requires three samples per surface,
   verifies exact declared URLs and hosted-revision/source-SHA identity, and derives bottleneck
   diagnostics from the signed raw Lighthouse reports. A one-run anecdote can no longer pass as
   production evidence.
3. **Open-arsenal Gauntlet invariance.** Weekly weapon selection now derives from
   `WEAPONS.length` instead of a stale magic number. The clock is injectable for deterministic
   week-boundary and 520-week range tests.
4. **Challenge-language fidelity.** Public game copy now describes a fixed *opening kit*, not a
   locked build: Gauntlet fixes the start while the all-open arsenal still permits switching.

## Evidence and disposition

- Focused tests cover idle scheduling, weekly determinism/range, launch mapping, guidance, and
  performance receipt rejection paths.
- The local production build preloads only the React runtime; the Supabase client is detected in
  a deferred dynamic chunk by `npm run asset-boundary:check`.
- Production Home v2 remains **ineligible** to retire Home v1: the measured median LCP delta is
  -575.166 ms and funnel evidence is still not collected. Preserving the fallback is an
  evidence-backed success, not an implementation omission.
