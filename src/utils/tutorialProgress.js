export const TUTORIAL_KEY = "cod-tutorial-v2";
export const TUTORIAL_ACTIONS = Object.freeze(["move", "shoot", "kill", "dash", "grenade", "perk"]);

export function normalizeTutorialEvidence(value = {}) {
  return Object.fromEntries(TUTORIAL_ACTIONS.map((action) => [action, Boolean(value[action])]));
}

export function markTutorialAction(evidence, action) {
  const normalized = normalizeTutorialEvidence(evidence);
  if (!TUTORIAL_ACTIONS.includes(action) || normalized[action]) return normalized;
  return { ...normalized, [action]: true };
}

export function tutorialStepComplete(requirement, evidence) {
  if (!requirement) return false;
  const normalized = normalizeTutorialEvidence(evidence);
  const required = Array.isArray(requirement) ? requirement : [requirement];
  return required.every((action) => normalized[action]);
}

function stores(win = globalThis.window) {
  return [win?.localStorage, win?.sessionStorage].filter(Boolean);
}

export function shouldShowTutorial(win = globalThis.window) {
  try {
    const force = new URLSearchParams(win?.location?.search || "").get("tutorial");
    if (force === "1" || force === "reset") return true;
    return stores(win).every((storage) => storage.getItem(TUTORIAL_KEY) !== "1");
  } catch (_) {
    return true;
  }
}

export function completeTutorial(win = globalThis.window) {
  for (const storage of stores(win)) {
    try { storage.setItem(TUTORIAL_KEY, "1"); } catch (_) { /* storage health handles critical progression paths */ }
  }
}

export function resetTutorialProgress(win = globalThis.window) {
  for (const storage of stores(win)) {
    try { storage.removeItem(TUTORIAL_KEY); } catch (_) { /* reset remains best-effort */ }
  }
  return true;
}
