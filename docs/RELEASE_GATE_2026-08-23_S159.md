# Release Gate — Session 159

## Decision

**GO** for the founder-authorized, cost-neutral FORGE engineering deployment.

**NO-GO** for a SPARKED lifecycle promotion or public launch announcement.

## Production verification

- Exact source: `0864686b6b4f499276f7626a588d66f266db2c52`, synchronized to `origin/main`.
- Continuous integration and deployment: workflow `32626881275` passed quality, build, and Cloudflare deploy; Dependabot workflow `32626942358` also passed.
- Immutable production: `https://017af042.call-of-doodie.pages.dev/`; custom production: `https://callofdoodie.wtf/`. Both typed health endpoints report `0864686b6b4f`.
- Live evidence: shell checks 7/7 on both origins, cutover 5/5, backend 5/5, replay trust 3/3, shared-leaderboard isolation, Studio launch surfaces, and focused Operation pixels 48/48 pass.

## Engineering evidence

- Full Vitest: 219/219 files and 1,254/1,254 assertions.
- Browser end-to-end: 19 passed, one intentional mobile-only skip.
- Strict lint, deployable build, schema, public contract, runtime boundary, dependency tree, security release, supply-chain scans, and npm audit zero pass.
- Isolated Cloudflare Pages staging serves typed health for source `cf4e1a961df4`.
- Hosted broad visual court passes 1,020/1,020; focused Operation court passes 48/48; completion-modal court passes 36/36.
- Thirty hash-bound captures were directly reviewed across dark/light themes and 390/1440px. The rendered-pixel loop found and fixed collision-radius interaction denial and route-card layout defects; zero blocking visual defects remain.
- Public sanitization and working-tree secret scans have zero findings.
- The release adds no dependency, paid service, identity boundary, or variable per-player cost.

## Staging parity and rollback

- Staging alias: `https://session-159-staging.call-of-doodie.pages.dev/`
- Immutable staging revision: `https://d77b1656.call-of-doodie.pages.dev/`
- Deployment path: existing Cloudflare Pages direct upload and GitHub Actions workflow.
- Rollback: redeploy the preceding known-green Pages artifact/source revision; no database migration, destructive operation, or irreversible external state is part of this release.

## SPARKED gates still open

- Current production Core Web Vitals and real participant comprehension/fun/balance evidence.
- Physical PWA install, controller, and full-run media proof.
- Reply-as-domain Zoho delivery evidence.
- Project-scoped PostHog and Sentry credentials/evidence.
- Obelisk identity-plane integration for applicable account flows.
- Itch.io publication evidence and explicit founder lifecycle approval.

The engineering deployment does not satisfy or waive those independent launch gates.
