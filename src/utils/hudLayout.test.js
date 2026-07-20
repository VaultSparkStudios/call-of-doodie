import { describe, expect, it } from "vitest";
import { getHudCenterStackLayout, getHudDebugSlots, isHudDebugEnabled } from "./hudLayout.js";

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
  it("allocates non-overlapping top-center combat airspace for compound modes", () => {
    const layout = getHudCenterStackLayout({
      hasIntegrityWarning: true,
      hasDrill: true,
      hasSpeedrun: true,
      hasRunModifier: true,
      hasChallenge: true,
      hasGhosts: true,
      hasWeeklyRival: true,
      hasRivalPace: true,
    });
    const order = ["integrity", "drill", "speedrun", "runModifier", "challenge", "ghosts", "weeklyRival", "rivalPace"];
    for (let index = 1; index < order.length; index += 1) {
      const previous = order[index - 1];
      const current = order[index];
      expect(layout.slots[current]).toBeGreaterThanOrEqual(
        layout.slots[previous] + layout.heights[previous] + layout.gap,
      );
    }
  });

  it("uses a tighter but still ordered mobile stack", () => {
    const desktop = getHudCenterStackLayout({ hasDrill: true, hasChallenge: true });
    const mobile = getHudCenterStackLayout({ isMobile: true, hasDrill: true, hasChallenge: true });
    expect(mobile.gap).toBeLessThan(desktop.gap);
    expect(mobile.slots.challenge).toBeGreaterThan(mobile.slots.drill);
  });
});
