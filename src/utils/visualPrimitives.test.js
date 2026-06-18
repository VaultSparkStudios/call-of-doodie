import { describe, expect, it, vi } from "vitest";
import {
  VISUAL_PRIMITIVE_VERSION,
  buildWeaponAccent,
  drawShadedOrb,
  getMaterialStyle,
} from "./visualPrimitives.js";

function fakeCtx() {
  const calls = [];
  const ctx = {
    calls,
    globalAlpha: 1,
    save: vi.fn(() => calls.push("save")),
    restore: vi.fn(() => calls.push("restore")),
    beginPath: vi.fn(() => calls.push("beginPath")),
    ellipse: vi.fn(() => calls.push("ellipse")),
    fill: vi.fn(() => calls.push("fill")),
    stroke: vi.fn(() => calls.push("stroke")),
    fillRect: vi.fn(() => calls.push("fillRect")),
    createRadialGradient: vi.fn(() => ({
      addColorStop: vi.fn(),
    })),
  };
  return ctx;
}

describe("visualPrimitives", () => {
  it("returns a stable proprietary primitive version", () => {
    expect(VISUAL_PRIMITIVE_VERSION).toBe("cod-visual-primitives-v1");
  });

  it("falls back to an enemy material when a material is unknown", () => {
    expect(getMaterialStyle("missing").base).toBe("#FF69B4");
  });

  it("maps weapon names to visual material accents", () => {
    expect(buildWeaponAccent({ name: "Plunger Launcher", color: "#123456" })).toMatchObject({
      color: "#123456",
      material: "rubber",
    });
    expect(buildWeaponAccent({ name: "Railgun", color: "#00FFFF" }).barrelLength).toBe(24);
  });

  it("draws a shaded orb without requiring image assets", () => {
    const ctx = fakeCtx();
    drawShadedOrb(ctx, { radius: 12, material: "porcelain" });
    expect(ctx.createRadialGradient).toHaveBeenCalled();
    expect(ctx.calls).toContain("ellipse");
    expect(ctx.calls).toContain("fill");
    expect(ctx.calls).toContain("stroke");
  });
});
