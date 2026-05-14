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
    expect(r.killedBy.toLowerCase()).toContain("ended");
  });
  it("recommends top weapon when share is high", () => {
    const runSummary = { topWeapon: { weapon: { name: "Pistol", emoji: "🔫" }, share: 0.7 }, wave: 12 };
    const r = buildRunCoach({ runSummary });
    expect(r.working).toMatch(/Pistol/);
  });
  it("includes a persistent zero-cost run brain summary", () => {
    const r = buildRunCoach({ runHistory: [{ wave: 4, score: 3000 }, { wave: 5, score: 6000 }] });
    expect(r.brain.archetype).toBe("survival_gap");
    expect(r.brain.nextExperiment.length).toBeGreaterThan(0);
  });
  it("returns weaponTip when a weapon has < 8% of kills", () => {
    // 12 weapons — weapon 1 gets 1 kill, weapon 0 gets 50 → wasteShare = 1/51 ≈ 2%
    const wk = new Array(12).fill(0);
    wk[0] = 50; wk[1] = 1;
    const r = buildRunCoach({ runSummary: { weaponKills: wk } });
    expect(r.weaponTip).toBeTruthy();
    expect(typeof r.weaponTip).toBe("string");
  });
  it("returns null weaponTip when no kills", () => {
    expect(buildRunCoach({ runSummary: { weaponKills: [] } }).weaponTip).toBeNull();
    expect(buildRunCoach({ runSummary: { weaponKills: [0, 0] } }).weaponTip).toBeNull();
  });
  it("returns enemy-specific evasion tip when a boss-type enemy is the repeat killer", () => {
    const career = { recentDeathsByEnemy: [{ t: "4", ts: 1 }, { t: "4", ts: 2 }, { t: "4", ts: 3 }] };
    const r = buildRunCoach({ career });
    // Type 4 is Karen — should include the word "charge" from the tip
    expect(r.killedBy.toLowerCase()).toContain("charge");
  });
  it("returns four fields including weaponTip on every call", () => {
    const r = buildRunCoach({});
    expect("killedBy" in r).toBe(true);
    expect("tryNext" in r).toBe(true);
    expect("working" in r).toBe(true);
    expect("weaponTip" in r).toBe(true);
  });
});
