import { describe, expect, it } from "vitest";
import {
  WEAPON_ATLAS_CONTRACT,
  WORLD_OBJECT_ATLAS_CONTRACT,
  WORLD_OBJECT_CELLS,
  getWeaponAtlasRect,
  getWorldObjectAtlasRect,
} from "./objectAtlasContract.js";
import { WEAPONS } from "../constants.js";

describe("object atlas contracts (S145)", () => {
  it("weapon atlas covers exactly the live WEAPONS roster in index order", () => {
    expect(WEAPON_ATLAS_CONTRACT.slots).toBe(WEAPONS.length);
    expect(WEAPON_ATLAS_CONTRACT.weaponIndices).toEqual(WEAPONS.map((_, index) => index));
  });

  it("weapon rects tile the atlas exactly with integer pixels", () => {
    let area = 0;
    for (let index = 0; index < WEAPON_ATLAS_CONTRACT.slots; index += 1) {
      const rect = getWeaponAtlasRect(index);
      expect(rect).toBeTruthy();
      expect(Number.isInteger(rect.x) && Number.isInteger(rect.y)).toBe(true);
      expect(rect.width > 0 && rect.height > 0).toBe(true);
      area += rect.width * rect.height;
    }
    expect(area).toBe(WEAPON_ATLAS_CONTRACT.width * WEAPON_ATLAS_CONTRACT.height);
  });

  it("rejects out-of-range weapon indices", () => {
    expect(getWeaponAtlasRect(-1)).toBeNull();
    expect(getWeaponAtlasRect(WEAPON_ATLAS_CONTRACT.slots)).toBeNull();
    expect(getWeaponAtlasRect(1.5)).toBeNull();
  });

  it("world-object cells are unique and fit the declared grid", () => {
    expect(new Set(WORLD_OBJECT_CELLS).size).toBe(WORLD_OBJECT_CELLS.length);
    expect(WORLD_OBJECT_CELLS.length).toBeLessThanOrEqual(WORLD_OBJECT_ATLAS_CONTRACT.slots);
    expect(WORLD_OBJECT_ATLAS_CONTRACT.usedSlots).toBe(WORLD_OBJECT_CELLS.length);
  });

  it("every declared world-object cell resolves to a rect; unknown cells do not", () => {
    for (const cellId of WORLD_OBJECT_CELLS) {
      const rect = getWorldObjectAtlasRect(cellId);
      expect(rect).toBeTruthy();
      expect(rect.width > 0 && rect.height > 0).toBe(true);
    }
    expect(getWorldObjectAtlasRect("pickup:nonexistent")).toBeNull();
  });

  it("pickup cell keys match the live pickup type keys used by the renderer", () => {
    const pickupKeys = WORLD_OBJECT_CELLS.filter((cell) => cell.startsWith("pickup:")).map((cell) => cell.slice(7));
    expect(pickupKeys).toEqual(["health", "ammo", "speed", "guardian_angel", "upgrade", "nuke", "rage", "magnet", "freeze"]);
  });
});
