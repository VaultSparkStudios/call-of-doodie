# Release Gate — Session 161

## Decision

**GO** for the founder-authorized, cost-neutral FORGE engineering deployment.

**NO-GO** for a SPARKED lifecycle promotion or public launch announcement.

## Gate evidence

- Continuous integration health: recovery runs `32883766091` and `32887489377` are green. Two older failures in the five-run deploy history are the already repaired Node-runtime/Hot Context incidents; both are superseded by those consecutive green exact-source runs.
- Local quality: 220/220 Vitest files and 1,267/1,267 assertions pass, plus strict lint, deployable production build, schema/architecture/storage/task/runtime courts, public contract 28/28, dependency integrity, assets, security headers, and npm audit zero.
- Staging: stable `https://session-161-staging.call-of-doodie.pages.dev/`; immutable `https://36b0643f.call-of-doodie.pages.dev/`. Both pass 7/7 shell, edge-health, manifest, service-worker, and social-card checks.
- Rendered pixels: hosted matrix 1,020/1,020; focused before/after matrix 96/96; CANON-053 passes with 14 hash-bound captures and direct review across both themes and complementary desktop/mobile widths.
- Secrets: `cloudflare.deploy` is READY (3/3) through the Studio secrets gateway. The release does not modify Supabase functions, schemas, identity, mail, analytics, or another credential-bearing plane.
- Branding/legal/footer: Call of Doodie passes Studio branding compliance; the proprietary public contract passes; the footer contains all 18 required destinations with no missing header or legal links.
- Cost: Studio release gate returns `ALLOW (status=cost-neutral)`; this change adds no dependency, paid service, hosted inference, identity boundary, or variable per-player cost.
- Mobile/platform parity: `context/MOBILE_PARITY.md` records the browser parity evidence. Native mobile is not shipped. Physical-device and installed-PWA proof remain separately unclaimed.
- Rollback: `docs/DEPLOY_ROLLBACK.md` provides the non-force-push revert path; prior immutable production `https://950cc1ed.call-of-doodie.pages.dev/` remains available. This release has no migration or irreversible external state.
- Founder approval: the explicit `/arc` request authorizes direct commit/push to main and full engineering deployment.

## Staging parity

The staging artifact was built from this exact working tree with the same `build:deployable` path, Cloudflare Pages project, Functions bundle, `_headers`, public route graph, and environment contract used by the production workflow. The alias and immutable origin return the same typed health and asset contract.

## Production verification

- Exact implementation source: `6cc76130d23fbd5b80bfd408029e007fd92b4000`, synchronized to `origin/main`.
- GitHub Actions workflow `32894266704` passed Linux lint, 220/220 files and 1,267/1,267 assertions, build, and Cloudflare deployment.
- Immutable production: `https://39696138.call-of-doodie.pages.dev/`; canonical production: `https://callofdoodie.wtf/`. Both typed health endpoints report `6cc76130d23f`.
- Live evidence: shell 7/7 on both origins, cutover 5/5, backend 5/5, replay trust 3/3, shared-leaderboard isolation, and Studio launch surfaces pass.

## SPARKED gates still open

Current Core Web Vitals, physical PWA/controller/full-run media evidence, reply-as-domain Zoho evidence, project-scoped analytics/error-monitoring evidence, functioning Obelisk relying-party verification, participant fun/balance/comprehension evidence, publication evidence, and explicit SPARKED approval remain open. The engineering deployment does not satisfy or waive them.
