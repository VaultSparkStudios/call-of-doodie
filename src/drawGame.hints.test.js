import { describe, it, expect } from "vitest";
import { getMobileJoystickHintAlpha } from "./drawGame.js";

describe("getMobileJoystickHintAlpha", () => {
  it("returns 1 with 0 kills, not boss wave, not reduced motion", () => {
    expect(getMobileJoystickHintAlpha(0, false, false)).toBe(1);
  });

  it("fades linearly: 0.6 at 2 kills, 0.2 at 4 kills", () => {
    expect(getMobileJoystickHintAlpha(2, false, false)).toBeCloseTo(0.6);
    expect(getMobileJoystickHintAlpha(4, false, false)).toBeCloseTo(0.2);
  });

  it("returns 0 once kills reaches 5 (fully faded)", () => {
    expect(getMobileJoystickHintAlpha(5, false, false)).toBe(0);
  });

  it("returns 0 above 5 kills (stays hidden)", () => {
    expect(getMobileJoystickHintAlpha(20, false, false)).toBe(0);
  });

  it("returns 0 during a boss wave regardless of kill count", () => {
    expect(getMobileJoystickHintAlpha(0, true, false)).toBe(0);
    expect(getMobileJoystickHintAlpha(2, true, false)).toBe(0);
  });

  it("returns 0 in reduced-motion mode regardless of kill count", () => {
    expect(getMobileJoystickHintAlpha(0, false, true)).toBe(0);
    expect(getMobileJoystickHintAlpha(1, false, true)).toBe(0);
  });

  it("returns 0 when both boss wave and reduced motion", () => {
    expect(getMobileJoystickHintAlpha(0, true, true)).toBe(0);
  });
});
