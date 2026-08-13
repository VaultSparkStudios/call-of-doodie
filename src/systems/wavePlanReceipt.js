const MAX_WAVE_PLAN_SNAPSHOTS = 20;

function safeInt(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.floor(number) : fallback;
}

function fingerprint(value) {
  let hash = 2166136261;
  for (const char of String(value)) {
    hash ^= char.codePointAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0").toUpperCase();
}

export function canonicalWavePlan(plan = {}) {
  const stages = Array.isArray(plan.stages) ? plan.stages.slice(0, 8).map((stage) => ({
    id: String(stage?.id || "unknown").slice(0, 24),
    aliveBudget: Math.max(0, safeInt(stage?.aliveBudget)),
    eliteEvery: Math.max(0, safeInt(stage?.eliteEvery)),
    progressUntil: Math.max(0, Math.min(1, Number(stage?.progressUntil) || 0)),
  })) : [];
  return {
    wave: Math.max(1, safeInt(plan.wave, 1)),
    themeId: String(plan.themeId || "unknown").slice(0, 24),
    event: plan.event == null ? null : String(plan.event).slice(0, 24),
    eliteType: plan.eliteType == null ? null : String(plan.eliteType).slice(0, 24),
    formationSet: safeInt(plan.wave, 1) >= 20 ? "coordinated" : "loose",
    stages,
  };
}

export function recordWavePlanSnapshot(ledger = [], plan = null, { maxEntries = MAX_WAVE_PLAN_SNAPSHOTS } = {}) {
  if (!plan) return Array.isArray(ledger) ? ledger.slice(-MAX_WAVE_PLAN_SNAPSHOTS) : [];
  const canonical = canonicalWavePlan(plan);
  const serialized = JSON.stringify(canonical);
  const entry = { ...canonical, fingerprint: fingerprint(serialized) };
  const boundedMax = Math.max(1, Math.min(MAX_WAVE_PLAN_SNAPSHOTS, safeInt(maxEntries, MAX_WAVE_PLAN_SNAPSHOTS)));
  const prior = Array.isArray(ledger) ? ledger.filter((item) => item && Number.isFinite(Number(item.wave))) : [];
  return [...prior.filter((item) => Number(item.wave) !== entry.wave), entry]
    .sort((left, right) => left.wave - right.wave)
    .slice(-boundedMax);
}

export function buildWavePlanReceipt(ledger = []) {
  const plans = (Array.isArray(ledger) ? ledger : [])
    .map((entry) => {
      const canonical = canonicalWavePlan(entry);
      return { ...canonical, fingerprint: fingerprint(JSON.stringify(canonical)) };
    })
    .sort((left, right) => left.wave - right.wave)
    .slice(-MAX_WAVE_PLAN_SNAPSHOTS);
  const combinedFingerprint = fingerprint(plans.map((plan) => `${plan.wave}:${plan.fingerprint}`).join("|"));
  return {
    schemaVersion: "recorded-wave-plan-v1",
    contract: "recorded-planned-pressure-evidence-not-spawn-physics-or-outcome-replay",
    confidence: "advisory",
    count: plans.length,
    firstWave: plans[0]?.wave ?? null,
    lastWave: plans.at(-1)?.wave ?? null,
    combinedFingerprint,
    plans,
  };
}
