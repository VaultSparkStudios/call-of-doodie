# Creative Direction Record

This public repo now keeps only public-safe creative-direction summaries.

Boundary:
- detailed private creative direction and internal rationale live in the private Studio OS / ops repository

## 2026-05-14 (Session 62)

- **Founder direction:** Audit the project, generate a genius-level ranked list of improvements across features/UX/AI/security/performance, then implement all unblocked items in one pass at highest quality. Close session with full memory/context/CDR/task-board updates and push to GitHub. Keep `callofdoodie.wtf` as the live canonical URL in all copy and links.
- **Public-safe implementation summary:**
  - Precision hit streak adds the first skill-based economy mechanic: center hits award coins and build toward burst bonuses.
  - Replay share links convert runs into social objects: players can share a single URL that re-creates the exact run conditions for anyone who clicks it.
  - Run Coach now closes the weapon feedback loop with specific advice about dead-weight weapons, over-reliance patterns, and spread-build anti-patterns.
  - Beat-sync spawn particles add perceptual music integration without touching spawn rates or balance.
- **Locked-in invariants this session reinforced:**
  1. **Economy rewards should reward skill, not luck** — precision coins flow from aimed shots, not random crits. This is a design principle worth extending to future reward mechanics.
  2. **Coaching advice must be specific and actionable** — "drop it earlier or upgrade it" is better than "consider a different weapon." The weapon tip system follows this principle.
  3. **Social sharing must be zero-friction** — one button, full URL, no separate code-entry step. The `?replay=` param pattern extends this to any future shareable game state.

## 2026-05-14 (Session 61)

- **Founder direction:** Codex should not fail Studio OS sessions because of a Claude Code plan-mode requirement; fix the protocol mismatch so it does not happen in Codex sessions, then closeout, commit, push, and update memory/context/task-board files.
- **Public-safe implementation summary:**
  - Codex sessions now record plan mode as `not_required` when the session lock identifies the agent as Codex.
  - Canonical domain redirects now keep all public web traffic pointed at `https://callofdoodie.wtf/`.
  - Replay trust follow-up is explicitly blocked on needing real replay inputs, not just an input hash.
- **Locked-in invariants this session reinforced:**
  1. **Agent parity means correct branching, not forced sameness** — Claude-only runtime concepts must not be imposed on Codex.
  2. **Canonical `.wtf` remains the only public brand home** — `www` and backup `.com` are routing surfaces, not separate destinations.
  3. **Trust labels must be honest** — deterministic replay validation cannot be claimed until the server receives data it can replay or verify.

## 2026-05-14 (Session 60)

- **Founder direction:** finish making `callofdoodie.wtf` work, use the expanded Cloudflare studio-access token to complete the cutover, ensure the studio website agent knows where to find the live URL, then closeout and push all context updates.
- **Public-safe implementation summary:**
  - `https://callofdoodie.wtf/` is now the canonical production surface and passed the live-site check.
  - Machine-readable Studio surfaces now advertise the canonical URL, backup `.com`, and stable Cloudflare Pages preview.
  - The broad Cloudflare token unblocked the migration but is intentionally recorded as something to rotate/narrow after stabilization.
- **Locked-in invariants this session reinforced:**
  1. **Agents read context, not chat memory** — the live URL must live in `PROJECT_STATUS`, `STUDIO_MANIFEST`, runtime pack, and startup brief.
  2. **Apex `.wtf` is canonical** — backup and `www` hosts should redirect to `https://callofdoodie.wtf/`, not become parallel brands.
  3. **Broad ops tokens are temporary tools** — use them to unblock, then replace with narrow domain-migration credentials.

## 2026-05-13 (Session 59)

- **Founder direction:** complete the standalone-domain migration from `vaultsparkstudios.com/call-of-doodie/` to `callofdoodie.wtf`, keep `playcallofdoodie.com` as a backup/redirect, and make future project migrations easier through reusable platform automation. Founder also asked whether account creation/sign-in exists today and whether it is integrated with Studio membership.
- **Public-safe implementation summary:**
  - Repo-side migration is implemented: root-scoped Cloudflare Pages build, canonical metadata/share/PWA surfaces, Pages deploy workflow, Pages security headers, and reusable Cloudflare/Namecheap cutover scripts.
  - Cloudflare Pages project is live at a temporary Pages URL and smoke-checks pass. Custom domain activation remains blocked by Cloudflare zone-create permission, not by app code.
  - Current identity posture was confirmed: no public create-account/sign-in UI; callsign + local anon UUID remains the active player identity; Studio membership is a backend-aware path only when an authenticated Supabase user exists.
