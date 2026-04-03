<!-- truth-audit-version: 1.0 -->
# Truth Audit

Last reviewed: 2026-04-02
Overall status: green
Next action: Re-deploy Edge Functions; validate live leaderboard submit; action Speedrun/Gauntlet achievements ([SIL] 5 sessions overdue).

---

## Source Hierarchy

1. `context/PROJECT_STATUS.json`
2. `context/LATEST_HANDOFF.md`
3. `context/CURRENT_STATE.md`
4. Founder-facing derived Markdown

---

## Protocol Genome (/25)

| Dimension | Score | Notes |
|---|---|---|
| Schema alignment | 5 | All state files updated and agree on session 35 state |
| Prompt/template alignment | 4 | Closeout followed synced v2.2 prompt; local prompt files remain dirty (unchanged from S34) |
| Derived-view freshness | 5 | All Studio OS state files refreshed this session |
| Handoff continuity | 5 | Session 35 handoff accurately reflects live bugs fixed, branding shipped, deploy status, and remaining human checks |
| Contradiction density | 5 | No contradictions found between state files |
| **Total** | **24 / 25** | |

---

## Drift Heatmap

| Area | Canonical source | Derived surfaces | Status | Last checked | Action |
|---|---|---|---|---|---|
| Project identity | `context/PROJECT_STATUS.json` | `context/PORTFOLIO_CARD.md` | green | 2026-04-02 | None |
| Session continuity | `context/LATEST_HANDOFF.md` | startup brief | green | 2026-04-02 | None |
| Live state | `context/CURRENT_STATE.md` | founder summaries | green | 2026-04-02 | Re-deploy Edge Functions + validate submit |
| Protocol assets | `prompts/` | `docs/templates/project-system/` | yellow | 2026-04-01 | Local prompt files dirty outside this session |

---

## Contradictions

- None recorded.

---

## Freshness

- `context/PROJECT_STATUS.json`: 2026-04-02
- `context/LATEST_HANDOFF.md`: 2026-04-02
- `context/CURRENT_STATE.md`: 2026-04-02
- Derived founder-facing views: not reviewed this session

---

## Recommended Actions

1. Re-deploy Edge Functions (`supabase functions deploy issue-run-token submit-score`) — session 33 changes not yet live.
2. Validate live leaderboard submit end-to-end after redeploy.
3. Action [SIL] Speedrun + Gauntlet achievements — 5 sessions overdue.
4. Submit to itch.io for distribution.
