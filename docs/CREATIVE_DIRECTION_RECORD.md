# Creative Direction Record

This public repo now keeps only public-safe creative-direction summaries.

Boundary:
- detailed private creative direction and internal rationale live in the private Studio OS / ops repository

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
