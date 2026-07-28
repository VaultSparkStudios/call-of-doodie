# Second-Order Innovations — Session 133

All candidates below emerged from the three newly shipped L3 contracts and were
premise-verified against live source before implementation.

1. **Boot storage boundary ratchet** — source-derived `boot-storage-boundary-v1`
   scans the two public boot surfaces and fails if direct local/session storage
   access bypasses the fail-open adapters. Wired into `schema:lint` with live,
   negative, multi-form, and comment fixtures.
2. **Ghost receipt invariant** — run-history sanitization caps recorded sample
   count to the sanitized recorder capacity, preventing impossible evidence from
   surviving malformed or future callers.
3. **Formation evidence consistency** — dominant formation now derives from
   sanitized counts, and invalid transition labels are dropped rather than
   coerced into a fabricated pincer observation.

These safeguards change no combat math, random streams, progression values,
leaderboard eligibility, guest-play defaults, or variable-cost posture.
