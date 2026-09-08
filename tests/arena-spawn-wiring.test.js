import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const appSource = fs.readFileSync(path.resolve("src/App.jsx"), "utf8");

describe("large-arena spawn wiring", () => {
  it("routes enemy, boss, and cluster bounds through the runtime arena authority", () => {
    expect(appSource).toContain("resolveArenaBounds(gs, GW(), GH())");
    expect(appSource).toContain("_spawnEnemy(gs, world.W, world.H");
    expect(appSource).toContain("_spawnBoss(gs, world.W, world.H");
    expect(appSource).toContain("Math.min(world.W - 20");
    expect(appSource).toContain("Math.min(world.H - 20");
    expect(appSource).not.toContain("_spawnEnemy(gs, GW(), GH()");
    expect(appSource).not.toContain("_spawnBoss(gs, GW(), GH()");
  });
});
