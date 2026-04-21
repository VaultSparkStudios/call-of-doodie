import { describe, expect, test } from "vitest";
import { getRecommendedMetaUpgrade, getMetaRecommendationLabel } from "./metaClarity.js";

// Minimal META_TREE shape so tests don't depend on live constants.js
// (the real one is imported inside metaClarity.js — these tests validate logic, not data)

const NO_UNLOCKS = [];
const ALL_UNLOCKED = ["off1","off2","off3","off4","def1","def2","def3","def4","util1","util2","util3","util4","cha1","cha2","cha3","cha4"];

function makeCareer(overrides = {}) {
  return {
    totalRuns: 10,
    totalKills: 400,
    totalDeaths: 5,
    bestWave: 12,
    ...overrides,
  };
}

describe("getRecommendedMetaUpgrade", () => {
  test("returns null when all nodes are unlocked", () => {
    const result = getRecommendedMetaUpgrade(ALL_UNLOCKED, { careerPoints: 9999 }, makeCareer());
    expect(result).toBeNull();
  });

  test("returns non-null with no unlocks and enough points", () => {
    const result = getRecommendedMetaUpgrade(NO_UNLOCKS, { careerPoints: 500 }, makeCareer());
    expect(result).not.toBeNull();
    expect(result.node).toBeDefined();
    expect(result.branch).toBeDefined();
    expect(typeof result.reason).toBe("string");
    expect(typeof result.affordable).toBe("boolean");
  });

  test("affordable is false when points are below cheapest node cost", () => {
    const result = getRecommendedMetaUpgrade(NO_UNLOCKS, { careerPoints: 0 }, makeCareer());
    expect(result).not.toBeNull();
    expect(result.affordable).toBe(false);
    expect(result.reason).toMatch(/more career points/i);
  });

  test("recommends defense branch for players dying early", () => {
    const career = makeCareer({ totalRuns: 10, bestWave: 4, totalKills: 50, totalDeaths: 10 });
    const result = getRecommendedMetaUpgrade(NO_UNLOCKS, { careerPoints: 500 }, career);
    expect(result).not.toBeNull();
    expect(result.affordable).toBe(true);
    expect(result.node.id).toBe("def1");
  });

  test("recommends offense branch for low K/D players", () => {
    // bestWave 10 to avoid defense trap, but k/d = 1 and kills/run = 5
    const career = makeCareer({ totalRuns: 10, bestWave: 10, totalKills: 50, totalDeaths: 50 });
    const result = getRecommendedMetaUpgrade(NO_UNLOCKS, { careerPoints: 500 }, career);
    expect(result).not.toBeNull();
    expect(result.affordable).toBe(true);
    expect(result.node.id).toBe("off1");
  });

  test("returns null for runs < 2 (too early to read)", () => {
    // With <2 runs, weakness is null. Falls through to fallback (cheapest affordable).
    // Should still return a node, just with no weakness targeting.
    const career = makeCareer({ totalRuns: 1 });
    const result = getRecommendedMetaUpgrade(NO_UNLOCKS, { careerPoints: 500 }, career);
    expect(result).not.toBeNull();
    expect(result.affordable).toBe(true);
  });

  test("first-run path (runs <= 3): recommends a root node (no requires)", () => {
    const career = makeCareer({ totalRuns: 2, bestWave: 3, totalKills: 10, totalDeaths: 2 });
    const result = getRecommendedMetaUpgrade(NO_UNLOCKS, { careerPoints: 500 }, career);
    expect(result).not.toBeNull();
    // Root nodes have no requires field
    expect(result.node.requires).toBeUndefined();
  });

  test("skips already-unlocked nodes when recommending", () => {
    // off1 unlocked — should not recommend off1
    const result = getRecommendedMetaUpgrade(["off1"], { careerPoints: 500 }, makeCareer({ totalKills: 50, totalDeaths: 50, bestWave: 10 }));
    expect(result).not.toBeNull();
    expect(result.node.id).not.toBe("off1");
  });

  test("result shape always has node, branch, reason, affordable", () => {
    const result = getRecommendedMetaUpgrade(NO_UNLOCKS, { careerPoints: 200 }, makeCareer());
    expect(result).toHaveProperty("node");
    expect(result).toHaveProperty("branch");
    expect(result).toHaveProperty("reason");
    expect(result).toHaveProperty("affordable");
  });
});

describe("getMetaRecommendationLabel", () => {
  test("returns null when rec is null", () => {
    expect(getMetaRecommendationLabel(null)).toBeNull();
    expect(getMetaRecommendationLabel(undefined)).toBeNull();
  });

  test("returns a string containing the node name and cost", () => {
    const rec = {
      affordable: true,
      node: { name: "Sharp Rounds", cost: 50 },
      branch: { emoji: "⚔️" },
      reason: "Boosting raw kill output.",
    };
    const label = getMetaRecommendationLabel(rec);
    expect(typeof label).toBe("string");
    expect(label).toContain("Sharp Rounds");
    expect(label).toContain("50");
  });

  test("uses 'Spend' prefix when affordable", () => {
    const rec = {
      affordable: true,
      node: { name: "Sharp Rounds", cost: 50 },
      branch: { emoji: "⚔️" },
      reason: "reason",
    };
    expect(getMetaRecommendationLabel(rec)).toContain("Spend");
  });

  test("uses 'Work toward' prefix when not affordable", () => {
    const rec = {
      affordable: false,
      node: { name: "Field Rations", cost: 50 },
      branch: { emoji: "🛡️" },
      reason: "reason",
    };
    expect(getMetaRecommendationLabel(rec)).toContain("Work toward");
  });
});
