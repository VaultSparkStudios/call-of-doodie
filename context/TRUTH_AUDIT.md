<!-- truth-audit-version: 1.0 -->
# Truth Audit

Last reviewed: 2026-04-01
Overall status: green
Next action: Validate live leaderboard submit with new clientUid auth path (Edge Functions redeployed this session). Keep PROJECT_STATUS.json blockers current once validation is done.

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
| Schema alignment | 5 | `PROJECT_STATUS.json`, `LATEST_HANDOFF.md`, and `CURRENT_STATE.md` all updated and agree on session 33 state |
| Prompt/template alignment | 4 | Closeout followed synced v2.2 prompt; local prompt files remain dirty but were not part of this session |
| Derived-view freshness | 5 | All Studio OS state files refreshed this session; PROJECT_STATUS.json blockers accurately reflect current state |
| Handoff continuity | 5 | Session 33 handoff accurately reflects commits, deploy status, and remaining human checks |
| Contradiction density | 4 | No contradictions found between state files |
| **Total** | **23 / 25** | |

---

## Drift Heatmap

| Area | Canonical source | Derived surfaces | Status | Last checked | Action |
|---|---|---|---|---|---|
| Project identity | `context/PROJECT_STATUS.json` | `context/PORTFOLIO_CARD.md` | green | 2026-03-31 | Keep derived portfolio/project-card views synced on next founder-facing refresh |
| Session continuity | `context/LATEST_HANDOFF.md` | startup brief | green | 2026-03-31 | None |
| Live state | `context/CURRENT_STATE.md` | founder summaries | green | 2026-04-01 | Validate production submit with new clientUid auth path once Edge Functions are confirmed redeployed |
| Protocol assets | `prompts/` | `docs/templates/project-system/` | yellow | 2026-04-01 | Local prompt files are dirty outside this session; do not assume they were intentionally synced here |

---

## Contradictions

- No active contradiction among `PROJECT_STATUS.json`, `LATEST_HANDOFF.md`, and `CURRENT_STATE.md` after Session 33 refresh.

---

## Freshness

- `context/PROJECT_STATUS.json`: 2026-04-01
- `context/LATEST_HANDOFF.md`: 2026-04-01
- `context/CURRENT_STATE.md`: 2026-04-01
- Derived founder-facing views: not reviewed this session

---

## Recommended Actions

1. Validate live leaderboard submit with the new clientUid auth path once Edge Function redeploy is confirmed.
2. Once submit validates, remove the two remaining blockers from `PROJECT_STATUS.json`.
3. Leave unrelated local prompt-file edits isolated unless they are intentionally being synced in a future protocol session.
