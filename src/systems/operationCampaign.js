export const OPERATION_SCHEMA_VERSION = "operation-definition-v1";
export const ENCOUNTER_VERBS = Object.freeze(["BREACH", "HOLD", "ESCORT", "HUNT", "SABOTAGE", "ESCAPE", "BOSS"]);
export const OPERATION_ENCOUNTER_VERBS = ENCOUNTER_VERBS;

const ENCOUNTER_SCORES = [1000, 1250, 1500, 1600, 1700, 1800, 3000];

function encounters(prefix, titles) {
  return ENCOUNTER_VERBS.map((verb, index) => ({
    id: `${prefix}-${verb.toLowerCase()}`,
    verb,
    title: titles[index],
    act: index < 2 ? 1 : index < 5 ? 2 : 3,
    scoreValue: ENCOUNTER_SCORES[index],
  }));
}

function operation({ id, seed, title, brief, routeLabel, routeOptions, antagonist, titles, priorRouteConsequence = null }) {
  return {
    schemaVersion: OPERATION_SCHEMA_VERSION,
    id,
    seed,
    title,
    brief,
    durationMinutes: [12, 18],
    routeLabel,
    routeOptions,
    scoring: { summary: "Objectives + tempo + extraction" },
    antagonist,
    recurringAntagonists: ["Regional Manager Karen", "Deputy Landlord"],
    priorRouteConsequence,
    encounters: encounters(id, titles),
  };
}

export const OPERATIONS = [
  operation({
    id: "blacksite-flush", seed: 3101, title: "BLACKSITE FLUSH",
    brief: "Breach Karen's complaint bunker and flush the evidence before extraction.",
    routeLabel: "Service Tunnel / Executive Washroom",
    routeOptions: ["service-tunnel", "executive-washroom"],
    antagonist: { id: "regional-manager-karen", name: "Regional Manager Karen", recurring: true },
    titles: ["Kick the Stall", "Courtesy Hold", "Plunger Detail", "Complaint Hunt", "Void Validation", "Courtesy Flush", "Regional Manager Karen"],
  }),
  operation({
    id: "porcelain-siege", seed: 4102, title: "PORCELAIN SIEGE",
    brief: "Retake the porcelain district from Deputy Landlord's rent collectors.",
    routeLabel: "Laundry Annex / Boiler Room",
    routeOptions: ["laundry-annex", "boiler-room"],
    antagonist: { id: "deputy-landlord", name: "Deputy Landlord", recurring: true },
    priorRouteConsequence: { sourceOperationId: "blacksite-flush", routeId: "service-tunnel", id: "tunnel-debt", description: "The prior tunnel route powers a defensive pump." },
    titles: ["Serve Notice", "Security Deposit", "Eviction Convoy", "Leasebreaker", "Cut Utilities", "Thirty-Day Notice", "Deputy Landlord"],
  }),
  operation({
    id: "final-notice", seed: 5103, title: "FINAL NOTICE",
    brief: "Return Karen and the Landlord's legally dubious super-complaint to sender.",
    routeLabel: "Records Office / Executive Penthouse",
    routeOptions: ["records-office", "executive-penthouse"],
    antagonist: { id: "hoa-board", name: "The HOA Board", recurring: false },
    titles: ["Break Quorum", "Appeals Window", "Certified Mail", "Paper Trail", "Shred Fine Print", "Return to Sender", "The HOA Board"],
  }),
];

function deepFreeze(value) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return value;
  Object.values(value).forEach(deepFreeze);
  return Object.freeze(value);
}
deepFreeze(OPERATIONS);

export const OPERATION_CAMPAIGN = deepFreeze({ schemaVersion: "operation-campaign-v1", id: "civic-doodie", operations: OPERATIONS });
export const getOperation = (operationId) => OPERATIONS.find((entry) => entry.id === operationId) || null;
export const getOperationIds = () => OPERATIONS.map((entry) => entry.id);
export const getAllOperationEncounters = (entry) => entry?.encounters || [];

export function validateOperationDefinition(entry) {
  const errors = [];
  if (entry?.schemaVersion !== OPERATION_SCHEMA_VERSION) errors.push("INVALID_SCHEMA_VERSION");
  if (!entry?.id) errors.push("MISSING_ID");
  if (entry?.encounters?.length !== 7) errors.push("SEVEN_ENCOUNTERS_REQUIRED");
  if (entry?.encounters?.some((item, index) => item.verb !== ENCOUNTER_VERBS[index])) errors.push("ENCOUNTER_VERB_ORDER_INVALID");
  if (entry?.routeOptions?.length !== 2) errors.push("TWO_ROUTES_REQUIRED");
  return { valid: errors.length === 0, errors };
}

export function validateOperationCampaign() {
  const errors = [];
  if (OPERATIONS.length !== 3) errors.push("THREE_OPERATIONS_REQUIRED");
  for (const entry of OPERATIONS) {
    const result = validateOperationDefinition(entry);
    errors.push(...result.errors.map((error) => `${entry.id}:${error}`));
  }
  return { valid: errors.length === 0, errors };
}
