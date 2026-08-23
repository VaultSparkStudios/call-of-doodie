# Release Parity — Call of Doodie

Last reviewed: 2026-08-23 (Session 159 production verification)

## Session 159 verified release

- Application source: `0864686b6b4f499276f7626a588d66f266db2c52`; synchronized with `origin/main` before the final evidence seal.
- Exact staging: `https://session-159-staging.call-of-doodie.pages.dev/`; immutable `https://9499adda.call-of-doodie.pages.dev/`. Broad hosted pixels pass 1,020/1,020, focused Operation pixels pass 48/48, completion pixels pass 36/36, and 30 hash-bound captures received direct review.
- Production: `https://callofdoodie.wtf/`; immutable `https://017af042.call-of-doodie.pages.dev/`. Both typed health endpoints report `0864686b6b4f`.
- Continuous integration: quality/build/deploy workflow `32626881275` and Dependabot workflow `32626942358` passed the exact application source.
- Local and continuous-integration corpus: 219/219 files and 1,254/1,254 tests; strict lint, deployable build, schema/public/security/dependency/assets/media/runtime gates, staged secret scan, supply-chain incident scan, and npm audit zero pass. Browser E2E passes 19 cases with one intentional mobile-only skip.
- Live evidence: shell/edge/manifest/service-worker/social-card checks pass 7/7 on immutable and custom origins; cutover passes 5/5; backend passes 5/5; replay trust passes 3/3; shared-leaderboard isolation, Studio launch surfaces, and production Operation pixels 48/48 pass.
- Scope: cost-neutral FORGE engineering update. This is not a SPARKED lifecycle transition, participant conclusion, score-balance claim, campaign expansion, realtime co-op launch, or launch announcement.
- Rollback: Cloudflare retains immutable `9499adda` staging plus previous production revisions; `docs/DEPLOY_ROLLBACK.md` provides the non-force-push revert path.

Engineering release evidence is complete for Session 159. SPARKED remains NO-GO behind the separately listed lifecycle, provider, participant, physical-device, performance, identity, publication, sitemap, and founder-approval gates.

## Session 158 verified release

- Application source: `bdbf396c0148f1388a44e1eed95d51b30369824f`; synchronized with `origin/main` before the final evidence seal.
- Exact staging: `https://session-158-staging.call-of-doodie.pages.dev/`; immutable `https://09d33af3.call-of-doodie.pages.dev/`. Broad hosted pixels pass 1,020/1,020 and focused Operation pixels pass 36/36; 18 hash-bound captures received direct review.
- Production: `https://callofdoodie.wtf/`; immutable `https://ee00b749.call-of-doodie.pages.dev/`. Both typed health endpoints report `bdbf396c0148`.
- Continuous integration: brief-format workflow `31986725453` and quality/build/deploy workflow `31986725436` passed the exact application source.
- Local and continuous-integration corpus: 215/215 files and 1,229/1,229 tests; strict lint, deployable build, schema/public/security/dependency/assets/media/runtime gates, staged secret scan, supply-chain incident scan, and npm audit zero pass. Browser E2E passes 19 cases with one intentional mobile-only skip.
- Live evidence: shell/edge/manifest/service-worker/social-card checks pass 7/7 on immutable and custom origins; cutover passes 5/5; backend passes 5/5; replay trust passes 3/3; shared-leaderboard isolation, Studio launch surfaces, and production Operation pixels 36/36 pass.
- Scope: cost-neutral FORGE engineering update. This is not a SPARKED lifecycle transition, participant conclusion, audio-tuning claim, campaign expansion, realtime co-op launch, or launch announcement.
- Rollback: Cloudflare retains immutable `09d33af3` staging plus previous production revisions; `docs/DEPLOY_ROLLBACK.md` provides the non-force-push revert path.

Engineering release evidence is complete for Session 158. SPARKED remains NO-GO behind the separately listed lifecycle, provider, participant, physical-device, performance, identity, publication, sitemap, and founder-approval gates.

## Session 157 verified release

- Application source: `5ce42226349b2c3998745d33dd8d4115382885b4`; synchronized with `origin/main`.
- Exact staging: `https://session-157-staging.call-of-doodie.pages.dev/`; immutable `https://906bded2.call-of-doodie.pages.dev/`. Broad hosted pixels pass 1,020/1,020 and focused Operation pixels pass 36/36; 26 hash-bound captures received direct review.
- Production: `https://callofdoodie.wtf/`; immutable `https://228f133b.call-of-doodie.pages.dev/`. Both typed health endpoints report `5ce42226349b`.
- Continuous integration: brief-format workflow `31970693660` and quality/build/deploy workflow `31970693652` passed the exact source.
- Local and CI corpus: 212/212 files and 1,214/1,214 tests; strict lint, deployable build, schema/public/security/dependency/assets/media/runtime gates, staged secret scan, and npm audit zero pass. Browser E2E passes 19 cases with one intentional mobile-only skip.
- Live evidence: shell/edge/manifest/service-worker/social-card checks pass 7/7 on immutable and custom origins; cutover passes 5/5; backend passes 5/5; replay trust passes 3/3; shared-leaderboard isolation, Studio launch surfaces, and production Operation pixels 36/36 pass.
- Scope: cost-neutral FORGE engineering update. This is not a SPARKED lifecycle transition, participant conclusion, realtime co-op launch, or launch announcement.
- Rollback: Cloudflare retains immutable `906bded2` staging plus previous production revisions; `docs/DEPLOY_ROLLBACK.md` provides the non-force-push revert path.

Engineering release evidence is complete for Session 157. SPARKED remains NO-GO behind the separately listed lifecycle, provider, participant, physical-device, performance, identity, publication, and founder-approval gates.

## Session 155 verified release

