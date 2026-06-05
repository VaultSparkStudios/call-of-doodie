import { describe, expect, it } from "vitest";
import {
  buildControllerProfile,
  detectControllerType,
  getControllerLabels,
  getPrimaryGamepad,
  loadControllerProfile,
  readGamepadControls,
  rememberControllerProfile,
} from "./gamepad.js";

function pad({ index = 0, id = "Generic", buttons = [], axes = [] } = {}) {
  return {
    index,
    id,
    buttons: Array.from({ length: 16 }, (_, i) => buttons[i] || { pressed: false, value: 0 }),
    axes: Array.from({ length: 4 }, (_, i) => axes[i] || 0),
  };
}

describe("gamepad helpers", () => {
  it("detects Xbox controllers from common browser ids", () => {
    expect(detectControllerType(pad({ id: "Xbox Wireless Controller (STANDARD GAMEPAD Vendor: 045e Product: 0b13)" }))).toBe("xbox");
    expect(detectControllerType(pad({ id: "xinput compatible gamepad" }))).toBe("xbox");
  });

  it("prefers an active controller even when it is not slot zero", () => {
    const nav = {
      getGamepads: () => [
        pad({ index: 0, id: "Generic idle" }),
        pad({ index: 1, id: "Xbox Wireless Controller", buttons: { 0: { pressed: true, value: 1 } } }),
      ],
    };

    expect(getPrimaryGamepad(nav)?.index).toBe(1);
  });

  it("maps the restored controller layout", () => {
    const gp = pad({
      id: "Xbox Wireless Controller",
      buttons: {
        0: { pressed: true, value: 1 },
        1: { pressed: true, value: 1 },
        4: { pressed: true, value: 1 },
        7: { pressed: true, value: 1 },
        9: { pressed: true, value: 1 },
      },
      axes: { 0: 0.8, 1: -0.9, 2: 0.5, 3: 0.1 },
    });

    const controls = readGamepadControls(gp, 0.2);
    expect(controls.dash).toBe(true);
    expect(controls.grenade).toBe(true);
    expect(controls.previousWeapon).toBe(true);
    expect(controls.shoot).toBe(true);
    expect(controls.pause).toBe(true);
    expect(controls.left).toMatchObject({ x: 0.8, y: -0.9, active: true });
    expect(controls.right).toMatchObject({ x: 0.5, y: 0.1, active: true });
  });

  it("returns device-specific controller labels with a generic fallback", () => {
    expect(getControllerLabels("xbox")).toMatchObject({ shoot: "RT", dash: "A", grenade: "B" });
    expect(getControllerLabels("ps")).toMatchObject({ shoot: "R2", dash: "Cross", grenade: "Circle" });
    expect(getControllerLabels("unknown")).toMatchObject({ shoot: "RT / R2", dash: "A / Cross" });
  });

  it("remembers a local controller profile for repeat QA", () => {
    const stored = new Map();
    const storage = {
      getItem: (key) => stored.get(key) || null,
      setItem: (key, value) => stored.set(key, value),
    };
    const gp = pad({
      index: 2,
      id: "Xbox Wireless Controller",
      buttons: Array.from({ length: 16 }),
      axes: Array.from({ length: 4 }),
    });

    const profile = rememberControllerProfile(gp, storage);

    expect(profile).toMatchObject({ index: 2, type: "xbox", buttons: 16, axes: 4 });
    expect(loadControllerProfile(storage)).toMatchObject({ index: 2, type: "xbox", buttons: 16, axes: 4 });
    expect(buildControllerProfile(null)).toBeNull();
  });
});
