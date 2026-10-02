import { describe, expect, it } from "vitest";
import { PUBLIC_CAPABILITIES, publicCapabilityManifest } from "./capabilities.js";
import { ROADMAP, roadmapSections } from "./roadmap.js";
import { MODE_CATALOG } from "../config/modeCatalog.js";
import { buildPublicGameplayContract } from "../../scripts/lib/public-gameplay-contract.mjs";

describe("public capability truth", () => {
  it("never presents an unavailable service as shipped", () => {
    expect(new Set(PUBLIC_CAPABILITIES.map((entry) => entry.id)).size).toBe(PUBLIC_CAPABILITIES.length);
    expect(PUBLIC_CAPABILITIES.filter((entry) => entry.group === "shipped").every((entry) => ["local", "live"].includes(entry.availability))).toBe(true);
    expect(roadmapSections().find(([group]) => group === "Next")[1]).toContain("Not available on the current deployment");
    expect(ROADMAP.shipped.flat().join(" ")).not.toContain("Cross-device career recovery");
    expect(publicCapabilityManifest().capabilities.every((entry) => entry.route && entry.evidenceDate)).toBe(true);
  });

  it("publishes the actual mode catalog labels for replay-compatible modes", () => {
    const contract = buildPublicGameplayContract();
    for (const mode of MODE_CATALOG) expect(contract.modes.find((entry) => entry.id === mode.id)?.label).toBe(mode.label);
    expect(contract.modes.find((entry) => entry.id === "speedrun")?.label).toBe("Timed Survival");
  });
});
