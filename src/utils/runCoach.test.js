import { describe, it, expect } from "vitest";
import { buildRunCoach, buildWeaponDeathCoach, buildDoctrineNearMissTip } from "./runCoach.js";

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
  it("builds an enemy lab counter-drill for repeated killers", () => {
    const career = { recentDeathsByEnemy: [{ t: "4", ts: 1 }, { t: "4", ts: 2 }, { t: "4", ts: 3 }, { t: "4", ts: 4 }] };
    const r = buildRunCoach({ career, runSummary: { wave: 12 } });
    expect(r.enemyLab).toMatchObject({
      deaths: 4,
      lookback: 4,
      pressure: "high",
      counterVerb: "Sidestep",
    });
    expect(r.enemyLab.drill).toContain("Sidestep");
    expect(r.enemyLab.nextRunCue).toContain("Wave 12");
  });
  it("keeps enemy lab empty when no repeated killer exists", () => {
    const career = { recentDeathsByEnemy: [{ t: "4", ts: 1 }, { t: "5", ts: 2 }] };
    const r = buildRunCoach({ career });
    expect(r.enemyLab).toBeNull();
  });
  it("returns four fields including weaponTip on every call", () => {
    const r = buildRunCoach({});
    expect("killedBy" in r).toBe(true);
    expect("tryNext" in r).toBe(true);
    expect("working" in r).toBe(true);
    expect("weaponTip" in r).toBe(true);
    expect("enemyLab" in r).toBe(true);
  });
  it("coaches precision mastery when the run had a high precision chain", () => {
    const r = buildRunCoach({ runSummary: { bestPrecisionStreak: 6, kills: 30, crits: 8 } });
    expect(r.precisionTip).toContain("Best precision chain: 6");
    expect(r.brain.nextExperiment).toContain("precision route");
  });
  it("coaches a precision gap for high-kill low-precision runs", () => {
    const r = buildRunCoach({ runSummary: { bestPrecisionStreak: 1, kills: 30, crits: 1 } });
    expect(r.precisionTip).toContain("Precision gap");
  });
});

describe("buildWeaponDeathCoach", () => {
  it("flags close-range weapon vs ranged killer mismatch", () => {
    // weapon 1 = shotgun (close), enemy 2 = Sniper (ranged)
    const wk = new Array(12).fill(0); wk[1] = 30;
    const deaths = [{ t: "2", ts: 1 }, { t: "2", ts: 2 }, { t: "2", ts: 3 }];
    const tip = buildWeaponDeathCoach(wk, deaths);
    expect(tip).toBeTruthy();
    expect(tip.toLowerCase()).toContain("close");
  });

  it("flags long-range weapon vs chase killer mismatch", () => {
    // weapon 4 = sniper (long), enemy 7 = Speedster (chase)
    const wk = new Array(12).fill(0); wk[4] = 25;
    const deaths = [{ t: "7", ts: 1 }, { t: "7", ts: 2 }, { t: "7", ts: 3 }];
    const tip = buildWeaponDeathCoach(wk, deaths);
    expect(tip).toBeTruthy();
    expect(tip.toLowerCase()).toContain("long");
  });

  it("returns null when weapon and threat are compatible", () => {
    // weapon 1 = shotgun (close), enemy 1 = Rioter (melee) — compatible
    const wk = new Array(12).fill(0); wk[1] = 20;
    const deaths = [{ t: "1", ts: 1 }, { t: "1", ts: 2 }, { t: "1", ts: 3 }];
    expect(buildWeaponDeathCoach(wk, deaths)).toBeNull();
  });

  it("returns null when only 1 death by top killer", () => {
    const wk = new Array(12).fill(0); wk[1] = 20;
    const deaths = [{ t: "2", ts: 1 }];
    expect(buildWeaponDeathCoach(wk, deaths)).toBeNull();
  });

  it("returns null on empty inputs", () => {
    expect(buildWeaponDeathCoach([], [])).toBeNull();
    expect(buildWeaponDeathCoach(null, null)).toBeNull();
  });
});

describe("buildDoctrineNearMissTip", () => {
  it("returns null with no perks", () => {
    expect(buildDoctrineNearMissTip([], {})).toBeNull();
    expect(buildDoctrineNearMissTip(null, null)).toBeNull();
  });

  it("surfaces the nearest unforged doctrine when >=75% satisfied", () => {
    // Vanguard: perkIds length 6, doctrineForgeAt 5 -> 4/5 = 0.8 >= 0.75, remaining 1
    const perks = [{ id: "iron_gut" }, { id: "vampire" }, { id: "bloodlust" }, { id: "parkour_pro" }];
    const tip = buildDoctrineNearMissTip(perks, {});
    expect(tip).toContain("1 perk");
    expect(tip).toContain("Wall of Flesh");
  });

  it("stays silent below the 75% threshold", () => {
    // Only 2/5 toward Vanguard's doctrine forge.
    const perks = [{ id: "iron_gut" }, { id: "vampire" }];
    expect(buildDoctrineNearMissTip(perks, {})).toBeNull();
  });

  it("does not re-surface a doctrine already forged this career", () => {
    const perks = [{ id: "iron_gut" }, { id: "vampire" }, { id: "bloodlust" }, { id: "parkour_pro" }, { id: "last_resort" }];
    // 5/5 -> doctrineForged true for this run regardless of archive.
    expect(buildDoctrineNearMissTip(perks, {})).toBeNull();
  });

  it("skips an archetype already in the permanent archive", () => {
    const perks = [{ id: "iron_gut" }, { id: "vampire" }, { id: "bloodlust" }, { id: "parkour_pro" }];
    expect(buildDoctrineNearMissTip(perks, { vanguard: { firstForgedAt: 1 } })).toBeNull();
  });
});
