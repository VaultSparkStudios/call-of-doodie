import { describe, expect, it } from "vitest";
import {
  WEAPON_ATLAS_CONTRACT,
  WORLD_OBJECT_ATLAS_CONTRACT,
  WORLD_OBJECT_CELLS,
  THEME_PROP_ATLAS_CONTRACT,
  THEME_PROP_CELLS,
  THEME_PROP_EMOJI_TO_CELL,
  getWeaponAtlasRect,
  getWorldObjectAtlasRect,
  getThemePropAtlasRect,
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

  it("theme-prop cells are unique, fill exactly the declared 16-slot grid, and tile with integer pixels", () => {
    expect(new Set(THEME_PROP_CELLS).size).toBe(THEME_PROP_CELLS.length);
    expect(THEME_PROP_CELLS.length).toBe(THEME_PROP_ATLAS_CONTRACT.slots);
    expect(THEME_PROP_ATLAS_CONTRACT.usedSlots).toBe(THEME_PROP_CELLS.length);
    let area = 0;
    for (const cellId of THEME_PROP_CELLS) {
      const rect = getThemePropAtlasRect(cellId);
      expect(rect).toBeTruthy();
      expect(Number.isInteger(rect.x) && Number.isInteger(rect.y)).toBe(true);
      area += rect.width * rect.height;
    }
    expect(area).toBe(THEME_PROP_ATLAS_CONTRACT.width * THEME_PROP_ATLAS_CONTRACT.height);
    expect(getThemePropAtlasRect("nonexistent:cell")).toBeNull();
  });

  it("every theme-prop emoji mapping points at a real declared cell", () => {
    for (const cellId of Object.values(THEME_PROP_EMOJI_TO_CELL)) {
      expect(THEME_PROP_CELLS).toContain(cellId);
    }
    expect(Object.keys(THEME_PROP_EMOJI_TO_CELL).length).toBe(THEME_PROP_CELLS.length);
  });
});
