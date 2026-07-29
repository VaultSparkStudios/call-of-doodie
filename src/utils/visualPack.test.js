import { describe, expect, it } from "vitest";
import { ENEMY_TYPES } from "../constants.js";
import { buildRetroCharacterManifest, normalizeVisualPack, VISUAL_PACKS } from "./visualPack.js";

describe("visual pack contract", () => {
  it("keeps Modern as the safe default and accepts Retro explicitly", () => {
    expect(normalizeVisualPack()).toBe(VISUAL_PACKS.MODERN);
    expect(normalizeVisualPack("unknown-pack")).toBe(VISUAL_PACKS.MODERN);
    expect(normalizeVisualPack("retro")).toBe(VISUAL_PACKS.RETRO);
  });

  it("covers the player, every current enemy type, and synthetic split shards", () => {
    const manifest = buildRetroCharacterManifest(ENEMY_TYPES);
    expect(manifest.player.id).toBe("player");
    expect(manifest.enemies).toHaveLength(ENEMY_TYPES.length);
    expect(manifest.enemies.map(entry => entry.typeIndex)).toEqual(ENEMY_TYPES.map((_, index) => index));
    expect(manifest.enemies.every(entry => entry.emoji && entry.renderer)).toBe(true);
    expect(manifest.syntheticCharacters).toContainEqual(expect.objectContaining({ id: "splitter-shard", inheritsTypeIndex: 16 }));
  });
});
