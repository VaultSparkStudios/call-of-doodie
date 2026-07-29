import { describe, expect, it } from "vitest";
import { getPlayerRenderPose } from "./playerRenderPose.js";

describe("player render pose", () => {
  it.each([
    ["east", 0],
    ["south", Math.PI / 2],
    ["west", Math.PI],
    ["north", -Math.PI / 2],
    ["multiple turns", Math.PI * 9],
  ])("keeps the operative upright while aiming %s", (_label, angle) => {
    const pose = getPlayerRenderPose(angle);
    expect(pose.bodyAngle).toBe(0);
    expect(pose.weaponAngle).toBeGreaterThanOrEqual(-Math.PI);
    expect(pose.weaponAngle).toBeLessThan(Math.PI);
  });

  it("falls back to a safe forward aim for invalid input", () => {
    expect(getPlayerRenderPose(Number.NaN)).toEqual({ bodyAngle: 0, weaponAngle: 0 });
  });
});
