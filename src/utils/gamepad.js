const DEFAULT_DEAD_ZONE = 0.2;
const PROFILE_KEY = "cod-controller-profile";

let activeGamepadIndex = null;

export function detectControllerType(gp) {
  if (!gp) return "controller";
  const id = (gp.id || "").toLowerCase();
  if (id.includes("045e") || id.includes("xinput") || id.includes("xbox")) return "xbox";
  if (id.includes("054c") || id.includes("dualshock") || id.includes("dualsense") || id.includes("playstation")) return "ps";
  return "controller";
}

const CONTROLLER_LABELS = {
  xbox: {
    brand: "Xbox",
    move: "Left Stick",
    aim: "Right Stick",
    shoot: "RT",
    ads: "LT",
    dash: "A",
    grenade: "B",
    reload: "X",
    previousWeapon: "LB",
    nextWeapon: "RB",
    pause: "Menu",
    confirm: "A",
    back: "B",
  },
  ps: {
    brand: "PlayStation",
    move: "Left Stick",
    aim: "Right Stick",
    shoot: "R2",
    ads: "L2",
    dash: "Cross",
    grenade: "Circle",
    reload: "Square",
    previousWeapon: "L1",
    nextWeapon: "R1",
    pause: "Options",
    confirm: "Cross",
    back: "Circle",
  },
  controller: {
    brand: "Controller",
    move: "Left Stick",
    aim: "Right Stick",
    shoot: "RT / R2",
    ads: "LT / L2",
    dash: "A / Cross",
    grenade: "B / Circle",
    reload: "X / Square",
    previousWeapon: "LB / L1",
    nextWeapon: "RB / R1",
    pause: "Start / Options",
    confirm: "A / Cross",
    back: "B / Circle",
  },
};

export function getControllerLabels(type = "controller") {
  return CONTROLLER_LABELS[type] || CONTROLLER_LABELS.controller;
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

export function buildControllerProfile(gp) {
  if (!gp) return null;
  return {
    version: 1,
    index: gp.index,
    id: gp.id || "",
    type: detectControllerType(gp),
    axes: gp.axes?.length || 0,
    buttons: gp.buttons?.length || 0,
    lastSeen: Date.now(),
  };
}

export function rememberControllerProfile(gp, storage = globalThis.localStorage) {
  const profile = buildControllerProfile(gp);
  if (!profile || !storage?.setItem) return profile;
  try {
    storage.setItem(PROFILE_KEY, JSON.stringify(profile));
  } catch (_) {
    // Storage can be unavailable in privacy-restricted browsers.
  }
  return profile;
}

export function loadControllerProfile(storage = globalThis.localStorage) {
  if (!storage?.getItem) return null;
  try {
    const parsed = JSON.parse(storage.getItem(PROFILE_KEY) || "null");
    return parsed?.version === 1 ? parsed : null;
  } catch (_) {
    return null;
  }
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
