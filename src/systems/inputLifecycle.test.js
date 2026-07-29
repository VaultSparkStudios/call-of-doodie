import { describe, expect, it } from "vitest";
import {
  getInputActivityAge,
  neutralGamepadMove,
  neutralMovementStick,
  neutralShootStick,
  releaseInputState,
} from "./inputLifecycle.js";

function ref(current) {
  return { current };
}

describe("input lifecycle release contract", () => {
  it("releases every retained input source after focus loss", () => {
    const input = {
      keysRef: ref({ w: true, d: true, q: false }),
      mouseRef: ref({ down: true, moved: true }),
      joystickRef: ref({ active: true, dx: 42, dy: 0, id: 7 }),
      shootStickRef: ref({ active: true, shooting: true, dx: 20, dy: 10, id: 8 }),
      gamepadMoveRef: ref({ x: 1, y: 0, active: true }),
      gamepadShootRef: ref(true),
      gamepadAngleRef: ref(1.25),
    };

    const receipt = releaseInputState(input, { reason: "blur", now: 1234 });

    expect(input.keysRef.current).toEqual({ w: false, d: false, q: false });
    expect(input.mouseRef.current.down).toBe(false);
    expect(input.joystickRef.current).toEqual(neutralMovementStick());
    expect(input.shootStickRef.current).toEqual(neutralShootStick());
    expect(input.gamepadMoveRef.current).toEqual(neutralGamepadMove());
    expect(input.gamepadShootRef.current).toBe(false);
    expect(input.gamepadAngleRef.current).toBeNull();
    expect(receipt).toMatchObject({
      reason: "blur",
      at: 1234,
      released: { keyboardCount: 2, mouseDown: true, touchActive: true, gamepadActive: true },
    });
  });

  it("clears only stale gamepad state when polling finds no pad", () => {
    const input = {
      keysRef: ref({ a: true }),
      gamepadMoveRef: ref({ x: -1, y: 0, active: true }),
      gamepadShootRef: ref(true),
      gamepadAngleRef: ref(Math.PI),
    };

    const receipt = releaseInputState(input, { reason: "gamepad-missing", scopes: ["gamepad"] });

    expect(input.keysRef.current.a).toBe(true);
    expect(input.gamepadMoveRef.current).toEqual(neutralGamepadMove());
    expect(receipt.scopes).toEqual(["gamepad"]);
  });

  it("reports activity age without manufacturing evidence", () => {
    expect(getInputActivityAge({ keyboard: 900 }, "keyboard", 1250)).toBe(350);
    expect(getInputActivityAge({}, "keyboard", 1250)).toBeNull();
  });
});
