import { describe, expect, it } from "vitest";
import { buildAuditTaskContext, stableSilIdentity, stableTaskHash } from "../scripts/lib/audit-task-context.mjs";

describe("bounded audit task context", () => {
  it("retains every active open item while hashing the source inside its budget", () => {
    const board = [
      "# Task Board",
      "## Now",
      "- [ ] [SIL:2] [S170 #1] Repair the startup receipt",
      "- [x] [SIL:1] Closed item",
      "## Next",
      "- [ ] Ship the bounded projection",
      "## Session 169",
      "- [ ] Historical unchecked item",
    ].join("\n");

    const { payload, rendered } = buildAuditTaskContext(board, {
      sourcePath: "context/TASK_BOARD.md",
      maxChars: 1200,
    });

    expect(payload.ok).toBe(true);
    expect(payload.open).toHaveLength(2);
    expect(payload.open.map((item) => item.section)).toEqual(["Now", "Next"]);
    expect(payload.source.sha256).toHaveLength(64);
    expect(payload.budget.renderedChars).toBeLessThanOrEqual(1200);
    expect(rendered.length).toBe(payload.budget.renderedChars);
  });

  it("uses stable identities without retaining raw historic prose", () => {
    expect(stableSilIdentity("[SIL:2] [S170 #3] Fix it")).toBe("S170#3");
    expect(stableTaskHash("same")).toBe(stableTaskHash("same"));
    expect(stableTaskHash("same")).not.toBe(stableTaskHash("different"));
  });
});