- **Locked-in invariants this session reinforced:**
  1. **`.wtf` remains canonical** — `playcallofdoodie.com` is a hedge/redirect, not a second brand surface.
  2. **Fallback must stay operational during DNS cutover** — GitHub Pages stays as a manual `/call-of-doodie/` fallback until the apex domain and redirects verify.
  3. **Auth should be explicit, not implied** — supporter badges, callsigns, and Studio membership are distinct concepts until a real sign-in UI ships.

## 2026-05-11 (Session 58)

- **Founder direction:** continue the audit/refinement mandate and implement all recommended items in the optimal order at highest quality, then closeout, commit, and push.
- **Creative read:** the highest leverage was not raw feature count; it was making the prior dynamic-objective foundation feel like an authored player journey. The pass therefore turned objectives into mastery chains, added claimable rivalry bounties, added local next-run intelligence, and made heat visible without drowning the screen.
- **Locked-in invariants this session reinforced:**
  1. **AI can be local intelligence** — Run Brain adds adaptive coaching without LLM calls, preserving token/API budget while still making the app feel smarter.
  2. **Replay/rivalry targets need fixed seeds** — bounties are engaging because the target is reproducible and claimable, not just decorative leaderboard copy.
  3. **Legacy UI stays fallback until data retires it** — MenuScreen is now lazy-loaded; removal waits for Lighthouse/funnel evidence that HomeV2 wins.

## 2026-05-09 (Session 57)

- **Founder direction:** Two-part request — fix the broken Best-Moment GIF after death, *and* signal that "I really like the circle concept added that increases points/score" with a request to brainstorm additional strategic objectives. Then immediately followed with: "Audit project … recommend the top items in one combined list … be as creative and innovative as possible" → "Implement all items at the highest/optimal quality in one pass."
- **Creative read:** The "circle" wasn't yet a feature in code — confirmed with founder. The signal was that the founder wants *moment-to-moment dynamic objectives that hijack player attention without breaking flow*. The right answer was to generalize the concept into a proper subsystem (5 objective types: Hot Zone, Bounty, Sniper, Lockdown, Escort), weighted by player weakness via `metaClarity`, and ship it as the marquee item in a 12-item combined audit list. Founder approved the entire combined list and asked for full implementation in one pass.
- **Locked-in invariants this session reinforced:**
  1. **Cosmetic track stays cosmetic-only** — no gameplay impact, ever; supporter unlock buys early-access + breadth, never power. The supporter-trust posture is a load-bearing brand asset.
  2. **Replay codes share challenges, not solutions** — encode initial conditions only; player choices (routes, mutations, perks) are the *content* and stay player-owned.
  3. **Heat Meter, not combo, drives music tier** — integrative metrics beat reset-prone instantaneous metrics for matching player-felt tension.

## 2026-05-02 (Session 56)

- **Founder direction:** the game is back online again at `vaultsparkstudios.com/call-of-doodie/` (the apex outage resolved on its own); pivot to evaluating a move onto the game's own domain — score every option in detail, analyze whether the comedy/parody framing gives the project any free-use protection from Activision's IP, recommend a domain, recommend a host, then start the migration with elevated credential access. Founder approved the recommendation and bought both `callofdoodie.wtf` and `playcallofdoodie.com` from Namecheap.
- **Public-safe implementation summary:**
  - Strategic comparison shipped: 8 hosting options scored, 3 domain candidates scored, parody/fair-use analysis written. The recommendation was Cloudflare Pages + `callofdoodie.wtf` canonical with `.com` hedge.
  - Parody disclaimer footer added to both `HomeV2.jsx` and `MenuScreen.jsx`. The disclaimer names Activision Publishing, Inc. and the Call of Duty&reg; mark with explicit non-affiliation/non-endorsement/non-sponsorship language. This closes the trademark-dilution-by-tarnishment lane that the parody name itself opens.
  - Migration kickoff began: verified Cloudflare API token, listed existing zones, attempted to create the new zones via API. Both stored CF tokens lack `zone:create` at account scope, so the zone-add step is a manual UI action. Namecheap API is blocked from this machine because the public IP changed since the allowlist was set.
