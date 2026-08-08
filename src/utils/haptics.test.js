import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { vibrate, hasVibrationSupport, setHapticsEnabled } from "./haptics.js";

describe("haptics", () => {
  let vibrateSpy;

  beforeEach(() => {
    setHapticsEnabled(true);
    vibrateSpy = vi.fn();
    navigator.vibrate = vibrateSpy;
  });

  afterEach(() => {
    delete navigator.vibrate;
  });

  it("reports vibration support when navigator.vibrate exists", () => {
    expect(hasVibrationSupport()).toBe(true);
  });

  it("reports no support when navigator.vibrate is missing", () => {
    delete navigator.vibrate;
    expect(hasVibrationSupport()).toBe(false);
  });

  it("fires the named pattern when enabled and supported", () => {
    vibrate("hit");
    expect(vibrateSpy).toHaveBeenCalledWith(12);
  });

  it("fires a multi-beat pattern array for crit", () => {
    vibrate("crit");
    expect(vibrateSpy).toHaveBeenCalledWith([10, 30, 18]);
  });

  it("does nothing for an unknown pattern name", () => {
    vibrate("not_a_real_pattern");
    expect(vibrateSpy).not.toHaveBeenCalled();
  });

  it("does nothing when haptics are disabled via settings", () => {
    setHapticsEnabled(false);
    vibrate("kill");
    expect(vibrateSpy).not.toHaveBeenCalled();
  });

  it("does nothing when vibration is unsupported", () => {
    delete navigator.vibrate;
    vibrate("hit");
    expect(vibrateSpy).not.toHaveBeenCalled();
  });

  it("never throws if navigator.vibrate itself throws", () => {
    navigator.vibrate = () => { throw new Error("blocked"); };
    expect(() => vibrate("hit")).not.toThrow();
  });
});
