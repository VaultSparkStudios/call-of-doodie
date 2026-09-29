# Session 178 engineering release gate

**Decision:** GO for the authorized FORGE deployment. The project remains public-unlaunched; no SPARKED promotion is implied.

- Exact gameplay source: `237003e8884148b44ecee10c30dd0da7066f3f57`; GitHub Actions workflow `36509845993` passed quality, build and Cloudflare deploy.
- Isolated staging: `https://ce59619c.call-of-doodie.pages.dev/` passed shell 7/7 and hosted Chrome 28/28. Fourteen hash-bound dark/light, desktop/mobile screenshots were directly inspected; `docs/visual-qa/LATEST.json` passed CANON-053.
- Production: `https://773a1f58.call-of-doodie.pages.dev/` and `https://callofdoodie.wtf/` reported `237003e88841` and passed shell 7/7 each. Cutover 5/5, backend 5/5, replay trust 3/3 and leaderboard isolation passed.
- Local release gates: 261 test files / 1,668 assertions, strict lint, deployable build, public contract, schema, security and supply-chain checks passed. Dependency audit found zero vulnerabilities.
- Rollback: follow `docs/DEPLOY_ROLLBACK.md` to restore the prior Cloudflare Pages deployment and verify `/_health`, shell and domain routing.

The public `/stats` route is absent despite the aggregate feed (CANON-054 STRONG gap). Participant play, physical devices, current Core Web Vitals, Zoho reply-as, scoped telemetry and Obelisk integration remain separate launch evidence.

This receipt binds the gameplay build. A later closeout-only commit is verified through its own CI/deployment run without changing the gameplay findings above.
