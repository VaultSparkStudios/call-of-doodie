# Release Parity — Call of Doodie

Last reviewed: 2026-08-12 (Session 151 recovery)

## Release candidate

- Immutable staging origin: `https://1fc32adb.call-of-doodie.pages.dev`
- Stable staging alias: `https://session-151-staging.call-of-doodie.pages.dev/`
- Production origin: `https://callofdoodie.wtf/`
- Immutable production deployment: `https://5be7b044.call-of-doodie.pages.dev`
- Exact source: `1952f5107c1c0e0bf21da053dfe3321271e9156a`
- Exact-source workflow: `31631272045`
- Scope: deploy an engineering update to the existing public FORGE surface. This is **not** a SPARKED lifecycle flip.
- Founder authorization: explicit `/goal` recovery instruction authorizes the S151 closeout and direct-main engineering publication only.

## Automated evidence

| Gate | Evidence | Status |
|---|---|---|
| Build and lint | Exact-source workflow plus local deployable build, strict ESLint, and schema/architecture/storage/task/runtime gates | Pass |
| Tests | Recovery serialized exact-tree court: 191/191 files and 1,138/1,138 assertions; GitHub quality job independently passes | Pass |
| Public contract | 28 public files validated | Pass |
| Focused death-screen visual QA | Revenge brief and RUN THE FIX remain in the first viewport after removing Famous Last Words autofocus; direct mobile/dark and desktop/light review | Pass |
| Broad visual QA | 20 routes × 2 themes × 390/768/1440 px on isolated staging | 1,020/1,020 pass |
| CANON-053 receipt | Eight current, hash-bound captures across dark/light and desktop/mobile widths | Pass |
| Footer manifest | 18 required public destinations | 18/18 pass |
| Cost gates | Project release gate and cost-neutrality gate | Pass |
| Deploy credentials | Secrets-gateway `cloudflare.deploy` capability | Ready 3/3 |
| Security | Release headers/CSP/auth-boundary court plus live npm audit | Pass; 0 vulnerabilities |
| Production smoke | Live shell/health/manifest/service worker/social card 7/7; cutover routes 5/5; replay trust 3/3; backend health 5/5; leaderboard isolation and Studio launch surfaces | Pass |
| Core Web Vitals (CWV) | Prior immutable-origin evidence measured Largest Contentful Paint (LCP) 1,263 ms and Cumulative Layout Shift (CLS) 0, but no current S151 LCP/Interaction to Next Paint (INP)/CLS staging receipt was captured | **Not current — blocks SPARKED** |
| Interaction evidence | S149 isolated staging measured 16 ms mobile and 40 ms desktop after the audio root fix. The old 832 ms native-select result is obsolete, but the newer evidence is not an S151/current-device receipt. | Historical context only |

No current Core Web Vitals-green or SPARKED claim is made for this release. S151 changes the death-to-rematch hierarchy, mastery semantics, stats contract, and arena architecture without changing the established public navigation shell.

## Surface ledger

| Surface | Current evidence | Status |
|---|---|---|
| Desktop browser | Chromium at 768/1440 px, both themes, public route matrix, and direct 1440 px death-screen inspection | Automated pass |
| Mobile browser | Chromium at 390 px, both themes, public route matrix, and direct 390 px death-screen inspection | Automated functional/visual pass |
| Installed Progressive Web App (PWA) | Install-readiness receipts exist, but no current physical install/relaunch receipt | Manual gate |
| Physical controller/browser | Local input contracts exist, but no current physical-device receipt | Manual gate |
| Native mobile app | No native app is shipped | Not applicable |

## Continuous integration and rollback

- Exact-source brief-format run `31631272095` and Cloudflare quality/build/deploy run `31631272045` are green for `1952f5107c1c0e0bf21da053dfe3321271e9156a`.
- Cloudflare Pages retains immutable deployments. Current production is `https://5be7b044.call-of-doodie.pages.dev`; the immediately previous verified production revision is `https://76855535.call-of-doodie.pages.dev/`.
- `docs/DEPLOY_ROLLBACK.md` documents a reversible `git revert` path, smoke checks, and known-good SHA selection; reset-hard and force-push are not part of rollback.
- Production independently passes shell 7/7, redirects 5/5, replay trust 3/3, backend health 5/5, shared-leaderboard isolation, and Studio launch-surface checks.

## Launch posture

Engineering production deployment is verified. SPARKED remains **NO-GO** until current CWV evidence, physical PWA/controller/full-run media proof, verified on-domain delivery and reply-as email identity, public Itch.io publication, consented participant evidence, project-scoped analytics/error monitoring, functioning Obelisk relying-party verification, and explicit founder SPARKED approval all exist. This document does not mark the project launch-ready or SPARKED.
