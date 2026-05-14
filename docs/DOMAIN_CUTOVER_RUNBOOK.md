# Call of Doodie Domain Cutover Runbook

Canonical domain: `https://callofdoodie.wtf/`
Backup domain: `https://playcallofdoodie.com/` -> 301 to canonical
Host: Cloudflare Pages project `call-of-doodie`

## Preflight

1. Add `callofdoodie.wtf` and `playcallofdoodie.com` as Cloudflare zones.
2. In Namecheap, set each domain's nameservers to the exact pair Cloudflare assigns.
3. Add GitHub Actions secrets:
   - `CLOUDFLARE_API_TOKEN`
   - `CLOUDFLARE_ACCOUNT_ID`
   - existing Vite/Supabase/PostHog/Sentry secrets remain required.
4. Keep GitHub Pages fallback enabled until the canonical domain passes smoke checks for at least 7 days.

## Cloudflare Apply

Dry run:

```sh
npm run domain:cloudflare:plan
```

Apply:

```sh
npm run domain:cloudflare:apply
```

The helper verifies or creates:

- Pages project `call-of-doodie`
- Pages domains: `callofdoodie.wtf`, `www.callofdoodie.wtf`, `playcallofdoodie.com`, `www.playcallofdoodie.com`
- 301 redirect from `www.callofdoodie.wtf/*` to `callofdoodie.wtf/*`
- 301 redirect from both `playcallofdoodie.com/*` hosts to `callofdoodie.wtf/*`

## Verification

```sh
npm test
npm run lint
npm run build
COD_LIVE_URL=https://callofdoodie.wtf/ npm run live:site-check
COD_SITE_ROOT=https://vaultsparkstudios.com/ COD_LIVE_URL=https://callofdoodie.wtf/ npm run launch:surfaces
```

Then browser-check: home load, game start, score submit, leaderboard, share links, PWA install, and service worker cache refresh.

## Old Path Redirect

After `callofdoodie.wtf` passes verification, update the apex `VaultSparkStudios.github.io` repo so `/call-of-doodie/*` redirects to `https://callofdoodie.wtf/*`.

Do not remove the old path until redirects are verified from a clean browser profile.
