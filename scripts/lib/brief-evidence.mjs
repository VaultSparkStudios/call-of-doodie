const ENDPOINT_TYPES = new Set(["production", "cloudflare"]);
const STAGING_TYPES = new Set(["staging", "staging-preview", "preview"]);

function clean(value) {
  return String(value ?? "").trim();
}

function surfaceIdentity(surface) {
  return `${clean(surface?.type).toLowerCase()}|${clean(surface?.url || surface?.command)}`;
}

function pushUnique(target, seen, surface) {
  if (!surface) return;
  const key = surfaceIdentity(surface);
  if (!key || seen.has(key)) return;
  seen.add(key);
  target.push(surface);
}

function newestOf(surfaces, predicate) {
  for (let index = surfaces.length - 1; index >= 0; index -= 1) {
    if (predicate(surfaces[index])) return surfaces[index];
  }
  return null;
}

/**
 * Project a compact current testing menu from append-only evidence history.
 * Stable endpoints remain visible; volatile receipt classes use their newest
 * entry, and the authoritative PROJECT_STATUS test counters outrank prose.
 */
export function selectCurrentTestingSurfaces(testingSurfaces = [], status = {}, limit = 8) {
  const surfaces = Array.isArray(testingSurfaces) ? testingSurfaces.filter(Boolean) : [];
  const selected = [];
  const seen = new Set();

  for (const surface of surfaces) {
    if (ENDPOINT_TYPES.has(clean(surface.type).toLowerCase()) && surface.url) {
      pushUnique(selected, seen, surface);
    }
  }

  pushUnique(selected, seen, newestOf(surfaces, (surface) => STAGING_TYPES.has(clean(surface.type).toLowerCase())));

  if (Number.isFinite(status.testsPassing) && Number.isFinite(status.testsTotal)) {
    pushUnique(selected, seen, {
      type: "tests",
      status: status.testsPassing === status.testsTotal ? "green" : "red",
      command: `npm test — ${status.testsPassing}/${status.testsTotal} passing`,
      source: "PROJECT_STATUS.testsPassing/testsTotal",
    });
  } else {
    pushUnique(selected, seen, newestOf(surfaces, (surface) => surface.type === "tests"));
  }

  pushUnique(selected, seen, newestOf(surfaces, (surface) => surface.type === "local-browser-capture"));

  const smoke = [];
  const smokeSeen = new Set();
  for (let index = surfaces.length - 1; index >= 0; index -= 1) {
    const surface = surfaces[index];
    if (surface.type !== "production-smoke") continue;
    const command = clean(surface.command);
    if (!command || smokeSeen.has(command)) continue;
    smokeSeen.add(command);
    smoke.unshift(surface);
  }
  for (const surface of smoke.slice(-2)) pushUnique(selected, seen, surface);

  if (selected.length < limit) {
    for (let index = surfaces.length - 1; index >= 0 && selected.length < limit; index -= 1) {
      const surface = surfaces[index];
      const type = clean(surface.type).toLowerCase();
      if (["tests", "deploy", "production-smoke", "local-browser-capture"].includes(type)) continue;
      if (STAGING_TYPES.has(type)) continue;
      pushUnique(selected, seen, surface);
    }
  }

  return selected.slice(0, Math.max(1, limit));
}

/**
 * Cost is an informational capacity signal in Max Plan mode. Never translate
 * notional list-price estimates into a founder-facing spend alarm.
 */
export function presentCostSignal(evaluation, { modelPlanMode = false } = {}) {
  if (modelPlanMode) {
    return {
      sig: "✓",
      detail: "flat-rate Max Plan · usage ledger informational · alarms disabled",
      alarmEligible: false,
    };
  }

  const realMetered7d = Number(evaluation?.realMetered7d || 0);
  const reasons = Array.isArray(evaluation?.reasons) ? evaluation.reasons : [];
  return {
    sig: evaluation?.sig || "✓",
    detail: `metered $${realMetered7d.toFixed(2)}/7d · ${reasons[0] || "normal"}`,
    alarmEligible: true,
  };
}

export function validateBriefEvidence(body, status = {}) {
  const issues = [];
  if (Number.isFinite(status.testsPassing) && Number.isFinite(status.testsTotal)) {
    const expected = `npm test — ${status.testsPassing}/${status.testsTotal} passing`;
    if (!String(body).includes(expected)) {
      issues.push(`WHERE TO TEST must include authoritative receipt: ${expected}`);
    }
  }
  if (status.modelPlanMode === true) {
    if (/[⛔⚠]\s+Cost\s+/u.test(String(body))) {
      issues.push("Max Plan cost must remain informational and non-alarming");
    }
    if (!/Cost\s+flat-rate Max Plan/u.test(String(body))) {
      issues.push("Max Plan cost provenance is missing from SIGNALS");
    }
  }
  return { ok: issues.length === 0, issues };
}
