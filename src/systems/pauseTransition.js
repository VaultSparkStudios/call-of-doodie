const REASONS = {
  visibility: {
    code: "visibility",
    label: "AUTO-PAUSED · TAB HIDDEN",
    detail: "Held movement and fire input were released before the simulation stopped.",
  },
  blur: {
    code: "blur",
    label: "AUTO-PAUSED · FOCUS LOST",
    detail: "Held movement and fire input were released when the game window lost focus.",
  },
  pagehide: {
    code: "pagehide",
    label: "AUTO-PAUSED · PAGE HIDDEN",
    detail: "Held movement and fire input were released before the page was suspended.",
  },
  keyboard: { code: "keyboard", label: null, detail: null },
  controller: { code: "controller", label: null, detail: null },
  hud: { code: "hud", label: null, detail: null },
  touch: { code: "touch", label: null, detail: null },
  resume: { code: "resume", label: null, detail: null },
  leave: { code: "leave", label: null, detail: null },
};

function normalizeReason(reason) {
  return REASONS[reason] || { code: "explicit", label: null, detail: null };
}

export function planPauseTransition({ paused = false, nextPaused = false, reason = "explicit" } = {}) {
  const current = Boolean(paused);
  const next = Boolean(nextPaused);
  const resolved = normalizeReason(reason);
  return {
    changed: current !== next,
    paused: next,
    reason: resolved.code,
    label: next ? resolved.label : null,
    detail: next ? resolved.detail : null,
    releaseInputs: current !== next && next,
    traceValue: `${next ? "on" : "off"}:${resolved.code}`,
    claim: "observed-pause-transition-not-score-invalidation",
  };
}
