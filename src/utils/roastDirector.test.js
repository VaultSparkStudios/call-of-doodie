import { describe, expect, test } from "vitest";
import { getRoastCallout, getRoastEventKeys, getRoastPoolSize } from "./roastDirector.js";

describe("getRoastCallout", () => {
  test("returns a string for a known event on first call", () => {
    const cooldowns = {};
    const result = getRoastCallout("kill_streak", cooldowns, 1);
    expect(typeof result).toBe("string");
    expect(result.length).toBeGreaterThan(0);
  });

  test("returns null for an unknown event", () => {
    const cooldowns = {};
    expect(getRoastCallout("unknown_event", cooldowns, 1)).toBeNull();
  });

  test("rate-limits: same event within cooldown window returns null", () => {
    const cooldowns = {};
    getRoastCallout("wave_clear", cooldowns, 5); // fire once
    const second = getRoastCallout("wave_clear", cooldowns, 6); // wave 6 — only 1 wave gap, cooldown=2
    expect(second).toBeNull();
  });

  test("rate-limits: same event after cooldown window returns a string", () => {
    const cooldowns = {};
    getRoastCallout("wave_clear", cooldowns, 5);
    const after = getRoastCallout("wave_clear", cooldowns, 7); // 2 wave gap — exactly on cooldown
    expect(typeof after).toBe("string");
  });

  test("different events don't share cooldowns", () => {
    const cooldowns = {};
    getRoastCallout("kill_streak", cooldowns, 3);
    const bossResult = getRoastCallout("boss_kill", cooldowns, 3); // different event, same wave
    expect(typeof bossResult).toBe("string");
  });

  test("updates cooldowns[event] to currentWave after firing", () => {
    const cooldowns = {};
    getRoastCallout("near_death", cooldowns, 4);
    expect(cooldowns["near_death"]).toBe(4);
  });

  test("cooldowns state persists across calls (caller-owned)", () => {
    const cooldowns = {};
    getRoastCallout("first_blood", cooldowns, 1);
    expect(cooldowns["first_blood"]).toBe(1);
    getRoastCallout("first_blood", cooldowns, 2); // too soon — null but no reset
    expect(cooldowns["first_blood"]).toBe(1); // still the original fire wave
  });

  test("custom cooldownWaves parameter works", () => {
    const cooldowns = {};
    getRoastCallout("death", cooldowns, 10, 5); // cooldown = 5 waves
    const soon = getRoastCallout("death", cooldowns, 13, 5); // 3 waves gap < 5
    expect(soon).toBeNull();
    const later = getRoastCallout("death", cooldowns, 15, 5); // 5 waves gap >= 5
    expect(typeof later).toBe("string");
  });

  test("callouts are drawn from a non-empty pool (varied across calls)", () => {
    const results = new Set();
    for (let i = 0; i < 30; i++) {
      const cd = {};
      const r = getRoastCallout("perk_chosen", cd, i * 10);
      if (r) results.add(r);
    }
    // Pool has multiple entries — should see variety
    expect(results.size).toBeGreaterThan(1);
  });
});

describe("getRoastEventKeys", () => {
  test("returns an array of known event keys", () => {
    const keys = getRoastEventKeys();
    expect(Array.isArray(keys)).toBe(true);
    expect(keys).toContain("kill_streak");
    expect(keys).toContain("boss_kill");
    expect(keys).toContain("death");
  });
});

describe("getRoastPoolSize", () => {
  test("returns pool size > 0 for all known events", () => {
    for (const key of getRoastEventKeys()) {
      expect(getRoastPoolSize(key)).toBeGreaterThan(0);
    }
  });

  test("returns 0 for unknown event", () => {
    expect(getRoastPoolSize("not_a_real_event")).toBe(0);
  });
});
