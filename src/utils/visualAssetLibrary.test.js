import { describe, expect, it } from "vitest";
import {
  ENEMY_ATLASES,
  SIGNATURE_VISUAL_ASSETS,
  getEnemyAtlasSlot,
  getRuntimeCharacterAsset,
  getRuntimeCharacterSprite,
  getRuntimeEnemySprite,
  getSignatureVisualAsset,
} from "./visualAssetLibrary.js";

describe("visualAssetLibrary", () => {
  it("tracks the proprietary signature pack", () => {
    expect(SIGNATURE_VISUAL_ASSETS).toHaveLength(4);
    expect(SIGNATURE_VISUAL_ASSETS.every((asset) => asset.src.startsWith("/visual-assets/"))).toBe(true);
  });

  it("looks up assets by id", () => {
    expect(getSignatureVisualAsset("cod-plunger-rocket")?.label).toBe("Plunger Launcher");
    expect(getSignatureVisualAsset("missing")).toBeNull();
  });

  it("maps showcase identities to optimized runtime character art", () => {
    expect(getRuntimeCharacterAsset("player")).toBe("/visual-assets/cod-doodie-operative-v2.png");
    expect(getRuntimeCharacterAsset("karen")).toBe("/visual-assets/cod-karen-nemesis-v2.png");
    expect(getRuntimeCharacterSprite("missing")).toBeNull();
  });

  it("maps every enemy type to one of three complete atlases", () => {
    expect(Object.keys(ENEMY_ATLASES)).toEqual(["core", "specialists", "bosses"]);
    expect(Array.from({ length: 22 }, (_, typeIndex) => getEnemyAtlasSlot(typeIndex)).every(Boolean)).toBe(true);
    expect(getEnemyAtlasSlot(0)).toMatchObject({ atlasId: "core", cell: 0 });
    expect(getEnemyAtlasSlot(21)).toMatchObject({ atlasId: "bosses", cell: 5 });
    expect(getEnemyAtlasSlot(22)).toBeNull();
    expect(getRuntimeEnemySprite(0, undefined)).toBeNull();
  });
});
