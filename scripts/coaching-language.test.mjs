import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("evidence-ranked coaching language", () => {
  it("keeps causal labels out of the death-screen presentation", () => {
    const source = readFileSync(resolve(import.meta.dirname, "../src/components/DeathScreen.jsx"), "utf8");
    expect(source).not.toContain("CAUSE OF COLLAPSE");
    expect(source).not.toContain("Diagnosis:");
    expect(source).toContain("collapseCoaching.primary.label");
    expect(source).toContain("collapseCoaching.contributingFactor.label");
  });
});
