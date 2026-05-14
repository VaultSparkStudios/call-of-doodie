# Cloudflare Security Headers Worker

This directory source-controls the legacy Cloudflare Worker used to apply
security headers on `vaultsparkstudios.com`. The standalone Cloudflare Pages
deployment uses `public/_headers` instead.

## Why it exists

- the legacy `vaultsparkstudios.com/call-of-doodie/` deployment already
  depends on a Cloudflare Worker for CSP
- Call of Doodie needs a path-specific override instead of broadening the
  studio-wide policy for unrelated routes
- keeping the worker in source control avoids dashboard-only drift

## Call of Doodie requirements

The legacy `/call-of-doodie/` route needs:

- `blob:` in `img-src` for GIF highlight playback
- Supabase HTTP + WebSocket allowance in `connect-src`
- Cloudflare Insights endpoint allowance

## Deploy

1. Install Wrangler locally if needed.
2. Update route and zone settings in the Cloudflare dashboard or local Wrangler
   config for the target account.
3. Publish this worker and bind it to the existing `vaultsparkstudios.com/*`
   path handling used by the studio.
4. Re-run `npm run live:site-check` after deploy.

For the standalone domain, update `public/_headers` and deploy through
Cloudflare Pages instead.

## Notes

- This repo stores the worker code and defaults, not account secrets.
- If the studio-wide base CSP changes elsewhere, update `BASE_CSP` here to
  match before publishing.