- **Creative posture decisions documented for future sessions:**
  - The poop mascot is now a **legal-defense asset**, not just brand. It's the single biggest reason a parody C&D is unlikely to find consumer confusion. Future creative direction must keep the mascot prominent and must not drift toward CoD-style military aesthetics, camo, soldier silhouettes, or `Modern Warfare` / `Black Ops` / `Warzone` sub-titling.
  - "Call of Doodie" must never be filed as a trademark. Filing would invite an opposition proceeding from Activision and is more provocative than just continuing to use it. The unregistered parody name is the safer position.
  - Paid CoD-keyword advertising is off-limits. Ad spend that bids on Activision's mark is bad-faith use and is the fastest way to a C&D.

## 2026-04-30 (Session 55)

- **Founder direction:** the game is too laggy and has too many customization options; the weapon list is overwhelming and should feel like a level-up reward instead of a flat picker; the Best Moments GIF doesn't work reliably; one of the initial cards on join was unreadable (white text on white card); confirm the user-account system is real (or not); evaluate splitting the game off the studio domain
- **Public-safe implementation summary:**
  - Performance: GIF capture and encode were the heaviest CPU cost in the loop; throttled, smaller offscreen canvas, single shared palette, and skipped entirely on mobile and when sustained frame drops are detected. Adaptive quality is now a first-class runtime concept (`window.__codReducedEffects`), surfaced to the player via a HUD chip
  - Surface area: SettingsPanel split into Quick (6 most-used) + Advanced; default tab = Quick. New Reset-to-defaults button. Goal — a first-time player should never feel they need to read every slider before playing
  - Progression identity: 12 weapons no longer all available from L1. Loadout builder gates weapons behind account-level thresholds tuned so the full arsenal arrives by ~L16 (~2,400 lifetime kills). Existing custom loadouts whose weapon is now locked stay usable as `🔒legacy` so we never punish a player retroactively. Locked weapons can still appear in shops mid-run, preserving discovery
  - Trust + readability: the white-on-white perk card was a same-color text-on-bg pattern in PerkModal plus an invalid-hex bug in DraftScreen; both fixed defensively rather than cosmetically
- **Creative posture decisions documented for future sessions:**
  - User accounts: real auth is not yet a player-facing problem at this scale; trigger Supabase Auth implementation when traffic warrants (≥500 lifetime players) or a paid tier ships, per `docs/AUTH_INTEGRATION_PLAN.md`. Until then, callsign + anon UUID is the explicit, accepted identity model
  - Domain split: defer until ≥1k MAU or paid tier; benefits don't outweigh the operational + analytics fragmentation cost at the current stage

## 2026-04-06

- Founder direction: prepare Call of Doodie to be completely ready for launch to end users
- Public-safe implementation summary: launch plan created; execution begins with Phase 1 validation, release-confidence tooling, and live readiness checks

## 2026-04-14

- Founder direction: audit the project holistically, raise the quality bar on depth/UI-UX/feedback/security/speed, and implement the highest-value blocks first rather than spreading effort thinly across the whole roadmap
- Public-safe implementation summary: the refinement roadmap was recorded in-repo, trust checks were hardened, and the game now leans harder into build identity and decision clarity

## 2026-04-17

- Founder direction: implement the next highest-impact refinement items in one high-quality pass, emphasizing intelligence, engagement, immersion, Studio OS/Hub cohesion, security, speed, organization, and minimal token/API waste
- Public-safe implementation summary: the run-intelligence layer now connects menu guidance, post-run coaching, rivalry memory, local Studio event shape, and compact trust digests without adding LLM/API token spend

## 2026-04-21 (Session 49)

- Founder direction: the HomeV2 redesign shipped in session 48 had silently dropped most menu panels (run history, loadout builder, advanced stats, missions, upgrades, rules, controls, etc.) and kept a stale "Bestiary" label; put every missing panel back in HomeV2 and include a full advanced statistics/analytics page
- Public-safe implementation summary: shared `src/components/MenuPanels.jsx` extracted from MenuScreen exports nine reusable panels; HomeV2 renders a ⚙ COMMAND CENTER chip row that opens each via lazy Suspense; CareerStatsPanel adds accuracy %, crit rate %, kills/min, avg damage/run, survival rate, and total upgrade tiers to the existing Score/Combat/Progression/Meta breakdown; the Bestiary label is renamed to MOST WANTED everywhere in HomeV2

## 2026-04-22 (Session 52 review)

- CDR reviewed — no new creative-direction entries this session
