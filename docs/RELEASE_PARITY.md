# Release Parity — Call of Doodie

Last reviewed: 2026-08-07

## Release candidate

- Immutable staging origin: `https://23d4ae98.call-of-doodie.pages.dev`
- Stable staging alias: `https://session-142-staging.call-of-doodie.pages.dev`
- Production origin: `https://callofdoodie.wtf/`
- Immutable production deployment: `https://8ff1b286.call-of-doodie.pages.dev`
- Scope: deploy an engineering update to the existing public FORGE surface. This is **not** a SPARKED lifecycle flip.
- Founder authorization: explicit request, “deploy it.”

## Automated evidence

| Gate | Evidence | Status |
|---|---|---|
| Build and lint | Production build, ESLint, schema/architecture/storage/task/runtime gates | Pass |
| Tests | 1,011/1,011 passed across 173 files in the final full run; the security smoke uses a bounded 90 s host-load allowance with assertions unchanged. | Pass |
| Public contract | 27 public files validated | Pass |
| Focused gameplay visual QA | Command Deck, public stats, leaderboard, post-game Field Report, Zombies, both themes, 390/1440 px | 60/60 pass |
| Broad visual QA | 20 routes × 2 themes × 390/768/1440 px | 1020/1020 pass |
| CANON-053 receipt | 12 current, hash-bound captures across both themes | Pass |
| Footer manifest | 17 public surfaces | 17/17 pass |
| Cost gates | Project release gate and cost-neutrality gate | Pass |
| Deploy credentials | Secrets-gateway Cloudflare capability | Ready 3/3 |
| Lighthouse 13.4.1 | Three immutable-origin samples per surface. Default median: performance 1.00, LCP 1,263 ms, CLS 0, TBT 11.5 ms. | Pass for this FORGE update |
| Interaction probe | Desktop mode popover 104 ms; synthetic narrow-viewport native-select interaction 832 ms. | Red for a future SPARKED flip |
| Production smoke | Live shell/health/manifest/service worker/OG 7/7; cutover routes 5/5; replay trust 3/3; focused production visuals 44/44 | Pass |
| Live community data | 12 public real runs, 5 runners, 259 kills, 119,223 score, 21,628 damage; 28 synthetic health rows remain hidden | Pass |

The interaction result is recorded as a real caveat. No Core Web Vitals-green or SPARKED claim is made for this release. The mobile Command Deck now exposes its compact mode and difficulty selectors directly, avoiding a hidden overlay and preserving complete mode parity.

## Surface ledger

| Surface | Current evidence | Status |
|---|---|---|
| Desktop browser | Chromium at 768/1440 px, desktop controls, both themes, public route matrix | Automated pass |
| Mobile browser | Chromium at 390 px, compact always-ready controls, both themes, public route matrix | Automated functional/visual pass; interaction caveat above |
| Installed Progressive Web App (PWA) | Install-readiness receipts exist, but no current physical install/relaunch receipt | Manual gate |
| Physical controller/browser | Local input contracts exist, but no current physical-device receipt | Manual gate |
| Native mobile app | No native app is shipped | Not applicable |

## Continuous integration and rollback

- The aggregate recent workflow view contains successes and neutral Dependabot skips. Supabase’s recent deploy sequence is green; Cloudflare’s latest four deploy runs are green, with one older superseded failure still inside its five-run window.
- Cloudflare Pages retains immutable deployments. Current production is `8ff1b286`; the immediately previous production rollback target is `https://5d49fd44.call-of-doodie.pages.dev` (`28f24af`).
- The custom domain and immutable production deployment both serve `assets/index-Ds1eK-77.js`, proving static-asset parity despite edge HTML variation.
- The edge health endpoint reports the repository HEAD rather than a dirty-worktree content digest. Static asset identity and immutable deployment URLs are therefore the authoritative proof for this direct deployment.

## Launch posture

Engineering deployment is authorized. SPARKED remains **NO-GO** because physical-device/PWA evidence, contact-provider delivery proof, participant evidence, and the mobile interaction bar remain open. This document does not mark the project launch-ready or SPARKED.
