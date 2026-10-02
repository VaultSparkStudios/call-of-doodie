import { describe, expect, it, vi } from "vitest";
import { markInputActivity, releaseAllInputs, sampleCommandTrace } from "./inputBridge.js";

describe("input bridge", () => {
  it("releases only requested device scopes and keeps a diagnostic receipt", () => {
    const refs = {
      keysRef: { current: { w: true } },
      mouseRef: { current: { down: true } },
      joystickRef: { current: { active: true } },
      shootStickRef: { current: { active: true, shooting: true } },
      gamepadMoveRef: { current: { x: 1, y: 0, active: true } },
      gamepadShootRef: { current: true },
      gamepadAngleRef: { current: 1 },
    };
    const receiptRef = { current: null };
    const receipt = releaseAllInputs(refs, receiptRef, "keyboard-blur", ["keyboard", "mouse"]);
    expect(refs.keysRef.current.w).toBe(false);
    expect(refs.mouseRef.current.down).toBe(false);
    expect(refs.joystickRef.current.active).toBe(true);
    expect(refs.gamepadShootRef.current).toBe(true);
    expect(receiptRef.current).toBe(receipt);
    expect(receipt.scopes).toEqual(["keyboard", "mouse"]);
  });

  it("bounds activity source and samples trace only when direction or interval changes", () => {
    const activity = { current: {} };
    markInputActivity(activity, "unknown");
    expect(activity.current.keyboard).toBeGreaterThan(0);
    const args = { action: "aim", bucket: "north", interval: 30, lastTraceAimRef: { current: { bucket: "", frame: 0 } }, lastTraceMoveRef: { current: { bucket: "", frame: 0 } }, frameCountRef: { current: 10 }, recordCommandTrace: vi.fn() };
    sampleCommandTrace(args);
    sampleCommandTrace(args);
    expect(args.recordCommandTrace).toHaveBeenCalledTimes(1);
    args.frameCountRef.current = 40;
    sampleCommandTrace(args);
    expect(args.recordCommandTrace).toHaveBeenCalledTimes(2);
  });
});
