import { describe, expect, it } from "vitest";
import { buildCloseoutNextHint } from "../scripts/lib/closeout-next.mjs";

describe("closeout next-session hint", () => {
  it("renders schema-2 exhaustion as evidence, not a missing cache", () => {
    expect(buildCloseoutNextHint({
      schemaVersion: "2.0",
      summary: { executable: 0, deferred: 6, exhausted: true },
      items: [{ title: "Production evidence", executable: false }],
    })).toEqual({
      title: "Repo-executable Genius List exhausted",
      rationale: "6 deferred item(s) remain visible behind evidence, credential, community, or product-decision gates.",
      cmd: "node scripts/ops.mjs genius-list",
    });
  });

  it("selects the first executable schema-2 item", () => {
    expect(buildCloseoutNextHint({
      items: [
        { title: "Deferred", executable: false },
        { title: "Ship this", executable: true, reason: "Live premise", command: "npm test" },
      ],
    })).toMatchObject({ title: "Ship this", rationale: "Live premise", cmd: "npm test" });
  });

  it("retains the legacy ranked-cache contract", () => {
    expect(buildCloseoutNextHint({
      list: { ranked: [{ id: "legacy", title: "Legacy item", rationale: "Still actionable" }] },
    })).toMatchObject({ title: "Legacy item", rationale: "Still actionable" });
  });
});
