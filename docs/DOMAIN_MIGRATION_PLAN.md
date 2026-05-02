# Domain Migration Plan — Standalone Domain for Call of Doodie

**Started:** 2026-05-02 (Session 56)
**Canonical:** `callofdoodie.wtf` (purchased at Namecheap)
**Hedge / 301 target:** `playcallofdoodie.com` (purchased at Namecheap)
**Target host:** Cloudflare Pages (free tier)
**Status:** Paused at "founder must add zones to Cloudflare dashboard + swap nameservers in Namecheap"

---

## Why this domain + this host

Hosting comparison (free static SPA, browser game traffic profile):

| Option | Score (60) | Notes |
|---|---|---|
| Cloudflare Pages | 57 | Unlimited bandwidth on free tier; preview deploys; Workers ready; chosen |
| Vercel | 57 | Same DX score; 100GB/mo cap + free-tier "non-commercial" restriction |
| Netlify | 53 | Tighter free tier than CF |
| GH Pages (current) | 49 | No previews, no edge functions, soft bandwidth cap |
| Itch.io | 46 | Secondary channel, not canonical home |
| R2 + Pages | 49 | Overkill for current traffic |
| AWS S3 + CloudFront | 45 | Industrial overkill |
| Self-hosted VPS | 36 | Pointless for static SPA |

Domain comparison:

| Domain | Score (60) | Notes |
|---|---|---|
| `callofdoodie.wtf` | 49 | TLD is part of the joke; cheapest; strengthens parody legal posture |
| `playcallofdoodie.com` | 47 | Safer for ad-networks/press; weaker comedic identity; bought as hedge |
| `callofdoodie.win` | 35 | Spam-tainted TLD, trap renewal pricing, rejected |

---

## Migration steps (in order — do not reorder)

### Phase A — DNS prep (founder UI actions)

