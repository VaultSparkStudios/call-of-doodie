const INPUT_SCOPES = Object.freeze(["keyboard", "mouse", "touch", "gamepad"]);

export function neutralMovementStick() {
  return { active: false, startX: 0, startY: 0, dx: 0, dy: 0, id: null };
}

export function neutralShootStick() {
  return { ...neutralMovementStick(), shooting: false };
}

export function neutralGamepadMove() {
  return { x: 0, y: 0, active: false };
}

function normalizeScopes(scopes) {
  const requested = Array.isArray(scopes) && scopes.length ? scopes : INPUT_SCOPES;
  return INPUT_SCOPES.filter((scope) => requested.includes(scope));
}

function safeRefValue(ref) {
  return ref && typeof ref === "object" ? ref.current : undefined;
}

export function releaseInputState(input = {}, {
  reason = "explicit",
  scopes = INPUT_SCOPES,
  now = Date.now(),
} = {}) {
  const releasedScopes = normalizeScopes(scopes);
  let keyboardCount = 0;
  let mouseDown = false;
  let touchActive = false;
  let gamepadActive = false;

  if (releasedScopes.includes("keyboard")) {
    const keys = safeRefValue(input.keysRef) || input.keys || {};
    for (const key of Object.keys(keys)) {
      if (keys[key]) keyboardCount += 1;
      keys[key] = false;
    }
  }

  if (releasedScopes.includes("mouse")) {
    const mouse = safeRefValue(input.mouseRef);
    mouseDown = mouse?.down === true;
    if (mouse) mouse.down = false;
  }

  if (releasedScopes.includes("touch")) {
    const movement = safeRefValue(input.joystickRef);
    const shooting = safeRefValue(input.shootStickRef);
    touchActive = movement?.active === true || shooting?.active === true || shooting?.shooting === true;
    if (input.joystickRef) input.joystickRef.current = neutralMovementStick();
    if (input.shootStickRef) input.shootStickRef.current = neutralShootStick();
  }

  if (releasedScopes.includes("gamepad")) {
    const movement = safeRefValue(input.gamepadMoveRef);
    gamepadActive = movement?.active === true
      || safeRefValue(input.gamepadShootRef) === true
      || safeRefValue(input.gamepadAngleRef) != null;
    if (input.gamepadMoveRef) input.gamepadMoveRef.current = neutralGamepadMove();
    if (input.gamepadShootRef) input.gamepadShootRef.current = false;
    if (input.gamepadAngleRef) input.gamepadAngleRef.current = null;
  }

  return {
    schemaVersion: "input-release-v1",
    at: Number.isFinite(Number(now)) ? Number(now) : Date.now(),
    reason: String(reason || "explicit"),
    scopes: releasedScopes,
    released: {
      keyboardCount,
      mouseDown,
      touchActive,
      gamepadActive,
    },
    claim: "observed-input-state-release-not-device-fault-causality",
  };
}

export function getInputActivityAge(activity = {}, source = "unknown", now = Date.now()) {
  const timestamp = Number(activity?.[source]);
  if (!Number.isFinite(timestamp) || timestamp <= 0) return null;
  return Math.max(0, Number(now) - timestamp);
}
