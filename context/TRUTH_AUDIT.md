<!-- truth-audit-version: 1.0 -->
# Truth Audit

Last reviewed: 2026-03-31
Overall status: green
Next action: Validate the live leaderboard submit path in production and keep derived status surfaces aligned with the deployed state.

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
| Schema alignment | 5 | `PROJECT_STATUS.json`, `LATEST_HANDOFF.md`, and `CURRENT_STATE.md` now agree on deployed launch/security state |
| Prompt/template alignment | 4 | Closeout followed the synced v2.2 prompt; local prompt files remain dirty but were not part of this session's truth changes |
| Derived-view freshness | 4 | Core Studio OS state files were refreshed after the deploy/workflow repair |
| Handoff continuity | 5 | Session 32 handoff accurately reflects commits, workflow status, and remaining human checks |
| Contradiction density | 4 | One stale placeholder truth audit existed; refreshed this session |
| **Total** | **22 / 25** | |

---

## Drift Heatmap

| Area | Canonical source | Derived surfaces | Status | Last checked | Action |
|---|---|---|---|---|---|
| Project identity | `context/PROJECT_STATUS.json` | `context/PORTFOLIO_CARD.md` | green | 2026-03-31 | Keep derived portfolio/project-card views synced on next founder-facing refresh |
| Session continuity | `context/LATEST_HANDOFF.md` | startup brief | green | 2026-03-31 | None |
| Live state | `context/CURRENT_STATE.md` | founder summaries | green | 2026-03-31 | Validate production submit once, then no action |
| Protocol assets | `prompts/` | `docs/templates/project-system/` | yellow | 2026-03-31 | Local prompt files are dirty outside this session; do not assume they were intentionally synced here |

---

## Contradictions

- No active contradiction among `PROJECT_STATUS.json`, `LATEST_HANDOFF.md`, and `CURRENT_STATE.md` after Session 32 refresh.

---

## Freshness

- `context/PROJECT_STATUS.json`: 2026-03-31
- `context/LATEST_HANDOFF.md`: 2026-03-31
- `context/CURRENT_STATE.md`: 2026-03-31
- Derived founder-facing views: not reviewed this session

---

## Recommended Actions

1. Validate the live leaderboard submit path and shared-project compatibility so runtime truth matches repo truth.
2. Refresh any founder-facing derived views from `context/PROJECT_STATUS.json` if they display pre-deploy blocker language.
3. Leave unrelated local prompt-file edits isolated unless they are intentionally being synced in a future protocol session.
