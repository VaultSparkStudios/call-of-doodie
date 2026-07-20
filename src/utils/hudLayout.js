export function getHudDebugSlots({ isMobile = false } = {}) {
  const bottomInset = isMobile ? 56 : 0;
  return [
    { id: "top-left", label: "TOP LEFT", style: { top: 4, left: 8, width: 210, height: 122 } },
    { id: "top-center", label: "TOP CENTER", style: { top: 4, left: "50%", width: 540, height: 128, transform: "translateX(-50%)" } },
    { id: "top-right", label: "TOP RIGHT", style: { top: 4, right: 8, width: 210, height: 112 } },
    { id: "bottom-left", label: "BOTTOM LEFT", style: { bottom: 8 + bottomInset, left: 8, width: 240, height: 142 } },
    { id: "bottom-center", label: "BOTTOM CENTER", style: { bottom: 8 + bottomInset, left: "50%", width: 560, height: 74, transform: "translateX(-50%)" } },
    { id: "bottom-right", label: "BOTTOM RIGHT", style: { bottom: 8 + bottomInset, right: 8, width: 240, height: 142 } },
  ];
}

export function isHudDebugEnabled(search = globalThis.location?.search || "", storage = globalThis.localStorage) {
  try {
    return new URLSearchParams(search).get("debug") === "hud"
      || storage?.getItem?.("cod-debug-hud") === "1";
  } catch {
    return false;
  }
}


export function getHudCenterStackLayout({
  isMobile = false,
  hasIntegrityWarning = false,
  hasDrill = false,
  hasSpeedrun = false,
  hasRunModifier = false,
  hasChallenge = false,
  hasGhosts = false,
  hasWeeklyRival = false,
  hasRivalPace = false,
} = {}) {
  const heights = {
    integrity: 30,
    drill: 26,
    speedrun: 36,
    runModifier: 24,
    challenge: 24,
    ghosts: 24,
    weeklyRival: 24,
    rivalPace: 32,
  };
  const enabled = [
    ["integrity", hasIntegrityWarning],
    ["drill", hasDrill],
    ["speedrun", hasSpeedrun],
    ["runModifier", hasRunModifier],
    ["challenge", hasChallenge],
    ["ghosts", hasGhosts],
    ["weeklyRival", hasWeeklyRival],
    ["rivalPace", hasRivalPace],
  ];
  const gap = isMobile ? 3 : 4;
  let cursor = isMobile ? 36 : 34;
  const slots = {};
  for (const [id, active] of enabled) {
    if (!active) continue;
    slots[id] = cursor;
    cursor += heights[id] + gap;
  }
  return { slots, heights, gap, bottom: cursor };
}
