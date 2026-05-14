<!-- generated-by: /implement skill v1.0 -->
<!-- generated-at: 2026-05-14 -->
<!-- audit: docs/AUDIT_2026-05-14.md -->

# Implement Plan

Optimal-efficiency order:

1. **replay-link-fidelity** — same App/DeathScreen/replay-code surface as recent Session 62 work; smallest high-impact bug fix.
2. **precision-skill-memory** — same DeathScreen/Run Coach surface while context is hot; turns the new precision mechanic into durable coaching.
3. **canonical-public-surface** — docs-only source-of-truth repair after code surfaces settle.
4. **post-cutover-smoke-command** — script/package addition last so validation can include the final public-surface assumptions.

Token/API-cost note: all four items are zero-token and local-first. Measurement is via tests, lint/build, and the new post-cutover smoke script.
