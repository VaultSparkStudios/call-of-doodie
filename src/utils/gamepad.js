const DEFAULT_DEAD_ZONE = 0.2;
const PROFILE_KEY = "cod-controller-profile";
const PROFILE_REFRESH_MS = 60_000;
const profileAttempts = new WeakMap();

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

// Resting axis values per pad, captured the first time the pad is read (a pad
// only becomes visible after a button press, so its sticks are almost always
// centred then). Analog triggers on non-standard layouts rest near -1; that
// baseline is how they are told apart from stick axes.
const restingAxes = new Map();
const TRIGGER_REST = 0.5;

function restingAxesFor(gp) {
  const axes = gp?.axes || [];
  const key = `${gp?.index ?? 0}:${gp?.id || ""}`;
  let rest = restingAxes.get(key);
  if (!rest || rest.length !== axes.length) {
    rest = Array.from(axes, v => Number(v) || 0);
    restingAxes.set(key, rest);
  }
  return rest;
}

export function resetGamepadCalibration() {
  restingAxes.clear();
}

// Right-stick axis indices. The W3C "standard" mapping puts the right stick on
// axes 2/3, but non-standard pads interleave analog triggers there — e.g. a
// DualShock/DualSense in Firefox reports [LX, LY, RX, L2, R2, RY] and generic
// Linux pads report [LX, LY, LT, RX, RY, RT]. Reading a resting trigger (-1) as
// stick Y pinned aim to a single half-plane: only 180° of rotation.
export function resolveAimAxes(gp) {
  const count = gp?.axes?.length || 0;
  if (gp?.mapping === "standard" || count <= 4) return [2, 3];
  const type = detectControllerType(gp);
  if (type === "ps") return [2, 5];
  const rest = restingAxesFor(gp);
  const sticks = [];
  for (let i = 2; i < count && sticks.length < 2; i++) {
    if (Math.abs(rest[i]) < TRIGGER_REST) sticks.push(i);
  }
  if (sticks.length === 2 && !(type === "xbox" && sticks[0] === 2)) return sticks;
  return type === "xbox" ? [3, 4] : [2, 3];
}

function hasInput(gp, deadZone = DEFAULT_DEAD_ZONE) {
  const rest = restingAxesFor(gp);
  const [aimX, aimY] = resolveAimAxes(gp);
  const knownLayout = detectControllerType(gp) !== "controller";
  return (gp.buttons || []).some(b => b?.pressed || (b?.value || 0) > 0.15)
    || (gp.axes || []).some((v, i) => {
      // Known sticks are centered at zero even if first sighted while held.
      // An unknown layout's fallback can include a resting trigger at an
      // endpoint. Keep that baseline without calibrating a partly held stick
      // (such as 0.8) into a false neutral position.
      const aimStick = (i === aimX || i === aimY)
        && (knownLayout || Math.abs(rest[i] || 0) < 0.95);
      const baseline = gp.mapping === "standard" || i < 2 || aimStick
        ? 0 : (rest[i] || 0);
      return Math.abs((v || 0) - baseline) > deadZone;
    });
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

export function rememberControllerProfile(gp, storage) {
  const profile = buildControllerProfile(gp);
  if (!profile) return profile;
  try {
    // Accessing localStorage itself can throw in restricted browser contexts.
    const target = storage === undefined ? globalThis.localStorage : storage;
    if (!target?.setItem) return profile;
    const previous = profileAttempts.get(target);
    const sameDevice = previous && ["index", "id", "type", "axes", "buttons"]
      .every(key => previous[key] === profile[key]);
    const elapsed = profile.lastSeen - (previous?.lastSeen ?? 0);
    if (sameDevice && elapsed >= 0 && elapsed < PROFILE_REFRESH_MS) return profile;
    // Bound failed writes too; a denied storage API must not throw every poll.
    profileAttempts.set(target, profile);
    target.setItem(PROFILE_KEY, JSON.stringify(profile));
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
  const [aimX, aimY] = resolveAimAxes(gp);
  const right = readStick(gp, aimX, aimY, deadZone);

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
