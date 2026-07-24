import { describe, expect, it } from "vitest";
import { SIGNATURE_VISUAL_ASSETS, getRuntimeCharacterAsset, getRuntimeCharacterSprite, getSignatureVisualAsset } from "./visualAssetLibrary.js";

describe("visualAssetLibrary", () => {
  it("tracks a first proprietary signature pack", () => {
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
});