1. **Add both zones to Cloudflare** (https://dash.cloudflare.com/2d737158a4dde61a7a476a9fda51af2f/add-site)
   - `callofdoodie.wtf` — Free plan
   - `playcallofdoodie.com` — Free plan
   - CF will likely assign `journey.ns.cloudflare.com` + `piers.ns.cloudflare.com` (matches existing zones on this account)

2. **Swap Namecheap nameservers** for both domains
   - Namecheap → Domain List → each domain → Nameservers → Custom DNS
   - Paste both CF NS values
   - Save; propagation up to 24h but usually <1h

3. **Update Namecheap API allowlist**
   - https://ap.www.namecheap.com/Profile/Tools/ApiAccess → update IP to current public IP (`45.144.114.159` as of 2026-05-02; verify with `curl https://api.ipify.org` if changed)
   - Update `NAMECHEAP_WHITELIST_IP` in `vaultspark-studio-ops/secrets/namecheap.env`

4. **(Optional) Generate broader-scope Cloudflare token**
   - https://dash.cloudflare.com/profile/api-tokens → Create Token → Custom token
   - Permissions: `Account → Cloudflare Pages: Edit`, `Account → Account Settings: Read`, `Zone → Zone: Edit`, `Zone → DNS: Edit`, `Zone → Page Rules: Edit`
   - Account Resources: VaultSpark Studios; Zone Resources: All zones from account
   - Append as new entry in `vaultspark-studio-ops/secrets/cloudflare.env` — do NOT replace the existing zone-scoped tokens

### Phase B — Code changes (on `feat/standalone-domain` branch, NOT `main`)

5. **`vite.config.js`** — change `base: "/call-of-doodie/"` to `base: "/"`

6. **`public/sw.js`** — bump cache name `cod-v4` → `cod-v5`; rewrite precache list paths (`/call-of-doodie/` → `/`) and `BASE` constant

7. **`public/manifest.json`** — verify `start_url`, `scope`, and `id` fields don't reference `/call-of-doodie/`

8. **Sweep for hardcoded paths** in `src/` — primary suspects: `src/utils/analytics.js`, `src/storage.js`, `src/components/DeathScreen.jsx` (share URLs), `src/utils/challengeLinks.js`, `src/components/ErrorBoundary.jsx`, `index.html`, `package.json` (homepage field), `README.md`

9. **Update `src/utils/challengeLinks.js`** to use `https://callofdoodie.wtf` as the canonical share-link host

### Phase C — Cloudflare Pages setup (API-driven)

10. **Create CF Pages project** via API: `POST /accounts/:account_id/pages/projects` with `name: "call-of-doodie"`, `production_branch: "main"`

11. **Build a wrangler-based GitHub Actions workflow** at `.github/workflows/deploy-cloudflare.yml`:
   - Same quality + build jobs as current `deploy.yml`
   - Replace the deploy job with `cloudflare/wrangler-action@v3` using `pages deploy dist --project-name=call-of-doodie`
   - Inject `CLOUDFLARE_API_TOKEN` + `CLOUDFLARE_ACCOUNT_ID` from GitHub Secrets

12. **Add GitHub Actions secrets** for `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` (founder UI action; values are in `vaultspark-studio-ops/secrets/cloudflare.env`)

### Phase D — Custom domain attachment

13. **Attach domains to CF Pages project** via API: `POST /accounts/:account_id/pages/projects/:project/domains` for each of `callofdoodie.wtf`, `www.callofdoodie.wtf`, `playcallofdoodie.com`, `www.playcallofdoodie.com`

14. **Set up CF Bulk Redirect** on `playcallofdoodie.com` zone — redirect every path to `https://callofdoodie.wtf$path` (301)

### Phase E — Backend allowlists

15. **Supabase CORS update** — add `https://callofdoodie.wtf`, `https://www.callofdoodie.wtf`, `https://playcallofdoodie.com` to allowed origins on `submit-score`, `issue-run-token`, `kofi-webhook`, `sync-studio-events` Edge Functions

16. **Verify Supabase RLS policies** still pass — no domain-keyed clauses currently, but confirm

17. **PostHog + Sentry project URLs** — update to `https://callofdoodie.wtf` (founder UI action)

### Phase F — Cutover + cleanup

18. **Verify `callofdoodie.wtf` loads end-to-end**: home, leaderboard, gameplay, score submit, Ko-fi link, share-link generation

19. **Add 301 redirect** in `VaultSparkStudios.github.io` repo: when path matches `/call-of-doodie/...`, serve a meta-refresh + canonical link to `https://callofdoodie.wtf$path`

20. **Disable GH Pages** in this repo (Settings → Pages → "Source: None") OR keep `deploy.yml` running for 7d as a fallback before disabling

21. **Update README, in-game footer (`vaultsparkstudios.com` → `callofdoodie.wtf`), Ko-fi page link, social posts**

22. **Submit to itch.io** with the new canonical URL

---

## Risks + watch-points

- **PWA cache (`cod-v4` in `sw.js`)** — must bump to `cod-v5` so existing installs invalidate cleanly; otherwise stale paths
- **Loadout share-code QRs in the wild** — encode the old URL; will keep working only via the 301 redirect from `vaultsparkstudios.com/call-of-doodie/`
- **Analytics continuity** — PostHog will treat the new domain as a separate site by default; decide whether to merge or restart history
- **SEO** — moving will reset PageRank; set up Search Console for the new domain on day 1 + submit a change-of-address from the apex repo's Search Console property
- **Nameserver propagation lag** — up to 24h where the domain may resolve inconsistently; keep GH Pages live during the window
- **Email** — if Cloudflare Email Routing is set up later (e.g. `founder@callofdoodie.wtf`), Namecheap's free email forwarding stops working once nameservers move

---

## Credentials reference

Stored in `vaultspark-studio-ops/secrets/`:
- `cloudflare.env` — `CLOUDFLARE_API_TOKEN` (zone-scoped, lacks zone-create), `CLOUDFLARE_ACCOUNT_ID=2d737158a4dde61a7a476a9fda51af2f`, `CLOUDFLARE_DNS_TOKEN` (also zone-scoped)
- `namecheap.env` — `NAMECHEAP_API_USER`, `NAMECHEAP_API_KEY`, `NAMECHEAP_USERNAME`, `NAMECHEAP_WHITELIST_IP=52.124.42.65` (stale; current public IP is 45.144.114.159)
- `studio-supabase-api.txt` — for CORS allowlist updates

CF account ID: `2d737158a4dde61a7a476a9fda51af2f`
Existing zone NS pair: `journey.ns.cloudflare.com`, `piers.ns.cloudflare.com`
