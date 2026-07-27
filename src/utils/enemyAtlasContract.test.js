import { describe, expect, it } from "vitest";
import {
  ENEMY_ATLAS_CONTRACT,
  ENEMY_ATLAS_TOTAL_BYTE_BUDGET,
  getAtlasGridCoverage,
  getIntegerGridRect,
} from "./enemyAtlasContract.js";

describe("enemy atlas runtime contract", () => {
  it("covers non-divisible source dimensions with integer rectangles and no lost pixels", () => {
    const atlas = ENEMY_ATLAS_CONTRACT.core;
    const coverage = getAtlasGridCoverage(1254, 1254, atlas);
    expect(coverage.complete).toBe(true);
    expect(coverage.area).toBe(1254 * 1254);
    expect(coverage.rects.every((rect) => Object.values(rect).every(Number.isInteger))).toBe(true);
    expect(coverage.rects.map((rect) => rect.sourceWidth)).toEqual([314, 313, 314, 313, 314, 313, 314, 313]);
  });

  it("rejects invalid cells and preserves exact outer boundaries", () => {
    expect(getIntegerGridRect(1254, 1254, 4, 2, -1)).toBeNull();
    expect(getIntegerGridRect(1254, 1254, 4, 2, 8)).toBeNull();
    expect(getIntegerGridRect(1254, 1254, 4, 2, 0)).toMatchObject({ sourceX: 0, sourceY: 0 });
    const final = getIntegerGridRect(1254, 1254, 4, 2, 7);
    expect(final.sourceX + final.sourceWidth).toBe(1254);
    expect(final.sourceY + final.sourceHeight).toBe(1254);
  });

  it("maps all 22 enemy types once inside the aggregate delivery budget", () => {
    const atlases = Object.values(ENEMY_ATLAS_CONTRACT);
    const indices = atlases.flatMap((atlas) => atlas.typeIndices).sort((left, right) => left - right);
    expect(indices).toEqual(Array.from({ length: 22 }, (_, index) => index));
    expect(atlases.reduce((sum, atlas) => sum + atlas.maxBytes, 0)).toBe(ENEMY_ATLAS_TOTAL_BYTE_BUDGET + 150_000);
    expect(atlases.every((atlas) => atlas.src.endsWith(".webp"))).toBe(true);
  });
});
