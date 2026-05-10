import { describe, it, expect } from "vitest";
import { computeKillPoints, isInHotZone } from "./scoreLedger.js";

describe("scoreLedger", () => {
  it("multiplies all factors then floors", () => {
    expect(computeKillPoints({ basePoints: 10, comboMult: 1.5, killScoreMult: 1.2, routeKillScoreMult: 1.1 }))
      .toBe(Math.floor(10 * 1.5 * 1.2 * 1.1));
  });
  it("applies hot-zone multiplier only when player is inside zone", () => {
    const objective = { type: "hot_zone", scoreMult: 3, contains: (p) => p.x < 100 };
    expect(computeKillPoints({ basePoints: 10, activeObjective: objective, playerPos: { x: 50, y: 0 } })).toBe(30);
    expect(computeKillPoints({ basePoints: 10, activeObjective: objective, playerPos: { x: 200, y: 0 } })).toBe(10);
  });
  it("ignores objective if it's not a hot_zone type", () => {
    const objective = { type: "bounty", scoreMult: 5, contains: () => true };
    expect(computeKillPoints({ basePoints: 10, activeObjective: objective, playerPos: { x: 0, y: 0 } })).toBe(10);
  });
  it("isInHotZone returns false when nothing active", () => {
    expect(isInHotZone(null, { x: 0, y: 0 })).toBe(false);
  });
});
