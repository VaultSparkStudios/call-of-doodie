const DEFAULT_DEAD_ZONE = 0.2;

let activeGamepadIndex = null;

export function detectControllerType(gp) {
  if (!gp) return "controller";
  const id = (gp.id || "").toLowerCase();
  if (id.includes("045e") || id.includes("xinput") || id.includes("xbox")) return "xbox";
  if (id.includes("054c") || id.includes("dualshock") || id.includes("dualsense") || id.includes("playstation")) return "ps";
  return "controller";
}

function connectedGamepads(nav = globalThis.navigator) {
  const pads = nav?.getGamepads?.();
  return Array.from(pads || []).filter(Boolean);
}

function hasInput(gp, deadZone = DEFAULT_DEAD_ZONE) {
  return (gp.buttons || []).some(b => b?.pressed || (b?.value || 0) > 0.15)
    || (gp.axes || []).some(v => Math.abs(v || 0) > deadZone);
}

export function getPrimaryGamepad(nav = globalThis.navigator) {
  const pads = connectedGamepads(nav);
  if (pads.length === 0) {
    activeGamepadIndex = null;
    return null;
  }

  const active = pads.find(gp => hasInput(gp));
  if (active) {
    activeGamepadIndex = active.index;
    return active;
  }

  const remembered = pads.find(gp => gp.index === activeGamepadIndex);
  if (remembered) return remembered;

  const xbox = pads.find(gp => detectControllerType(gp) === "xbox");
  const chosen = xbox || pads[0];
  activeGamepadIndex = chosen.index;
  return chosen;
}

export function buttonPressed(gp, idx) {
  return !!gp?.buttons?.[idx]?.pressed;
}

export function buttonValue(gp, idx) {
  const btn = gp?.buttons?.[idx];
  return btn?.value ?? (btn?.pressed ? 1 : 0);
}

export function readStick(gp, xIdx, yIdx, deadZone = DEFAULT_DEAD_ZONE) {
  const x = gp?.axes?.[xIdx] ?? 0;
  const y = gp?.axes?.[yIdx] ?? 0;
  return Math.hypot(x, y) > deadZone ? { x, y, active: true } : { x: 0, y: 0, active: false };
}

export function readGamepadControls(gp, deadZone = DEFAULT_DEAD_ZONE) {
  const left = readStick(gp, 0, 1, deadZone);
  const right = readStick(gp, 2, 3, deadZone);

  return {
    left,
    right,
    shoot: buttonValue(gp, 7) > 0.3,
    dash: buttonPressed(gp, 0),
    grenade: buttonPressed(gp, 1),
    reload: buttonPressed(gp, 2),
    previousWeapon: buttonPressed(gp, 4) || buttonPressed(gp, 14),
    nextWeapon: buttonPressed(gp, 5) || buttonPressed(gp, 15),
    pause: buttonPressed(gp, 9),
    menuUp: buttonPressed(gp, 12) || left.y < -0.5,
    menuDown: buttonPressed(gp, 13) || left.y > 0.5,
    menuLeft: buttonPressed(gp, 14) || left.x < -0.5,
    menuRight: buttonPressed(gp, 15) || left.x > 0.5,
    confirm: buttonPressed(gp, 0),
    back: buttonPressed(gp, 1),
  };
}
