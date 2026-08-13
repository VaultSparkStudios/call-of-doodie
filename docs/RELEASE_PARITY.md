# Release Parity — Call of Doodie

Last reviewed: 2026-08-12 (Session 152 release candidate)

## Release candidate

- Immutable staging origin: `https://25837962.call-of-doodie.pages.dev/`
- Stable staging alias: `https://session-152-staging.call-of-doodie.pages.dev/`
- Production origin: `https://callofdoodie.wtf/`
- Exact source/workflow/immutable production: `471cd6762b828f61d6bd55e47d614cec47d3abeb` / brief `31657471854` / quality-build-deploy `31657471851` / `https://a1fe44a3.call-of-doodie.pages.dev/`.
- First exact-SHA attempt: `2e56892` / workflow `31656064776` failed its Hot Context freshness court because closeout autopilot stamped PROJECT_STATUS after cache generation. The ordering is root-fixed; no flaky retry claim is made.
- Scope: deploy a cost-neutral engineering update to the existing public FORGE surface. This is **not** a SPARKED lifecycle flip.
- Founder authorization: explicit recovery-first `/goal` and continuous `/arc` direction authorizes direct-main engineering publication and verification only.

## Automated evidence

| Gate | Evidence | Status |
|---|---|---|
| Build and lint | Deployable build, strict ESLint, schema/coherence/architecture/storage/task/runtime gates | Pass |
| Focused tests | Changed-surface drill/mastery/order/browser-contract courts | 57/57 pass |
| Full tests | Final root-fixed closeout tree: 191/191 files and 1,143/1,143 assertions in 126.86s. The first pre-fix run's only failures were generated Hot Context freshness; the new closeout-order/freshness court passes 9/9. | Pass |
| Public contract | 28 public files validated | Pass |
| Broad visual QA | 20 routes × 2 themes × 390/768/1440px on isolated staging | 1,020/1,020 pass |
| CANON-053 receipt | 14 current hash-bound captures, including mastery and drill outcome in both project themes and target widths | Pass; 0 blockers |
| Direct stateful browser | Death → RAGE QUIT → menu order → deploy → death produces LAST ORDER RESULT before ONE VERDICT | Pass |
| Branding/footer | Proprietary rights posture and footer completeness | Pass; 18/18 |
| Cost gates | Release and cost-bleeder gates | Pass; cost-neutral |
| Deploy credentials | Cloudflare 3/3 and Supabase client 2/2 | Ready |
| Security | Release headers/CSP/auth boundary, dependency tree, npm audit | Pass; 0 vulnerabilities |
| Staging parity | Local `dist/index.html` equals hosted staging; exact source then passed quality/build/deploy to immutable production | Pass |
| Core Web Vitals (CWV) | No current S152 Largest Contentful Paint (LCP), Interaction to Next Paint (INP), and Cumulative Layout Shift (CLS) receipt | **Not current — blocks SPARKED** |

The generic Studio responsive script explicitly skipped because it could not resolve its own Playwright dependency. That skip is not counted as a pass; the project-owned hosted Chromium matrix provides stronger functional/visual browser coverage for the engineering release, but does not replace current CWV or physical-device evidence.

## Surface ledger

| Surface | Current evidence | Status |
|---|---|---|
| Desktop browser | Chromium 768/1440px, both themes, 20-route matrix; directly inspected Commander's Orders and two-death outcome state | Automated and subjective pass |
| Mobile browser | Chromium 390px, both themes, 20-route matrix; directly inspected compact mastery and outcome-first receipt | Automated and subjective pass |
| Installed Progressive Web App (PWA) | Install-readiness receipts exist, but no current physical install/relaunch receipt | Manual gate |
| Physical controller/browser | Local input contracts exist, but no current physical-device receipt | Manual gate |
| Native mobile app | No native app is shipped | Not applicable |

## Continuous integration and rollback

- Exact-SHA brief run `31657471854` and quality/build/deploy run `31657471851` pass for source `471cd6762b828f61d6bd55e47d614cec47d3abeb`.
- Cloudflare Pages retains immutable deployments. S152 is verified at `https://a1fe44a3.call-of-doodie.pages.dev/`; the custom domain passes shell 7/7, cutover 5/5, replay trust 3/3, backend health 5/5, shared-leaderboard isolation, and Studio launch-surface checks.
- `docs/DEPLOY_ROLLBACK.md` documents a reversible `git revert` path and smoke checks; reset-hard and force-push are excluded.

## Launch posture

Independent gate verdict: **GO** for the direct-main FORGE engineering update; **NO-GO** for SPARKED/public launch. SPARKED remains blocked by current CWV evidence, physical PWA/controller/full-run media proof, verified on-domain Zoho delivery and reply-as identity, public Itch.io publication, consented participant evidence, project-scoped analytics/error monitoring, functioning Obelisk relying-party verification, and explicit founder SPARKED approval.
