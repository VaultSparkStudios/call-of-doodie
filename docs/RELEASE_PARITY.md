# Release Parity — Call of Doodie

Last reviewed: 2026-08-13 (Session 153 release candidate)

## Release candidate

- Immutable staging origin: `https://d7ec86f1.call-of-doodie.pages.dev/`
- Stable staging alias: `https://session-153-staging.call-of-doodie.pages.dev/`
- Production origin: `https://callofdoodie.wtf/`
- Candidate source: the verified Session 153 tree atop `bc1e1c5`; exact direct-main commit/workflow/immutable production identifiers are recorded after the authorized push finishes.
- Previous known-good production: source `471cd6762b828f61d6bd55e47d614cec47d3abeb`, Cloudflare workflow `31657471851`, immutable `https://a1fe44a3.call-of-doodie.pages.dev/`.
- Scope: cost-neutral FORGE engineering update. This is not a SPARKED lifecycle transition or launch announcement.
- Founder authorization: the explicit `/arc` request plus direct commit/push and full-deployment authorization covers this engineering publication and verification.

## Automated evidence

| Gate | Evidence | Status |
|---|---|---|
| Full tests | Final tree: 195/195 files and 1,153/1,153 assertions | Pass |
| Build and code quality | Deployable build, strict ESLint, schema/coherence/architecture/storage/task/runtime gates | Pass |
| Public contract | 28 public files validated | Pass |
| Broad visual QA | 20 routes × 2 themes × 390/768/1440px on isolated staging | 1,020/1,020 pass |
| Replay Passport state | Fourth planned-pressure lane at 390/1440px in both themes | 32/32 pass |
| Real playtest signal flow | Deploy → natural defeat → four structured answers → aggregate command post at 390/1440px in both themes | 44/44 pass |
| CANON-053 receipt | 18 hash-bound captures with direct rendered-pixel review | Pass; 0 blockers |
| Hosted shell | Immutable staging HTML, typed health, manifest, service worker, social card | 7/7 pass |
| Backend health | Token issuance, accepted/rejected submissions, replay defense | 5/5 + 3/3 pass |
| Run/event data plane | Staging origin-echo CORS, unrelated Pages origin 403, canonical run signature, rated event ingestion | Live verified |
| Shared leaderboard | Latest 200-readable-row isolation court | Pass; only `cod` rows |
| Branding/footer | Public contract plus Studio footer completeness | Pass; 18/18 destinations |
| Cost gates | Release and cost-bleeder gates | Pass; `cost-neutral` |
| Deploy credentials | Cloudflare deploy and Supabase admin/client/management | Ready |
| Security | Explicit origins, hashed quotas, dependency tree, supply-chain incident scan, npm audit | Pass; 0 vulnerabilities |
| Package trust | Nanoid 3.3.18 security override reviewed through Obelisk plus official registry metadata/integrity | Pass |
| Core Web Vitals (CWV) | No current Session 153 Largest Contentful Paint (LCP), Interaction to Next Paint (INP), and Cumulative Layout Shift (CLS) receipt | Not current — blocks SPARKED |

The generic Studio responsive helper explicitly skipped because it could not resolve its standalone Playwright package. That skip is not counted as a pass. The project-owned pinned-Chromium matrix is the authoritative engineering-release browser court, but it does not replace physical-device or current CWV evidence.

## Surface ledger

| Surface | Current evidence | Status |
|---|---|---|
| Desktop browser | Chromium at 768/1440px across 20 routes and both themes; direct review of Playtest Flight Receipt, Command Post, and Replay Passport | Automated and subjective pass |
| Mobile browser | Chromium at 390px across 20 routes and both themes; persistent navigation, structured chips, aggregates, and advisory copy remain readable | Automated and subjective pass |
| Installed Progressive Web App (PWA) | Install-readiness receipts exist, but no current physical install/relaunch receipt | Manual SPARKED gate |
| Physical controller/browser | Input contracts exist, but no current physical-device receipt | Manual SPARKED gate |
| Native mobile app | No native app is shipped | Not applicable |

## Continuous integration and rollback

- The latest two Cloudflare production runs are green. Four of the last five are green; the one failure is the already-documented Session 152 Hot Context ordering defect, root-fixed before two subsequent green runs. All five latest brief-format runs are green.
- The exact Session 153 SHA must pass both brief-format and Cloudflare quality/build/deploy workflows after push; a local/staging pass does not substitute for this.
- Cloudflare Pages retains immutable deployments. `docs/DEPLOY_ROLLBACK.md` documents a reversible `git revert` path; reset-hard and force-push are excluded.
- Previous known-good application rollback target remains `471cd6762b828f61d6bd55e47d614cec47d3abeb` / `https://a1fe44a3.call-of-doodie.pages.dev/` until the Session 153 production court finishes.

## Release verdict

Independent gate verdict: **GO** for the authorized direct-main FORGE engineering update, conditional on exact-SHA CI/deployment and post-production smoke. **NO-GO** for SPARKED/public launch.

SPARKED remains blocked by current CWV evidence, physical PWA/controller/full-run media proof, verified on-domain Zoho delivery and reply-as identity, public Itch.io publication, consented participant outcomes, project-scoped product analytics/error monitoring, functioning Obelisk relying-party verification, sitemap score ≥8/10, and explicit founder SPARKED approval.
