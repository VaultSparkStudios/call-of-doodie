import { describe, it, expect } from "vitest";
import { buildRunCoach } from "./runCoach.js";

describe("runCoach", () => {
  it("returns three non-empty lines for a default run", () => {
    const r = buildRunCoach({});
    expect(typeof r.killedBy).toBe("string");
    expect(typeof r.tryNext).toBe("string");
    expect(typeof r.working).toBe("string");
    expect(r.killedBy.length).toBeGreaterThan(0);
  });
  it("highlights repeating killer when ledger has >=2 of same type", () => {
    const career = {
      recentDeathsByEnemy: [
        { t: "0", ts: 1 },
        { t: "0", ts: 2 },
        { t: "5", ts: 3 },
      ],
    };
    const r = buildRunCoach({ career });
    expect(r.killedBy.toLowerCase()).toContain("killed you");
  });
  it("recommends top weapon when share is high", () => {
    const runSummary = { topWeapon: { weapon: { name: "Pistol", emoji: "🔫" }, share: 0.7 }, wave: 12 };
    const r = buildRunCoach({ runSummary });
    expect(r.working).toMatch(/Pistol/);
  });
});
