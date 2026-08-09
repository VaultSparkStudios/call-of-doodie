# Implement Plan — Session 145 (2026-08-09)

Source: docs/AUDIT_2026-08-09.json (18 items). Order is efficiency-sorted (shared-file batching), not raw priority. Default rung L2. Each phase ends at a green checkpoint commit.

## Phase 1 — Trust & gates
1. website-freshness-correctness-bundle (L2) — HP undefined, difficulty count, NEW_FEATURES, changelog, disclaimer coverage, dates, og:image, Command Deck naming, keep-exploring self-link
2. mobile-inp-and-bundle-gate (L2) — lazy-boundary bundle recovery + narrow-viewport INP remediation
3. retro-pack-contract-guard (L2) — Retro render-path call-shape test before any renderer work

## Phase 2 — Crisp foundation
4. game-canvas-dpr-crisp-rendering (L2) — DPR ≤2 backing store + perf fallback
5. adaptive-perf-degradation-ladder (L2) — 3-step ladder (particles/trails → shadowBlur/ambient → DPR/motion)

## Phase 3 — Asset batch (one assets:generate run)
6. weapon-sprite-arsenal-pack (L2) — 12-weapon atlas + dock integration + contract
7. world-object-sprite-pack (L2) — pickups/grenade/hazards/cart/props atlas

## Phase 4 — Renderer batch (one drawGame.js pass)
8. enemy-render-demud (L2) — single-layer sprite policy + Karen v2 wiring
9. sprite-motion-microsystem (L2) — velocity lean, hit squash, spawn pop, sprite death
10. projectile-impact-fx-pass (L2) — tracers, sparks, decals, muzzle upgrade, additive glow
11. arena-theme-identity-pass (L2) — THEMES table, pattern tiles, wall treatment, ambient, animated hotspots

## Phase 5 — Stats spotlight (founder-directed)
12. community-stats-panel-and-page-v2 (L2) — shared store (kill duplicate pollers), sparklines, YOU-vs-COMMUNITY, records, /stats/ rebuild

## Phase 6 — Loops & intelligence
13. ghost-rivalry-persistence (L2) — localStorage best-per-mode
14. progression-loops-deepening (L2) — per-weapon mastery, nemesis border, prestige ritual
15. midrun-tactical-whisper (L2) — rate-limited deterministic mid-run coaching

## Phase 7 — Home & site streamlining
16. onboarding-funnel-merge (L2) — one Commander's Orders surface
17. website-redundancy-consolidation (L2) — registry footer, TRUST OPS gating, share consolidation, Support naming

## Phase 8 — Hardening & diet
18. edge-security-hardening (L2) — headers, obelisk-verify origin/quota, validate-replay decision, HMAC fallback audit
19. docs-token-diet (L2) — archive AUDIT_*/CLOSEOUT_BRIEF_* behind index + measurement

Then: /closeout (commit+push per protocol).
