<!-- generated-by: scripts/compact-handoff.mjs v3.1 -->
<!-- source-hash: 713380e44c41 -->
<!-- generated-at: 2026-07-03T02:38:04.705Z -->

# LATEST_HANDOFF (compact)

Where We Left Off — Session 116

Session
- Current: 116. Direct-to-main workflow, HomeV2 default.

Shipped (S116)
- Legacy MenuScreen now routes to shared MenuPanels.jsx (Rules, Controls, Most Wanted, Run History, Loadout Builder, Missions, Upgrades, What's New) instead of inline runtime branches. Coverage-backed.

Trust Posture
- Unchanged. HomeV2 is default launch surface; full legacy v1 deletion still gated on production Lighthouse/funnel evidence. Replay gate remains advisory/heuristic_pressure_estimate (no full enemy/physics parity).

Validation Baseline
- Full npm test 600/600; lint clean; build passing; replay state-stepper 4/4; edge replay fixtures 4/4; launch media check passing; git diff --check clean.

Now (top 3)
- Observe GitHub Actions Cloudflare Pages deploy for S116 commit, then rerun live smoke + post-cutover smoke.
- Full five-scene screenshot replacement (needs verified browser captures for boss, build/debrief, leaderboard before manifest/media update).
- validate-replay Phase 2B: port deterministic replay slices (movement/aim + combat + contact-enemy) from src/utils/replayResim.js into edge function; currently unconsumed.

Blockers (top 3)
- Deterministic replay enemy/physics parity: larger-scope, touches live score/anti-cheat validation. Not force-shipped.
- Five-scene screenshots: require real browser captures not yet taken.
- Full legacy v1 deletion: waits on production evidence.

Human-Blocked (device/credential/data-gated)
- Physical launch QA: real PWA install standalone relaunch + one real gamepad/browser combo. Open since ~S109-110.
- Supabase sync-studio-events live deploy: credential-gated (SUPABASE_ACCESS_TOKEN). Since ~S102.
- PostHog/Sentry production analytics: dashboard/GitHub-secret gated. Since ~S104.
- Itch.io publication: manual. Since ~S104.

Next session: Confirm S116 Cloudflare deploy succeeded and rerun live + post-cutover smoke, then start validate-replay Phase 2B edge-function port.
