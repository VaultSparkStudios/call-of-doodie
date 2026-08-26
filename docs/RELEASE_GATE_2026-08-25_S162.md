# Release Gate — Session 162

Date: 2026-08-25/26
Project: Call of Doodie
Candidate: S162 corrective-order evidence propagation
Verdict: **GO for the cost-neutral FORGE engineering release; NO-GO for SPARKED.**

## Gate evidence

- CI health: exact source `5d54f90bde9ba1768925a9e024d9fcd48b8d52ae` passed GitHub Actions workflow `32924884085` with Linux lint, all 1,270 assertions, build, and Cloudflare deployment.
- Tests: 220/220 Vitest files and 1,270/1,270 assertions pass. Authoritative serial browser interaction passes 17 runnable cases with one intentional mobile Scenario Cartridge skip.
- Staging: `https://session-162-staging.call-of-doodie.pages.dev/` and immutable `https://1b86fbd2.call-of-doodie.pages.dev/` pass the 7/7 live-site court.
- Visuals: the hosted 20-route × 2-theme × 3-viewport matrix passes 1,020/1,020; the focused evidence-HUD/archive matrix passes 128/128. Fourteen hash-bound captures were directly reviewed with zero blocking defects.
- Security: required headers, HSTS, Content Security Policy, Obelisk routes, edge health, service-worker version, dependency coherence, npm audit zero, settings sanitization, and the Studio supply-chain incident scan pass.
- Public contract: 28/28 public files, claims, proprietary rights language, branding, and footer completeness 18/18 pass.
- Cost: CANON-029 release and cost-bleeder gates both return cost-neutral ALLOW; no dependency, hosted inference, or variable per-player service was added.
- Mobile parity: project attestation exists in `context/MOBILE_PARITY.md`; focused and broad 390px courts pass.
- Rollback: `docs/DEPLOY_ROLLBACK.md` provides the non-force-push revert path. Cloudflare retains prior immutable production `https://39696138.call-of-doodie.pages.dev/`; S162 adds no migration or irreversible external state.
- Authorization: the founder explicitly authorized the complete `/arc`, direct commit/push to `main`, and full deployment.

## Honest exclusions

- The default eight-worker Playwright diagnostic saturated the shared dev host. Serial execution is authoritative; the parallel failures are retained as diagnostics, not called green.
- No participant fun, comprehension, balance, causal, mastery, or retention outcome is claimed.
- Physical PWA/gamepad/media proof, scoped observability, Zoho reply-as evidence, Obelisk account completion, Itch publication, current production Core Web Vitals, and explicit lifecycle promotion remain separate SPARKED gates.

## Release path

Complete. Staging passed first; the canonical closeout source was pushed directly to `main`; workflow `32924884085` passed; immutable `https://d9e689b6.call-of-doodie.pages.dev/` and `https://callofdoodie.wtf/` report deploy `5d54f90bde9b` and pass 7/7 live checks each. Cutover 5/5, replay trust 3/3, leaderboard isolation, and Studio launch surfaces also pass.
