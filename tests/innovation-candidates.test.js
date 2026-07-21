import { describe, expect, it } from "vitest";
import { dedupeInnovationCandidates } from "../scripts/lib/innovation-candidates.mjs";

describe("innovation candidate identity", () => {
  it("deduplicates the same title even when independent slug pipelines truncate differently", () => {
    const result = dedupeInnovationCandidates([
      { slug: "same-long-task-f", title: "[SIL:2] **Same long task** — verify it" },
      { slug: "same-long-task", title: "[SIL:2] **Same long task** — verify it" },
      { slug: "different", title: "Different candidate" },
    ]);
    expect(result.map((item) => item.slug)).toEqual(["same-long-task-f", "different"]);
  });

  it("applies the limit after deduplication", () => {
    expect(dedupeInnovationCandidates([
      { slug: "a", title: "A" },
      { slug: "a-copy", title: "A" },
      { slug: "b", title: "B" },
    ], 2)).toHaveLength(2);
  });
});
