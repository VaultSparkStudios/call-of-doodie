# Deployment Rollback — Call of Doodie

This is the executable rollback path for a bad Cloudflare Pages deployment. It never force-pushes and does not treat the stale GitHub Pages fallback as current staging.

## Trigger

Rollback when any post-deploy check shows a player-blocking regression, corrupted competitive data, broken legal/security surface, or a launch gate that was green before deployment and is now red.

## Evidence first

1. Record the failing URL, Coordinated Universal Time (UTC), commit SHA, browser/device, and exact command output.
2. Run the local production checks without pipes so their exit codes remain visible:
   - npm run live:site-check
   - npm run post-cutover:smoke
   - npm run replay:trust-smoke
3. Identify the last known-good main SHA from a successful Deploy to Cloudflare Pages workflow run.

## Rollback path

1. Sync safely with git pull --rebase origin main.
2. Inspect the suspect range with git log --oneline KNOWN_GOOD..HEAD and git diff KNOWN_GOOD..HEAD.
3. Revert the smallest bad commit with git revert BAD_SHA. For a multi-commit fault, revert newest to oldest. Never reset or force-push.
4. Run the full local gate:
   - npm run lint
   - npm test
   - npm run build
   - npm run launch:qa
5. Push the revert commit directly to main. The Cloudflare workflow deploys the corrected build.
6. Watch the exact workflow run to completion and record its run ID and deployed SHA.

## Verify recovery

Run each command directly and record its exit code:

- npm run live:site-check
- npm run post-cutover:smoke
- npm run replay:trust-smoke

Verify these routes return their intended content rather than the game shell:

- /privacy/
- /terms/
- /contact/
- /agents.json
- /.well-known/llms.txt
- /sitemap.xml

## If the revert cannot deploy

1. Do not change Domain Name System (DNS) or publish the stale GitHub Pages fallback without a new verified build.
2. Disable affected competitive submissions at the narrowest available application or edge-function gate if data integrity is at risk.
3. Preserve logs and workflow output.
4. Use the Studio secrets gateway for Cloudflare/Supabase access; never paste credentials into shell history.
5. Escalate only if the provider dashboard requires hardware-key, billing, or account-owner confirmation.

## Recovery complete

Recovery is complete only when the deployed SHA is known, all direct smoke commands pass, competitive labels remain honest, and the incident evidence is appended to the session work log or incident record.
