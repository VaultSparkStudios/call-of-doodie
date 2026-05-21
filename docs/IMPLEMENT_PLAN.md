# Implement Plan — 2026-05-21 Session 73

Source: `docs/AUDIT_2026-05-21_4.md`

## Sequenced Order

1. `trace-evidence-submission-loop` — foundation. Attach compact replay trace evidence to session submissions and preserve it in leaderboard submit results.
2. `edge-trace-quality-receipts` — backend receipt. Mirror trace-quality analysis in `submit-score`, store it in member metadata, and return it in the success response.
3. `trust-ops-trace-surface` — player/operator surface. Summarize trace evidence in local Studio trust events and Run History trust ops.

## Verification Target

- Focused utility tests for run submission and Studio event summaries.
- Lint/build/full test if the focused pass is clean.
