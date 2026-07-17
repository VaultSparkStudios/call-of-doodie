import { describe, expect, it } from "vitest";
import {
  applySergeantAura,
  buildEnemyFrameIndex,
  compactTruthyInPlace,
  countSummonsFor,
  createEnemyFrameIndex,
} from "./frameIndex.js";

describe("frame index", () => {
  it("compacts hot-loop arrays without replacing their identity", () => {
    const enemy = { id: 1 };
    const items = [enemy, null, false, undefined];
    expect(compactTruthyInPlace(items)).toBe(items);
    expect(items).toEqual([enemy]);
    expect(compactTruthyInPlace(null)).toEqual([]);
  });

  it("builds and reuses a single-scan enemy index", () => {
    const scratch = createEnemyFrameIndex();
    const sergeant = { typeIndex: 13, x: 0, y: 0 };
    const enemies = [sergeant, { summonedBy: "boss-a" }, { summonedBy: "boss-a" }, { summonedBy: "boss-b" }];
    const first = buildEnemyFrameIndex(enemies, scratch);
    expect(first).toBe(scratch);
    expect(first.scanned).toBe(enemies.length);
    expect(first.sergeants).toEqual([sergeant]);
    expect(countSummonsFor(first, "boss-a")).toBe(2);
    expect(countSummonsFor(first, "boss-b")).toBe(1);

    const second = buildEnemyFrameIndex([{ summonedBy: "boss-b" }], scratch);
    expect(second).toBe(first);
    expect(second.sergeants).toEqual([]);
    expect(countSummonsFor(second, "boss-a")).toBe(0);
    expect(countSummonsFor(second, "boss-b")).toBe(1);
  });

  it("preserves Sergeant aura semantics without position allocations", () => {
    const sergeant = { typeIndex: 13, x: 0, y: 0 };
    const near = { typeIndex: 1, x: 100, y: 0 };
    const edge = { typeIndex: 1, x: 150, y: 0 };
    const far = { typeIndex: 1, x: 151, y: 0, buffed: true };
    const enemies = [sergeant, near, edge, far];
    const index = buildEnemyFrameIndex(enemies);
    expect(applySergeantAura(enemies, index)).toBe(enemies);
    expect(sergeant.buffed).toBe(false);
    expect(near.buffed).toBe(true);
    expect(edge.buffed).toBe(false);
    expect(far.buffed).toBe(false);
  });
});
