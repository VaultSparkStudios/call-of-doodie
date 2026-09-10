const MAX_COUNT = 999_999;

export const HAZARD_CASE_FILES = Object.freeze({
  sewer_flood: Object.freeze({
    id: "sewer_flood",
    label: "SEWER FLOOD",
    icon: "🌊",
    tone: "#33E6FF",
    countermeasure: "Stay inside the closing ring; the radar previews its next squeeze.",
    sourceNames: Object.freeze(["sewer flood"]),
  }),
  proximity_mine: Object.freeze({
    id: "proximity_mine",
    label: "PROXIMITY MINE",
    icon: "💣",
    tone: "#FFB347",
    countermeasure: "Break your line before the trigger radius; dash only after the tell.",
    sourceNames: Object.freeze(["proximity mine"]),
  }),
  extraction_lockdown: Object.freeze({
    id: "extraction_lockdown",
    label: "EXTRACTION LOCKDOWN",
    icon: "🚨",
    tone: "#FF6B5E",
    countermeasure: "Evacuate below alarm 100; lockdown seals the toilet and starts a last stand.",
    sourceNames: Object.freeze([]),
  }),
});

const SOURCE_TO_ID = new Map(
  Object.values(HAZARD_CASE_FILES).flatMap((entry) => entry.sourceNames.map((name) => [name, entry.id])),
);

function boundedCount(value) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, Math.min(MAX_COUNT, Math.floor(number))) : 0;
}

export function resolveHazardCaseId(attribution) {
  if (attribution?.evidenceLevel !== "observed" || !attribution.hazard) return null;
  return SOURCE_TO_ID.get(String(attribution.sourceName || "").trim().toLowerCase()) || null;
}

export function normalizeHazardChronicle(value, legacyDeaths = null) {
  const source = value && typeof value === "object" && !Array.isArray(value) ? value : {};
  const result = {};
  for (const id of Object.keys(HAZARD_CASE_FILES)) {
    const raw = source[id];
    const deaths = boundedCount(raw?.deaths);
    const encounters = boundedCount(raw?.encounters);
    if (deaths || encounters) result[id] = { deaths, encounters };
  }
  if (legacyDeaths && typeof legacyDeaths === "object" && !Array.isArray(legacyDeaths)) {
    for (const [sourceName, count] of Object.entries(legacyDeaths)) {
      const id = SOURCE_TO_ID.get(String(sourceName).trim().toLowerCase());
      if (!id) continue;
      const current = result[id] || { deaths: 0, encounters: 0 };
      current.deaths = Math.max(current.deaths, boundedCount(count));
      result[id] = current;
    }
  }
  return result;
}

export function incrementHazardChronicle(value, id, event) {
  if (!HAZARD_CASE_FILES[id] || !["death", "encounter"].includes(event)) return normalizeHazardChronicle(value);
  const result = normalizeHazardChronicle(value);
  const current = result[id] || { deaths: 0, encounters: 0 };
  const field = event === "death" ? "deaths" : "encounters";
  result[id] = { ...current, [field]: boundedCount(current[field] + 1) };
  return result;
}

export function buildHazardCaseFileRows(career) {
  const chronicle = normalizeHazardChronicle(career?.hazardChronicle, career?.hazardDeaths);
  return Object.entries(chronicle)
    .map(([id, counts]) => {
      const definition = HAZARD_CASE_FILES[id];
      const primary = counts.deaths > 0
        ? { count: counts.deaths, metric: `killed you ${counts.deaths}×` }
        : { count: counts.encounters, metric: `sealed the exit ${counts.encounters}×` };
      return { ...definition, ...counts, ...primary };
    })
    .filter((row) => row.count > 0)
    .sort((left, right) => right.count - left.count || left.label.localeCompare(right.label));
}
