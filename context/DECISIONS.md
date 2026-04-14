# Decisions

Public-safe decisions only. Detailed internal decision history is maintained privately.

## 2026-04-06 — CANON-008: All VaultSpark IP is proprietary by default

**Decision:** All code, content, assets, and designs created by VaultSpark Studios are proprietary and all rights are reserved by VaultSpark Studios LLC unless an open-source license is explicitly declared and approved by the Studio Owner. No agent may apply or imply an open-source license without Studio Owner direction.

**Applies to this project:** Yes — `docs/RIGHTS_PROVENANCE.md` reflects this project's specific license status.

**Rationale:** VaultSpark Studios LLC is a commercial entity building owned IP. Open-sourcing any project without deliberate strategy gives away commercial advantage and creates ownership ambiguity.

**Studio canon:** `vaultspark-studio-ops/docs/STUDIO_CANON.md` → CANON-008

---

## 2026-04-07 — Launch observability is post-launch, not a launch gate

**Decision:** PostHog and Sentry remain optional for this launch window and should be treated as explicit post-launch follow-up rather than a pre-launch blocker.

**Applies to this project:** Yes — the active launch blockers are real-device QA, screenshots, listing publication, and one shared-table compatibility check.

**Rationale:** The current user-facing risk is not a missing analytics key; it is finishing the remaining manual launch execution. Repeatable launch verification already exists in repo for smoke coverage, live Edge Function checks, and live site shell checks.

---

## 2026-04-07 — Cloudflare Worker config must be source-controlled

**Decision:** The security-header worker and the Call of Doodie path-specific CSP override are tracked in-repo under `cloudflare/` instead of remaining dashboard-only.

**Applies to this project:** Yes — the live deployment path depends on CSP settings that are specific to this game.

**Rationale:** Dashboard-only CSP edits create drift, make rollback harder, and leave future deploy/debug sessions dependent on copy-paste state instead of the repo.

---

## 2026-04-07 — Launch media pack is sufficient for immediate listing publication

**Decision:** A prepared launch media pack in `public/launch-assets/` is sufficient to unblock immediate store/distribution publication; real gameplay screenshots are optional follow-up variants, not a launch gate.

**Applies to this project:** Yes — the listing blocker is publication readiness, not the absence of literal raw captures.

**Rationale:** The repo can ship branded, accurate, ready-to-upload media immediately. Waiting on manual capture work would keep a solved distribution step artificially blocked.

---

## 2026-04-14 — Trust, feedback, and build identity outrank broad feature expansion

**Decision:** Near-term in-repo work should prioritize leaderboard trust, stronger post-run guidance, and clearer build identity before broadening content breadth further.

**Applies to this project:** Yes — the product already has high feature breadth, and the higher-return gap is clarity/cohesion rather than raw count of modes or perks.

**Rationale:** New content added into an unclear decision loop compounds noise. Strengthening trust, feedback, and build direction improves retention and makes later pacing/readability work more valuable.

---

## 2026-04-14 — Protocol syncs must preserve repo-local executability

**Decision:** When syncing this repo to newer Studio OS prompt/protocol versions, prompt text may not be copied blindly if it would leave `start` or `closeout` pointing at commands that do not exist in this repo.

**Applies to this project:** Yes — this public game repo consumes Studio OS prompts but does not carry the full Studio OS script inventory locally.

**Rationale:** A nominal prompt upgrade that references missing commands is worse than staying on an older protocol because it creates false procedural guarantees. This repo now keeps local wrappers/templates for required checks while delegating shared operations to the sibling `vaultspark-studio-ops` repo where appropriate.

---
