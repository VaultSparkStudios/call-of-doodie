# Release Parity — Call of Doodie

Last reviewed: 2026-08-12

## Release candidate

- Immutable staging origin: `https://684db11d.call-of-doodie.pages.dev`
- Stable staging alias: `https://session-150-staging.call-of-doodie.pages.dev`
- Production origin: `https://callofdoodie.wtf/`
- Immutable production deployment: `https://76855535.call-of-doodie.pages.dev`
- Scope: deploy an engineering update to the existing public FORGE surface. This is **not** a SPARKED lifecycle flip.
- Founder authorization: explicit request to implement the full plan and run `/closeout`.

## Automated evidence

| Gate | Evidence | Status |
|---|---|---|
| Build and lint | Production build, ESLint, schema/architecture/storage/task/runtime gates | Pass |
| Tests | Focused changed-surface court passes 35/35; broad corpus rerun uses a serialized worker under shared-host contention. | Pass for changed surface; broad result recorded separately |
| Public contract | 28 public files validated | Pass |
| Focused homepage visual QA | Front door, live Stats, primary navigation, mobile dock, and open More state; both themes at 390/1440 px | Pass |
| Broad visual QA | 20 routes × 2 themes × 390/768/1440 px | 1020/1020 pass |
| CANON-053 receipt | 6 current, hash-bound captures across both themes and complementary widths | Pass |
| Footer manifest | 18 required public destinations | 18/18 pass |
| Cost gates | Project release gate and cost-neutrality gate | Pass |
| Deploy credentials | Secrets-gateway Cloudflare capability | Ready 3/3 |
| Lighthouse 13.4.1 | Three immutable-origin samples per surface. Default median: performance 1.00, LCP 1,263 ms, CLS 0, TBT 11.5 ms. | Pass for this FORGE update |
| Interaction probe | Desktop mode popover 104 ms; synthetic narrow-viewport native-select interaction 832 ms. | Red for a future SPARKED flip |
| Production smoke | Live shell/health/manifest/service worker/OG 7/7; cutover routes 5/5; replay trust 3/3; focused production visuals 44/44 | Pass |
| Live community data | All recoverable history: 12 public real runs (0 rich, 12 legacy), 5 runners, 259 kills, 119,223 score, 21,628 damage; 28 synthetic health rows remain hidden | Pass |

No Core Web Vitals-green or SPARKED claim is made for this release. The mobile homepage now exposes a fixed Play/Stats/Progress/Loadout/More dock, and the More drawer is a scrollable full-height navigation surface rather than a hidden tool wall.

## Surface ledger

| Surface | Current evidence | Status |
|---|---|---|
| Desktop browser | Chromium at 768/1440 px, desktop controls, both themes, public route matrix | Automated pass |
| Mobile browser | Chromium at 390 px, compact always-ready controls, both themes, public route matrix | Automated functional/visual pass; interaction caveat above |
| Installed Progressive Web App (PWA) | Install-readiness receipts exist, but no current physical install/relaunch receipt | Manual gate |
| Physical controller/browser | Local input contracts exist, but no current physical-device receipt | Manual gate |
| Native mobile app | No native app is shipped | Not applicable |

## Continuous integration and rollback

- The latest five GitHub workflow runs are green, including Cloudflare deployment and brief-format checks.
- Cloudflare Pages retains immutable deployments. Current production is `76855535`; the immediately previous verified rollback target is `https://44e6603d.call-of-doodie.pages.dev/`.
- Exact-source workflow `31566376617` passed quality/build/deploy; production shell 7/7, redirects 5/5, replay trust 3/3, launch surfaces, and focused theme/viewport navigation checks pass.
- The edge health endpoint reports the repository HEAD rather than a dirty-worktree content digest. Static asset identity and immutable deployment URLs are therefore the authoritative proof for this direct deployment.

## Launch posture

Engineering deployment is authorized. SPARKED remains **NO-GO** because physical-device/PWA evidence, contact-provider delivery proof, participant evidence, and the mobile interaction bar remain open. This document does not mark the project launch-ready or SPARKED.
