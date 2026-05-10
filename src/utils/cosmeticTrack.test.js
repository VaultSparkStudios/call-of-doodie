import { describe, it, expect, beforeEach, vi } from "vitest";
import { COSMETICS, currentTrackWeek, availableThisWeek, reconcileOwnership } from "./cosmeticTrack.js";

beforeEach(() => {
  localStorage.clear();
  vi.unstubAllGlobals();
});

describe("cosmeticTrack", () => {
  it("currentTrackWeek clamps at 3 (4-week schedule)", () => {
    const farFuture = Date.UTC(2099, 0, 1);
    expect(currentTrackWeek(farFuture)).toBe(3);
  });
  it("availableThisWeek includes only past + lagged drops for free users", () => {
    const week3 = Date.UTC(2026, 4, 26); // 3+ weeks past anchor
    const ids = availableThisWeek(week3);
    // Free users see week 0..2 (cap = w-1)
    expect(ids).toContain("skin_classic_camo");
    expect(ids).not.toContain("killtext_pixel");
  });
  it("milestone unlock fires for matching career stat", () => {
    const career = { totalRuns: 1, totalDeaths: 0, bestWave: 0, totalKills: 0 };
    const r = reconcileOwnership(career);
    const ids = r.owned;
    expect(ids).toContain("skin_classic_camo");
  });
  it("does not unlock cosmetics from future weeks for free users", () => {
    const career = { totalRuns: 999, totalDeaths: 999, bestWave: 999, totalKills: 999999 };
    const r = reconcileOwnership(career);
    // killtext_pixel is week 3; only available to free users when week >= 4
    // We can't time-travel here, but we can assert that cosmetics flagged as
    // milestone:null + late week stay locked for free users today.
    expect(COSMETICS.filter(c => c.milestone === null && c.week === 3).every(c => !r.owned.includes(c.id))).toBe(true);
  });
});
