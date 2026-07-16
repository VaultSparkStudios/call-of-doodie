import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { spawnPickup } from "./pickupSpawning.js";
import { getShopOptions } from "./shopOptions.js";
import { getRandomPerks } from "../utils/perkOptions.js";
import { getRouteOptions } from "../utils/routeOptions.js";
import {
  buildCompetitiveRngReceipt,
  createNamedRunRng,
  getRunRng,
  restoreRunRng,
  snapshotRunRng,
} from "./runRng.js";

describe("named competitive run RNG", () => {
  it("keeps streams deterministic and isolated by name and wave", () => {
    const combatA = createNamedRunRng({ seed: 42, wave: 3, name: "combat" });
    const combatB = createNamedRunRng({ seed: 42, wave: 3, name: "combat" });
    const loot = createNamedRunRng({ seed: 42, wave: 3, name: "loot" });
    const nextA = [combatA(), combatA(), combatA()];

    expect(nextA).toEqual([combatB(), combatB(), combatB()]);
    expect(nextA).not.toEqual([loot(), loot(), loot()]);
  });

  it("serializes and resumes stream state without replaying prior calls", () => {
    const original = { runSeed: 91, currentWave: 4 };
    const random = getRunRng(original, "choices");
    random();
    random();
    const snapshot = snapshotRunRng(original);
    const expectedNext = random();

    const restored = { runSeed: 91, currentWave: 4 };
    expect(restoreRunRng(restored, snapshot)).toBe(true);
    expect(getRunRng(restored, "choices")()).toBe(expectedNext);
  });

  it("produces identical ten-wave receipts for the same seed and commands", () => {
    const commandSchedule = [
      { wave: 1, action: "fire" },
      { wave: 1, action: "kill" },
      { wave: 4, action: "dash" },
      { wave: 7, action: "kill" },
      { wave: 10, action: "fire" },
    ];
    const first = buildCompetitiveRngReceipt({ seed: 123456, waves: 10, commandSchedule });
    const repeat = buildCompetitiveRngReceipt({ seed: 123456, waves: 10, commandSchedule });
    const different = buildCompetitiveRngReceipt({ seed: 654321, waves: 10, commandSchedule });

    expect(repeat).toEqual(first);
    expect(different.decisions).not.toEqual(first.decisions);
    expect(first.contract).toContain("not-full-physics-resimulation");
  });

  it("threads the choices and loot streams through live helper contracts", () => {
    const run = () => {
      const state = {
        runSeed: 5050,
        currentWave: 6,
        player: { health: 40, maxHealth: 100 },
        weaponMods: {},
        weaponUpgrades: [],
        pickups: [],
      };
      const choices = getRunRng(state, "choices");
      const perks = getRandomPerks(3, choices).map((perk) => perk.id);
      const routes = getRouteOptions(state, choices).map((route) => route.id);
      const shop = getShopOptions(state, 0, choices).map((option) => option.id);
      spawnPickup(state, 10, 20, false, { rng: getRunRng(state, "loot") });
      return { perks, routes, shop, pickup: state.pickups[0] };
    };

    expect(run()).toEqual(run());
  });

  it("keeps direct App randomness limited to initial seed creation", () => {
    const source = fs.readFileSync(path.resolve(import.meta.dirname, "..", "App.jsx"), "utf8");
    const directCalls = source.split(/\r?\n/).filter((line) => line.includes("Math.random("));

    expect(directCalls).toHaveLength(1);
    expect(directCalls[0]).toContain("const seed");
    expect(source).toContain("score-affecting branch uses a named stream");
  });
});
