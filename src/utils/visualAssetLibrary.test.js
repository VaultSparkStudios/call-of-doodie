import { describe, expect, it } from "vitest";
import {
  ENEMY_ATLASES,
  SIGNATURE_VISUAL_ASSETS,
  getEnemyAtlasSlot,
  getEnemyAtlasLoadReceipt,
  getRuntimeCharacterAsset,
  getRuntimeCharacterSprite,
  preloadEnemyAtlasesForTypes,
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
    expect(getRuntimeEnemySprite(0, null)).toBeNull();
  });

  it("loads modern atlases through integer source rectangles and exposes fallback truth", () => {
    class ReadyImage {
      constructor() {
        this.complete = true;
        this.naturalWidth = 1254;
        this.naturalHeight = 1254;
      }

      set src(value) {
        this.value = value;
        this.onload?.();
      }
    }

    expect(getRuntimeEnemySprite(0, ReadyImage)).toMatchObject({ sourceX: 0, sourceY: 0, sourceWidth: 314, sourceHeight: 627 });
    expect(getEnemyAtlasLoadReceipt()["enemy-atlas-core"]).toBe("ready");
  });

  it("bounds proactive decoding to the first two active roster atlases", () => {
    const requested = [];
    class LoadingImage {
      constructor() {
        this.complete = false;
        this.naturalWidth = 0;
      }

      set src(value) {
        requested.push(value);
      }
    }

    const plan = preloadEnemyAtlasesForTypes([9, 4, 0, 21], LoadingImage, 99);
    expect(plan).toMatchObject({ atlasIds: ["specialists", "bosses"], boundedLimit: 2 });
    expect(requested).toEqual([
      "/visual-assets/enemy-atlas-specialists.webp",
      "/visual-assets/enemy-atlas-bosses.webp",
    ]);
  });
});
