import { describe, expect, it } from "vitest";
import { SOUL_REQUIRED_SECTIONS, validateSoulContract } from "./lib/soul-contract.mjs";

const validSoul = () => ["# Soul", ...SOUL_REQUIRED_SECTIONS.flatMap((section) => [`## ${section}`, `${section} body.`])].join("\n\n");

describe("public-safe soul contract", () => {
  it("accepts the canonical durable section order", () => {
    const result = validateSoulContract(validSoul());
    expect(result).toMatchObject({ ok: true, requiredSections: 8, presentSections: 8, errors: [] });
    expect(result.sourceDigest).toMatch(/^[a-f0-9]{64}$/);
  });

  it("reports missing, duplicate, empty, and out-of-order sections", () => {
    const source = validSoul()
      .replace("## Player Promise\n\nPlayer Promise body.", "")
      .replace("## Tone Rules\n\nTone Rules body.", "## Tone Rules\n\n## Tone Rules\n\nDuplicate.");
    const result = validateSoulContract(source);
    expect(result.errors).toContain("missing required section: Player Promise");
    expect(result.errors).toContain("duplicate required section: Tone Rules");
    expect(result.errors).toContain("empty required section: Tone Rules");
  });

  it("rejects operational session history", () => {
    expect(validateSoulContract(`${validSoul()}\n\nSession 132 shipped a thing.`).errors)
      .toContain("session-ledger syntax belongs in context/CURRENT_STATE.md");
  });
});
