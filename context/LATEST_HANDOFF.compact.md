<!-- fallback truncation (no API key) -->

# Latest Handoff

Session Intent: Diagnose the temporary outage at `vaultsparkstudios.com/call-of-doodie/` (apex resolved on its own — issue was in the org-pages repo, not this one), then evaluate moving the game to its own domain with a full scored hosting/domain comparison, analyze the parody/fair-use posture against Call of Duty&reg;, ship a parody disclaimer to harden trademark defense, and start the migration to Cloudflare Pages with elevated credential access.

## Where We Left Off (Session 56 — parody hardening + standalone-domain migration kickoff)

**Intent outcome:** Achieved on the strategic + code-edit fronts; migration is paused on two manual UI steps that require the founder's account access.

### Concrete changes
- `src/components/HomeV2.jsx` — added parody disclaimer footer below existing footer row, naming Activision Publishing, Inc. and the Call of Duty&reg; mark as unaffiliated/non-endorsed/non-sponsored; visible on every load of the default home (`?home=v2`)
- `src/components/MenuScreen.jsx` — same disclaimer added below the legacy footer for `?home=v1` parity (matches the monospace/Courier styling used by that older surface)

### Strategic deliverables (no code)
- **Hosting comparison** — scored 8 deployment options across cost/perf/DX/reliability/features/migration-effort. Cloudflare Pages (57/60) and Vercel (57/60) tied for top; Cloudflare Pages chosen because free-tier bandwidth is unlimited (Vercel/Netlify cap at 100GB and Vercel free tier blocks "commercial" use which Ko-fi tips arguably trip). GH Pages 49/60. Itch.io 46/60 retained as secondary channel.
- **Domain comparison** — scored `callofdoodie.wtf` (49/60), `playcallofdoodie.com` (47/60), `callofdoodie.win` (35/60). Recommended hybrid (buy both) to capture the comedic upside of `.wtf` and keep `.com` as a hedge for ad-network/press friction. Founder bought both.
- **Parody / fair-use analysis** — copyright fair use is favorable (gameplay is mechanically nothing like CoD, no Activision assets used, transformative-commentary defense is strong). Trademark dilution-by-tarnishment is the live risk vector — Activision has used this theory before, and Ko-fi tips weaken the "noncommercial" parody safe-harbor under §1125(c)(3)(A). Risk while small/indie ~5-15% of a C&D; if it goes viral 25-40%. Mitigations specified: disclaimer footer (now shipped), no Activision assets, no military-aesthetic drift, no `Modern Warfare`/`Black Ops`/`Warzone` sub-titling, never trademark "Call of Doodie", avoid paid CoD-keyword ads, keep poop mascot prominent (best legal-defense asset).

### Migration kickoff (started, then paused)
- Verified `CLOUDFLARE_API_TOKEN` works (active) and listed existing zones: `promogrind.app`, `promogrind.bet`, `usemindframe.com`, `vaultsparkstudios.com` — all on NS pair `journey.ns.cloudflare.com` + `piers.ns.cloudflare.com`
- Attempted to create `callofdoodie.wtf` and `playcallofdoodie.com` zones via API — both stored CF tokens lack `com.cloudflare.api.account.zone.create`; surfaced two paths to founder (add via dashboard manually = ~60s, or generate broader-scope token = ~3min)
- Namecheap API blocked from this machine — current public IP `45.144.114.159` does not match allowlisted `52.124.42.65` in `vaultspark-studio-ops/secrets/namecheap.env`. Surfaced the IP-allowlist update step.

### Validation
- `npx eslint src/components/HomeV2.jsx src/components/MenuScreen.jsx` — clean (exit 0, no output)
- No build run this session; no behavioral changes to the build pipeline

### Remaining work (in order)
- [ ] [Human] Add `callofdoodie.wtf` + `playcallofdoodie.com` as zones in Cloudflare dashboard
- [ ] [Human] Switch Namecheap nameservers for both domains to the CF NS pair
- [ ] [Human] Update Namecheap API IP allowlist to `45.144.114.159` and update `vaultspark-studio-ops/secrets/namecheap.env`
- [ ] Resume next session: create CF Pages project, build wrangler GitHub Actions workflow, attach custom domains, configure 301, change `vite.config.js` base + sw.js cache + manifest paths, update Supabase CORS allowlist, add old-path 301 in `VaultSparkStudios.github.io` repo, retire GH Pages once cutover is verified

## Next Recommended Slice (S57)
- [ ] Resume standalone-domain migration steps 4-9 from `docs/DOMAIN_MIGRATION_PLAN.md` once founder confirms zones + NS are live

## Where We Left Off (Session 55 — UX + perf + identity hardening closeout)

**Intent outcome:** Achieved — all 7 founder concerns addressed (5 implemented, 2 advised); all 10 follow-up items shipped or documented; 10 new tests added (all passing); lint clean; full suite stayed green where it was already green. Remaining work is genuine human/data-gated and roadmap-gated (manual browser QA, Supabase Auth implementation, App.jsx extraction).

### Concrete changes