- Application source: `7e613d4e6854b0f9fd960143976e31277fbda79e`; synchronized with `origin/main` before this documentation-only evidence seal.
- Exact staging: `https://session-155-staging.call-of-doodie.pages.dev/`; immutable `https://213212ad.call-of-doodie.pages.dev/`. Both typed health endpoints report `7e613d4e6854`, and hosted chunks contain `BLACKSITE FLUSH` plus `operation-state-v1`.
- Production: `https://callofdoodie.wtf/`; immutable `https://e1017435.call-of-doodie.pages.dev/`. Both typed health endpoints report `7e613d4e6854`.
- Continuous integration: corrective quality/build/deploy workflow `31931957413` passed after clean Linux CI caught and the repository corrected five deterministic generated public artifacts.
- Production evidence seal: source `b37da9ccae4b60f6964a3188409834ae12f74901` passed brief workflow `31932656756` and quality/build/deploy workflow `31932656740`, serving immutable `https://068d27b2.call-of-doodie.pages.dev/`.
- Local and CI corpus: 209/209 files and 1,205/1,205 tests; strict lint, schema/architecture, public 28/28, dependency/runtime/assets/security, deployable build, staged secret scan, supply-chain incident scan, and npm audit zero pass.
- Browser evidence: exact staging broad matrix 1,020/1,020 and Operation runtime 36/36 pass; the canonical receipt additionally covers completion/command-post states 36/36 and hash-binds 26 directly reviewed captures across both themes and 390/1440px.
- Live evidence: production shell/edge/manifest/service-worker/social-card 7/7 and domain cutover 5/5 pass. Supabase function smokes are separately transport-degraded on this host (`UND_ERR_SOCKET other side closed`) and are not represented as current passes; the Operation runtime is local-first and does not depend on those functions.
- Scope: cost-neutral FORGE engineering update. This is not a SPARKED lifecycle transition, campaign-progression activation, realtime co-op launch, or launch announcement.
- Rollback: Cloudflare retains immutable `e1017435`; the previous production `a4be8e57` remains available, and `docs/DEPLOY_ROLLBACK.md` provides the non-force-push revert path.

Engineering release evidence is complete for the solo Operation increment. SPARKED remains NO-GO behind the separately listed lifecycle, provider, participant, physical-device, performance, and founder-approval gates.

## Session 153 release record

- Immutable staging origin: `https://d7ec86f1.call-of-doodie.pages.dev/`
- Stable staging alias: `https://session-153-staging.call-of-doodie.pages.dev/`
- Production origin: `https://callofdoodie.wtf/`
- Published source: `4b78142e0b3744c024f42e44f971ab89c8939b0f`; brief-format workflow `31743411548`, Supabase workflow `31743411535`, Cloudflare quality/build/deploy workflow `31743411559`.
- Immutable production: `https://c9ee3b5e.call-of-doodie.pages.dev/`; typed production health reports deploy prefix `4b78142e0b37`.
- Final verifier seal: source `10c05add70f4dadbc9b3fc25f215bad2c1797392`; brief-format workflow `31745229611`, Cloudflare quality/build/deploy workflow `31745229701`, immutable `https://ce9e4ae3.call-of-doodie.pages.dev/`. Both immutable and custom-domain health report deploy prefix `10c05add70f4`.
- Previous known-good production: source `471cd6762b828f61d6bd55e47d614cec47d3abeb`, Cloudflare workflow `31657471851`, immutable `https://a1fe44a3.call-of-doodie.pages.dev/`.
- Scope: cost-neutral FORGE engineering update. This is not a SPARKED lifecycle transition or launch announcement.
- Founder authorization: the explicit `/arc` request plus direct commit/push and full-deployment authorization covers this engineering publication and verification.

## Automated evidence

| Gate | Evidence | Status |
|---|---|---|
| Full tests | Published source: 195/195 files and 1,153/1,153 assertions in exact-SHA CI; verifier seal: 196/196 files and 1,155/1,155 assertions locally | Pass |
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

Production follow-through found one verifier-only defect after the live application passed: the three backend CLI probes resolved a generic Studio Supabase capability belonging to another project. The application itself used the correct deployed client configuration and passed a real 11/11 production player transaction. The probes and deployable build now validate the project ref and resolve public client configuration through the gateway or the deployed/public artifact; direct `.env` reads remain removed. Corrected probes pass backend 5/5, replay 3/3, and leaderboard isolation against `fjnpzjjyhnpmunfoycrp`.

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
- Exact implementation source `4b78142e…` and verifier seal `10c05add…` pass their brief-format and Cloudflare quality/build/deploy workflows; the implementation source also passed the Supabase deployment workflow.
- Cloudflare Pages retains immutable deployments. `docs/DEPLOY_ROLLBACK.md` documents a reversible `git revert` path; reset-hard and force-push are excluded.
- Current known-good rollback-forward target is `10c05add70f4dadbc9b3fc25f215bad2c1797392` / `https://ce9e4ae3.call-of-doodie.pages.dev/`; implementation rollback target is `4b78142e…` / `https://c9ee3b5e.call-of-doodie.pages.dev/`, and prior fallback remains `471cd676…` / `https://a1fe44a3.call-of-doodie.pages.dev/`.

## Release verdict

Independent gate verdict: **DEPLOYED AND VERIFIED** for the authorized direct-main FORGE engineering update. **NO-GO** for SPARKED/public launch.

SPARKED remains blocked by current CWV evidence, physical PWA/controller/full-run media proof, verified on-domain Zoho delivery and reply-as identity, public Itch.io publication, consented participant outcomes, project-scoped product analytics/error monitoring, functioning Obelisk relying-party verification, sitemap score ≥8/10, and explicit founder SPARKED approval.
