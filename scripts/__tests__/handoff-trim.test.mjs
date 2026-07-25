import { describe, expect, it } from "vitest";
import { splitHandoffSessions } from "../lib/handoff-trim.mjs";

describe("handoff trim boundaries", () => {
  it("uses top-level session headings instead of nested Where We Left Off blocks", () => {
    const raw = [
      "# Latest Completed Handoff — Session 130",
      "## Where We Left Off (Session 130)",
      "current",
      "# Previous Handoff — Session 129",
      "## Where We Left Off",
      "previous",
      "# Previous Handoff — Session 127",
      "## Where We Left Off",
      "historical",
    ].join("\n");
    const result = splitHandoffSessions(raw);
    expect(result.header).toBe("");
    expect(result.sessions).toHaveLength(3);
    expect(result.sessions[0]).toContain("Session 130");
    expect(result.sessions[1]).toContain("Session 129");
    expect(result.sessions[1]).not.toContain("Session 127");
  });

  it("retains the legacy Where We Left Off fallback", () => {
    const result = splitHandoffSessions("preface\n## Where We Left Off (S2)\nnew\n## Where We Left Off (S1)\nold");
    expect(result.header).toBe("preface");
    expect(result.sessions).toHaveLength(2);
  });
});
