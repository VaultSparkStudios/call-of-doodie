<!-- generated-by: scripts/compact-handoff.mjs v3.1 -->
<!-- source-hash: 9562ad8e2af5 -->
<!-- generated-at: 2026-08-08T03:18:05.459Z -->

# LATEST_HANDOFF (compact)

Session: 142

What Shipped (S142)
- Live Sewer Network terminal (YOU/COMMUNITY/LIVE) on Home, leaderboard, and post-game surfaces.
- Idempotent run facts + aggregate-only public community contract; browser career data kept device-local.
- Isolated 28 health-check submissions from public rankings/aggregates without deleting evidence.
- Navigable /stats/ snapshot plus /stats-surface.json machine twin, six dated aggregate metrics.
- Field Reports, Last Words, community sentiment counts, opt-in threat recommendations (never silent retune).
- Full Sewer Zombies routing: seeded outbreak tiers, surge pacing, four undead variants, separated leaderboard/history.
- Personal accuracy/playtime/combat/history tracking; corrected desktop/mobile device detection.
- Deployed verified FORGE build to production.

Current Intent
- Post-push verification of the exact-main deploy remains outstanding.

Now Bucket (Top 3)
- Verify exact-main production deploy post-push.
- Collect consented participant evidence before changing balance/progression/fun/retention claims.
- Extract App logic before further expansion; headroom near limit.

Blockers (Top 3)
- SPARKED NO-GO: 390px native-select interaction measured 832ms (perf gate).
- External gates open: physical/email/participant/publication/provider/subjective-review.
- Legacy hours/shots/hits unavailable; not fabricated (partial data).

Human-Blocked (with age)
- Direct subjective pixel review: host viewer fails CryptUnprotectData (blocked since S140, 2 sessions).
- Verified reply-as email / project-scoped PostHog+Sentry credentials (open since S136+, 6 sessions).
- Physical PWA/gamepad/full-run media (open since S136+, 6 sessions).
- Founder release approval (open since S140, 2 sessions).
- HomeV1 retirement pending production funnel evidence (open since S137+, 5 sessions).

Evidence Refs
- Production: callofdoodie.wtf; immutable 8ff1b286; rollback 5d49fd44.
- Vitest 1,011/1,011 across 173 files; pixel court CANON-053 green; Lighthouse perf 1.00, LCP 1,263ms, CLS 0.
- Live receipt: 12 public runs, 5 runners, 259 kills, 119,223 score.

Architecture
- App 4,985/5,000 lines; game loop 1,762/1,775; 34 system + 2 hook boundaries. Narrow headroom.

Next Session: Verify exact-main production deploy, then pursue open external/founder gates toward SPARKED.
