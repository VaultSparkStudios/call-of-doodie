import { describe, it, expect } from "vitest";
import { pickObjective, tickObjective, getObjectiveWeights, recordObjectiveResult, pickWaveChallengeContract, startWaveChallengeContract, resolveWaveChallengeContract } from "./objectiveDirector.js";

describe("objectiveDirector", () => {
  it("never spawns on boss waves", () => {
    expect(pickObjective({ wave: 5, bossWave: true })).toBeNull();
  });
  it("never spawns before wave 3", () => {
    expect(pickObjective({ wave: 1 })).toBeNull();
    expect(pickObjective({ wave: 2 })).toBeNull();
  });
  it("returns null about ~65% of the time (random skip)", () => {
    let null_count = 0;
    const seeded = mulberry(42);
    for (let i = 0; i < 200; i++) {
      const o = pickObjective({ wave: 10, weakness: "chaos", world: { W: 1000, H: 600 }, rng: seeded });
      if (o === null) null_count++;
    }
    // 65% target, allow ±15% slack on 200 samples
    expect(null_count).toBeGreaterThan(100);
    expect(null_count).toBeLessThan(170);
  });
  it("returns one of the five known types when it does spawn", () => {
    const seeded = mulberry(7);
    let found = null;
    for (let i = 0; i < 50 && !found; i++) {
      found = pickObjective({ wave: 12, weakness: null, world: { W: 1000, H: 600 }, rng: seeded });
    }
    expect(found).not.toBeNull();
    expect(["hot_zone", "bounty", "sniper", "lockdown", "escort"]).toContain(found.type);
  });
  it("biases lockdown for defense-weak players", () => {
    const w = getObjectiveWeights("defense");
    expect(w.lockdown).toBeGreaterThan(w.bounty);
  });
  it("hot_zone contains() reflects geometry", () => {
    const seeded = mulberry(99);
    let obj = null;
    for (let i = 0; i < 100 && !(obj && obj.type === "hot_zone"); i++) {
      obj = pickObjective({ wave: 12, weakness: "chaos", world: { W: 800, H: 600 }, rng: seeded });
    }
    if (obj && obj.type === "hot_zone") {
      expect(obj.contains({ x: obj.cx, y: obj.cy })).toBe(true);
      expect(obj.contains({ x: obj.cx + obj.r + 10, y: obj.cy })).toBe(false);
    }
  });
  it("tickObjective decrements timeLeft", () => {
    const gs = { activeObjective: { type: "hot_zone", timeLeft: 100, cx: 0, cy: 0, r: 50, contains: () => true } };
    tickObjective(gs);
    expect(gs.activeObjective.timeLeft).toBe(99);
  });
  it("lockdown expires if player leaves shrinking circle", () => {
    const gs = {
      player: { x: 999, y: 999 },
      activeObjective: { type: "lockdown", timeLeft: 100, cx: 0, cy: 0, r: 50, r0: 50, rEnd: 10 },
    };
    const r = tickObjective(gs);
    expect(r.expired).toBe(true);
  });
  it("tracks objective achievement chains", () => {
    let stats = recordObjectiveResult({}, { type: "hot_zone" }, { completed: true });
    stats = recordObjectiveResult(stats, { type: "hot_zone" }, { completed: true });
    stats = recordObjectiveResult(stats, { type: "bounty" }, { completed: true });
    stats = recordObjectiveResult(stats, { type: "escort", cart: { hp: 100 } }, { completed: true });
    stats = recordObjectiveResult(stats, { type: "lockdown", timeLeft: 200 }, { completed: true });
    expect(stats.hotZoneStreak).toBe(0);
    expect(stats.bountyKills).toBe(1);
    expect(stats.perfectEscorts).toBe(1);
    expect(stats.clutchLockdowns).toBe(1);
    expect(stats.completedTotal).toBe(5);
  });
  it("creates wave challenge contracts only when they do not overlap dynamic objectives", () => {
    const spawnRng = scriptedRng([0.01, 0.1]);
    expect(pickWaveChallengeContract({ wave: 6, activeObjective: { type: "bounty" }, rng: spawnRng })).toBeNull();
    expect(pickWaveChallengeContract({ wave: 3, rng: spawnRng })).toBeNull();
    const contract = pickWaveChallengeContract({ wave: 6, rng: scriptedRng([0.01, 0.1]) });
    expect(contract).toMatchObject({ id: "flawless_wave", wave: 6 });
    expect(contract.rewardCoins).toBeGreaterThan(0);
  });

  it("resolves clean wave contracts into coin rewards and clears active state", () => {
    const contract = startWaveChallengeContract(
      { id: "flawless_wave", label: "CLEAN", color: "#fff", rewardCoins: 6, wave: 6 },
      { kills: 10, waveStreak: 1 },
    );
    const gs = { activeWaveContract: contract, kills: 18, waveStreak: 2, damageThisWave: 0 };
    const result = resolveWaveChallengeContract(gs);
    expect(result).toMatchObject({ completed: true, rewardCoins: 6, reason: "no damage taken" });
    expect(gs.activeWaveContract).toBeNull();
  });

  it("fails kill quota contracts with an honest progress reason", () => {
    const contract = startWaveChallengeContract(
      { id: "kill_quota", label: "PILE", color: "#fff", rewardCoins: 8, targetKills: 12, wave: 7 },
      { kills: 4, waveStreak: 0 },
    );
    const result = resolveWaveChallengeContract({ activeWaveContract: contract, kills: 10, damageThisWave: 0 });
    expect(result).toMatchObject({ completed: false, failed: true, rewardCoins: 0, reason: "6/12 kills" });
  });
});

// tiny seedable RNG (mulberry32) for deterministic test runs
function mulberry(seed) {
  let a = seed >>> 0;
  return function() {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = a;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

function scriptedRng(values) {
  let index = 0;
  return () => values[Math.min(index++, values.length - 1)];
}
