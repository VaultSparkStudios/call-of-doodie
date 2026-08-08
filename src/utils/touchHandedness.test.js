import { describe, it, expect } from "vitest";
import { resolveTouchStick } from "./touchHandedness.js";

describe("resolveTouchStick", () => {
  it("defaults to move-left / aim-right when handedness is unset", () => {
    expect(resolveTouchStick(10, 100, undefined)).toBe("move");
    expect(resolveTouchStick(200, 100, undefined)).toBe("aim");
  });

  it("keeps move-left / aim-right explicitly for 'right' handedness", () => {
    expect(resolveTouchStick(10, 100, "right")).toBe("move");
    expect(resolveTouchStick(200, 100, "right")).toBe("aim");
  });

  it("mirrors to move-right / aim-left for 'left' handedness", () => {
    expect(resolveTouchStick(10, 100, "left")).toBe("aim");
    expect(resolveTouchStick(200, 100, "left")).toBe("move");
  });
});
