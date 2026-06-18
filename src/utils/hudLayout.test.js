import { describe, expect, it } from "vitest";
import { getHudDebugSlots, isHudDebugEnabled } from "./hudLayout.js";

describe("hudLayout", () => {
  it("defines stable desktop HUD slot ids", () => {
    expect(getHudDebugSlots().map((slot) => slot.id)).toEqual([
      "top-left",
      "top-center",
      "top-right",
      "bottom-left",
      "bottom-center",
      "bottom-right",
    ]);
  });

  it("accounts for mobile bottom controls", () => {
    const desktop = getHudDebugSlots({ isMobile: false }).find((slot) => slot.id === "bottom-left");
    const mobile = getHudDebugSlots({ isMobile: true }).find((slot) => slot.id === "bottom-left");

    expect(mobile.style.bottom).toBeGreaterThan(desktop.style.bottom);
  });

  it("detects HUD debug mode from URL or local storage", () => {
    expect(isHudDebugEnabled("?debug=hud", null)).toBe(true);
    expect(isHudDebugEnabled("", { getItem: () => "1" })).toBe(true);
    expect(isHudDebugEnabled("?debug=ops", { getItem: () => null })).toBe(false);
  });
});
