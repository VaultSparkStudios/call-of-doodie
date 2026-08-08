# Canon Adoption — Call-Of-Doodie

> ACTIVELY CHECKED against the live `vaultspark-studio-ops/docs/STUDIO_CANON.md` (founder directive S183).
> Refresh: `node ../vaultspark-studio-ops/scripts/check-canon-adoption.mjs --project . --write`.
> Suggest: `node ../vaultspark-studio-ops/scripts/check-canon-adoption.mjs --project . --suggest` uses conformance evidence to pre-fill safe suggestions.
> Mark each: **adopted** · **pending** · **review** · **exempt (reason)**. This file is maintained, not auto-trusted.

Audience: public-unlaunched · Live ACTIVE canons: 54 · Pending review: 0

| Canon | Title | Status | Evidence / note |
|---|---|---|---|
| CANON-001 | Rolling Status headers use HTML comment markers for programm | adopted | Conformance passed: rolling-status markers and content exist. |
| CANON-002 | Sessions 1–3 are a Calibration Window, excluded from studio- | adopted | Historical SIL records preserve the calibration window; current scoring uses later sessions. |
| CANON-003 | prompts/initiate.md is separate from prompts/start.md for to | adopted | Conformance passed: distinct initiate and start prompts exist. |
| CANON-004 | studioOsApplied: true requires Layer 1 SIL format, not just  | adopted | Conformance passed: the Layer 1 rolling-status contract is present. |
| CANON-005 | CDR gap recovery check is mandatory at startup and closeout  | adopted | Conformance passed in prompts/start.md, prompts/closeout.md, and docs/SESSION_PROTOCOL.md. |
| CANON-006 | Every public-facing product must display VaultSpark Studios  | adopted | Generated public footers link VaultSpark Studios LLC and public contract validation passes. |
| CANON-007 | Every project must have a staging environment before deployi | adopted | PROJECT_STATUS declares isolated Cloudflare Pages staging; exact-session previews are verified before production claims. |
| CANON-008 | All VaultSpark IP is proprietary by default; open-source lic | adopted | public/ip, terms, footer, and docs/RIGHTS_PROVENANCE.md use proprietary/all-rights-reserved posture. |
| CANON-009 | SIL rubric is 10 × 100 = 1000 (v3.0) | adopted | Conformance passed: ten categories sum to the 1,000-point SIL score. |
| CANON-010 | Claude Code and Codex must have strict skills + hooks + MCP  | adopted | Repo-local .codex hooks, agent guide, skill map, and protocol parity checks are present. |
| CANON-011 | Every public-facing project must follow the universal sitema | adopted | One route registry generates sitemap, human pages, and agent resources; local public contract passes 27 files. |
| CANON-012 | Every studio agent resolves credentials via the secrets gate | adopted | Deployment and capability preflights use the Studio secrets gateway; launch readiness accepts only redacted status inputs. |
| CANON-013 | Every project picks one of 3 canonical low-cost archetypes a | adopted | Vite static delivery plus Cloudflare Pages and Functions is the declared low-cost web archetype. |
| CANON-015 | Claude Max Plan first; API requires founder approval + cost  | adopted | Execution-budget ledger declares flat-rate plan token efficiency, not cash spend; no new paid API use ships. |
| CANON-016 | Studio OS protocol/process/enforcement propagates ecosystem- | adopted | Protocol drift and startup acceptance enforce the propagated command surface without local canon forks. |
| CANON-017 | Free, long-term, scaleable integrations preferred; build-vs- | adopted | Runtime coaching, replay, Pulse, and trust features are local/deterministic with no variable per-user cost. |
| CANON-018 | All cross-repo agent communication MUST flow through Studio  | adopted | Cross-repo findings and handoffs use scripts/ark.mjs cargo; sibling trees are not mutated. |
| CANON-019 | Founder-Action Discipline (try first, label blocked only wit | adopted | Shared task semantics and provider-aware blocker rules require secrets and elevated preflights before human-blocking. |
| CANON-020 | Analytica is the canonical Studio analytics + insight plane | adopted | Local Studio event contracts preserve Analytica-compatible evidence; missing PostHog remains a scoped provider gate. |
| CANON-021 | Obelisk is the Studio-wide trust + capability protocol | adopted | Obelisk routes, verification Function, Passport receipt, and explicit guest-first trust boundaries are implemented. |
| CANON-022 | Agent Co-Authoring Protocol | adopted | Implementer owns this repo; canon/checker ownership defects are routed to Studio Ops through Ark. |
| CANON-023 | Obelisk Package Trust gates every agent install/download | adopted | No package was added in this session; dependency changes remain package-trust gated by AGENTS.md. |
| CANON-024 | Broad approvals require non-malicious action verification | adopted | Founder-Twin hooks and bounded command-family approvals are source-controlled under .codex. |
| CANON-025 | Trinity role separation: VEILOS · IGNIS · Obelisk | adopted | Project surfaces consume trust/insight roles without redefining VEILOS, IGNIS, or Obelisk ownership. |
| CANON-026 | IGNIS visibility scope (private-by-default) | adopted | Public pages expose product facts, not private IGNIS strategy or portfolio intelligence. |
| CANON-027 | PQC migration-ready language discipline | adopted | No public post-quantum security claim is made; cryptographic integrity wording remains bounded. |
| CANON-028 | Founder Identity Privacy (no personal name, no personal emai | adopted | Public contact uses role/domain aliases and contains no personal founder name or private address. |
| CANON-029 | Free-Tier Cost Discipline (no variable cost on free plans) | adopted | Guest play and all promoted features are local/static; no variable-cost free-tier capability is introduced. |
| CANON-030 | Acronym Expansion in Public Content (spell it out, acronym i | adopted | Public contracts and launch copy spell out Progressive Web App before PWA and validation covers generated pages. |
| CANON-031 | Observability Honesty (no lying surfaces) | adopted | Release, replay, visual, performance, and provider receipts separate measured, inferred, unknown, and blocked states. |
| CANON-032 | Build-Optimal for Flagships (no premature constraint) | adopted | Executable architecture/runtime ratchets protect quality while cohesive boundaries are extracted instead of raising ceilings. |
| CANON-033 | Launch Announcement Discipline (no silent launches) | adopted | Lifecycle remains FORGE and all readiness surfaces retain a SPARKED NO-GO without a launch announcement. |
| CANON-034 | Browser Experience Excellence (browser is never second-class | adopted | Keyboard, pointer, touch, gamepad, PWA, desktop/mobile Playwright, and hosted browser courts are first-class gates. |
| CANON-035 | Project Brand Identity (every project designs its own profes | adopted | SOUL, porcelain/arcade theme, proprietary characters, and generated brand assets are project-specific. |
| CANON-036 | Deploy Currency Discipline (production must not silently lag | adopted | PROJECT_STATUS records exact staging/prod surfaces and production outcomes are never inferred from staging. |
| CANON-037 | Canon Half-Life and Automated Consistency (re-confirmation c | adopted | Live canon sync, conformance, adoption, and protocol drift run at startup and closeout. |
| CANON-038 | Shared Studio Self-Host Server (one Hetzner box · isolated p | exempt (static Cloudflare Pages project) | The deployable surface is static Cloudflare Pages/Functions and requires no shared-server workload. |
| CANON-039 | Build-It-Ourselves, Internal-First, OSS-Research Discipline  | adopted | Audit checked INTERNAL_TOOLS.md; all implementation uses existing local code and zero new dependencies. |
| CANON-040 | Agent-Deployed Migrations (AI agents apply database/infra mi | adopted | Supabase migration and Function deployment entrypoints exist; applicable safe migrations are agent-executable. |
| CANON-041 | Website Mobile Parity + Elite Visual Craft (full desktop↔mob | adopted | Hosted visual court covers desktop/mobile widths, themes, routes, and touched states; physical/subjective evidence stays separate. |
| CANON-042 | Studio Branding System: approved usages, DBA rule, and the e | adopted | Generated footer manifest provides linked VaultSpark Studios LLC ownership and current-year rights text. |
| CANON-043 | Baseline repository security hygiene (free-tier: Dependabot  | adopted | Security release gate, pinned Actions, Dependabot workflow, strict headers, secret scans, and npm audit courts exist. |
| CANON-044 | In-session task scaffolding (Phase/Wave lists), reconciled a | adopted | Session 140 maintains a five-wave plan and docs/IMPLEMENT_PLAN.md for current execution. |
| CANON-045 | Obelisk is the unified studio identity + auth plane (one stu | adopted | STUDIO_MANIFEST declares external Obelisk architecture; explicit login/callback routes preserve guest-first play. |
| CANON-046 | Canon weighting: tiers + autonomy-first conflict resolution  | adopted | Conformance passed matrix integrity with zero ABSOLUTE gaps; safe repo-owned work proceeds autonomously. |
| CANON-047 | Theme system + AI-verified human readability (no unreadable  | adopted | Dark/light/project themes and complete hosted contrast/geometry matrices exist; subjective inspection limits are explicit. |
| CANON-048 | Dual-audience ecosystem: every surface built for Humans AND  | adopted | agents.json, llms.txt, JSON-LD, gameplay contract, Field Manual, and human pages derive from shared sources. |
| CANON-049 | Continuous evolution: the studio + every project is never st | adopted | Repeated audit/implement/innovation cycles and frontier radar preserve evidence-led continuous improvement. |
| CANON-050 | Atlas: the foundation that carries the ecosystem — and the s | exempt (project is not Atlas) | Call of Doodie consumes Studio foundations but does not own the Atlas foundation contract. |
| CANON-051 | Web Hardening: every public surface meets the edge-security  | adopted | Source-controlled CSP/HSTS/security headers, health Function, standard files, and npm audit gate pass. |
| CANON-052 | Project Lifecycle Ladder: FORGE/SPARKED/VAULTED with sub-sta | adopted | PROJECT_STATUS and release receipts keep the project in FORGE until every SPARKED gate is evidenced. |
| CANON-053 | Rendered-Pixel UI Discipline: look at the real interface whi | adopted | Hosted route/theme/viewport courts and hash-bound visual receipts are mandatory for UI changes; unavailable subjective viewing is not fabricated. |
| CANON-054 | Public Stats Surface: every website reports and analyzes its | adopted | `/stats/` publishes a dated six-metric release snapshot with interpretations, scope, privacy-safe aggregates, and `/stats-surface.json`; the live Sewer Network remains the current in-game view. |
| CANON-055 | Surface Follow-Through: every project change reaches the thi | adopted | Session 142 reaches Command Deck, leaderboard, debrief, Zombies gameplay, and the public stats route; 12 hash-bound gameplay captures and the hosted route court prove visible follow-through. |
