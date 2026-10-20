import fs from "node:fs";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  buildControllerProfile,
  detectControllerType,
  getControllerLabels,
  getPrimaryGamepad,
  loadControllerProfile,
  readGamepadControls,
  rememberControllerProfile,
  resetGamepadCalibration,
  resolveAimAxes,
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
  afterEach(() => vi.restoreAllMocks());

  it("persists an unchanged profile once across 600 polls and refreshes at one minute", () => {
    const clock = vi.spyOn(Date, "now").mockReturnValue(100000);
    const storage = { setItem: vi.fn() };
    for (let i = 0; i < 600; i++) {
      clock.mockReturnValue(100000 + i * 16);
      expect(rememberControllerProfile(pad(), storage).lastSeen).toBe(100000 + i * 16);
    }
    expect(storage.setItem).toHaveBeenCalledTimes(1);
    clock.mockReturnValue(159999);
    rememberControllerProfile(pad(), storage);
    expect(storage.setItem).toHaveBeenCalledTimes(1);
    clock.mockReturnValue(160000);
    rememberControllerProfile(pad(), storage);
    expect(storage.setItem).toHaveBeenCalledTimes(2);
    expect(JSON.parse(storage.setItem.mock.calls[1][1]).lastSeen).toBe(160000);
  });

  it("writes immediately for device, layout and storage changes", () => {
    const storage = { setItem: vi.fn() };
    const otherStorage = { setItem: vi.fn() };
    const gp = pad();
    rememberControllerProfile(gp, storage);
    rememberControllerProfile({ ...gp, index: 1 }, storage);
    rememberControllerProfile({ ...gp, index: 1, id: "Xbox" }, storage);
    rememberControllerProfile({ ...gp, index: 1, id: "Xbox", axes: [0, 0, 0, 0, 0, 0] }, storage);
    rememberControllerProfile({ ...gp, buttons: [] }, storage);
    rememberControllerProfile(gp, otherStorage);
    expect(storage.setItem).toHaveBeenCalledTimes(5);
    expect(otherStorage.setItem).toHaveBeenCalledTimes(1);
  });

  it("bounds failed storage attempts and retries after the refresh interval", () => {
    const clock = vi.spyOn(Date, "now").mockReturnValue(100000);
    const storage = { setItem: vi.fn(() => { throw new Error("denied"); }) };
    for (let i = 0; i < 600; i++) expect(rememberControllerProfile(pad(), storage)).not.toBeNull();
    expect(storage.setItem).toHaveBeenCalledTimes(1);
    storage.setItem.mockImplementation(() => {});
    clock.mockReturnValue(160000);
    rememberControllerProfile(pad(), storage);
    expect(storage.setItem).toHaveBeenCalledTimes(2);
  });

  it("recovers from a clock rollback and tolerates unavailable storage", () => {
    const clock = vi.spyOn(Date, "now").mockReturnValue(100000);
    const storage = { setItem: vi.fn() };
    rememberControllerProfile(pad(), storage);
    clock.mockReturnValue(90000);
    rememberControllerProfile(pad(), storage);
    expect(storage.setItem).toHaveBeenCalledTimes(2);
    expect(rememberControllerProfile(pad(), null)).toMatchObject({ version: 1 });
    expect(rememberControllerProfile(null, storage)).toBeNull();
  });
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

  it("finds a pad that connected in a later slot while slot zero is empty", () => {
    const nav = { getGamepads: () => [null, pad({ index: 1, id: "Wireless Controller" })] };
    expect(getPrimaryGamepad(nav)?.index).toBe(1);
  });

  it("is the only gamepad selector used by menu screens", () => {
    for (const file of ["SettingsPanel.jsx", "VirtualKeyboard.jsx"]) {
      const source = fs.readFileSync(path.resolve(process.cwd(), "src/components", file), "utf8");
      expect(source, file).not.toMatch(/getGamepads\?\.\(\)\[0\]/);
      expect(source, file).toContain("getPrimaryGamepad()");
    }
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

  describe("right-stick aim covers a full 360°", () => {
    const DIRECTIONS = Array.from({ length: 16 }, (_, i) => (i / 16) * Math.PI * 2 - Math.PI);

    function sweep(layout, { id, mapping, axisCount, xIdx, yIdx, rest = {} }) {
      resetGamepadCalibration();
      const resting = Array.from({ length: axisCount }, (_, i) => rest[i] ?? 0);
      const make = (axes) => ({ index: 0, id, mapping, buttons: [], axes });
      readGamepadControls(make(resting), 0.2); // first sight: pad at rest
      return DIRECTIONS.map((angle) => {
        const axes = [...resting];
        axes[xIdx] = Math.cos(angle);
        axes[yIdx] = Math.sin(angle);
        const { right } = readGamepadControls(make(axes), 0.2);
        expect(right.active, `${layout} @ ${angle}`).toBe(true);
        return Math.atan2(right.y, right.x);
      }).forEach((aimed, i) => {
        const diff = Math.atan2(Math.sin(aimed - DIRECTIONS[i]), Math.cos(aimed - DIRECTIONS[i]));
        expect(Math.abs(diff), `${layout} direction ${i}`).toBeLessThan(1e-9);
      });
    }

    it("standard mapping (Chrome/Edge/Safari, Xbox + PlayStation)", () => {
      sweep("standard", { id: "Xbox Wireless Controller (STANDARD GAMEPAD)", mapping: "standard", axisCount: 4, xIdx: 2, yIdx: 3 });
    });

    it("DualShock/DualSense with Firefox's non-standard layout", () => {
      // [LX, LY, RX, L2, R2, RY] — L2/R2 rest at -1. Reading axes 2/3 pinned Y to -1 (upper half only).
      sweep("ps-firefox", { id: "054c-09cc-Wireless Controller", mapping: "", axisCount: 6, xIdx: 2, yIdx: 5, rest: { 3: -1, 4: -1 } });
    });

    it("generic Linux pad with triggers interleaved before the right stick", () => {
      // [LX, LY, LT, RX, RY, RT] — triggers rest at -1.
      sweep("linux-generic", { id: "Generic USB Joystick", mapping: "", axisCount: 6, xIdx: 3, yIdx: 4, rest: { 2: -1, 5: -1 } });
    });

    it("non-standard Xbox pad whose triggers rest at 0", () => {
      sweep("xbox-linux", { id: "045e-028e-Microsoft X-Box 360 pad", mapping: "", axisCount: 8, xIdx: 3, yIdx: 4 });
    });

    it("never treats a resting trigger as a held stick", () => {
      resetGamepadCalibration();
      const gp = { index: 0, id: "054c-0ce6-DualSense", mapping: "", buttons: [], axes: [0, 0, 0, -1, -1, 0] };
      expect(resolveAimAxes(gp)).toEqual([2, 5]);
      expect(readGamepadControls(gp, 0.2).right.active).toBe(false);
    });
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
