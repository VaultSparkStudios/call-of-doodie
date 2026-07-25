import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  applyEnemyDamage,
  collectQueuedEnemyDefeats,
  collectUnqueuedLethalEnemies,
  queueEnemyDefeat,
  retireEnemyWithoutDefeat,
  sanitizeEnemyDefeatMeta,
  takeQueuedEnemyDefeat,
} from "./enemyDefeatLifecycle.js";

describe("source-neutral enemy defeat lifecycle", () => {
  it("queues the first lethal source exactly once", () => {
    const enemy = { health: 12 };
    expect(applyEnemyDamage(enemy, 13, { source: "grenade", weaponName: "GRENADE" })).toEqual({
      applied: 13,
      lethal: true,
      queued: true,
    });
    expect(queueEnemyDefeat(enemy, { source: "projectile", weaponName: "SIDEARM" })).toBe(false);
    expect(enemy._defeatPending).toMatchObject({ source: "grenade", weaponName: "GRENADE" });
  });

  it("claims a queued enemy once and tombstones it before chained effects", () => {
    const enemy = { health: 0, _defeatPending: { source: "rail", weaponIdx: 3, weaponName: "RAILGUN" } };
    expect(takeQueuedEnemyDefeat(enemy)).toEqual({
      source: "rail",
      weaponIdx: 3,
      weaponName: "RAILGUN",
      beatEligible: false,
    });
    expect(enemy).toMatchObject({ health: -999, _defeatResolved: true });
    expect(takeQueuedEnemyDefeat(enemy)).toBeNull();
    expect(applyEnemyDamage(enemy, 99, { source: "chain" })).toEqual({ applied: 0, lethal: false, queued: false });
  });

  it("collects only unresolved queued enemies and sanitizes public metadata", () => {
    const queued = { health: -1 };
    queueEnemyDefeat(queued, { source: "  grenade  ", weaponIdx: "2", weaponName: "  Big Boom  ", beatEligible: true });
    expect(collectQueuedEnemyDefeats([queued, { health: 0 }, { _defeatPending: {}, _defeatResolved: true }])).toEqual([queued]);
    expect(sanitizeEnemyDefeatMeta({ source: "x".repeat(80), weaponIdx: -1, weaponName: "" })).toEqual({
      source: "x".repeat(32),
      weaponIdx: null,
      weaponName: "ENVIRONMENT",
      beatEligible: false,
    });
  });

  it("surfaces lethal enemies that bypass attribution without confusing queued or retired enemies", () => {
    const orphan = { health: 0 };
    const queued = { health: -1 };
    queueEnemyDefeat(queued, { source: "grenade" });
    const retired = { health: 3 };
    retireEnemyWithoutDefeat(retired, "scripted");
    expect(collectUnqueuedLethalEnemies([orphan, queued, retired, { health: 1 }, null])).toEqual([orphan]);
  });

  it("rejects non-finite and non-positive damage without manufacturing lethality", () => {
    const enemy = { health: 5 };
    expect(applyEnemyDamage(enemy, Number.NaN, { source: "hazard" })).toEqual({ applied: 0, lethal: false, queued: false });
    expect(applyEnemyDamage(enemy, -5, { source: "hazard" })).toEqual({ applied: 0, lethal: false, queued: false });
    expect(enemy.health).toBe(5);
  });

  it("supports explicit no-reward retirement without entering the defeat queue", () => {
    const enemy = { health: 10 };
    expect(retireEnemyWithoutDefeat(enemy, "kamikaze-self-destruct")).toBe(true);
    expect(enemy).toMatchObject({ health: -999, _defeatResolved: true, _retireReason: "kamikaze-self-destruct" });
    expect(collectQueuedEnemyDefeats([enemy])).toEqual([]);
    expect(retireEnemyWithoutDefeat(enemy, "again")).toBe(false);
  });

  it("keeps App on one score/kill executor instead of regrowing per-source branches", () => {
    const appSource = fs.readFileSync(path.resolve(process.cwd(), "src/App.jsx"), "utf8");
    expect(appSource.match(/planEnemyDefeatScore\(/g) || []).toHaveLength(1);
    expect(appSource.match(/gs\.kills\+\+/g) || []).toHaveLength(1);
    expect(appSource.match(/\.health\s*=\s*-999/g) || []).toHaveLength(0);
    expect(appSource.match(/enemy-defeat-pipeline:single-executor/g) || []).toHaveLength(1);
  });
});
