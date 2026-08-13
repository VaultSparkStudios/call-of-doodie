const CONTRACT_LIMITS = Object.freeze({
  id: 48,
  focus: 72,
  target: 220,
  proof: 220,
});

function boundedText(value, maxLength) {
  if (typeof value !== "string") return "";
  return value.replace(/\s+/g, " ").trim().slice(0, maxLength);
}

export function sanitizeNextRunContract(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const contract = {
    schemaVersion: "next-run-menu-contract-v1",
    id: boundedText(value.id, CONTRACT_LIMITS.id),
    focus: boundedText(value.focus, CONTRACT_LIMITS.focus),
    target: boundedText(value.target, CONTRACT_LIMITS.target),
    proof: boundedText(value.proof, CONTRACT_LIMITS.proof),
  };
  if (!contract.id || !contract.focus || !contract.target || !contract.proof) return null;
  return contract;
}

function normalizedAction(action, fallback = {}) {
  if (!action) return null;
  return {
    schemaVersion: action.schemaVersion || "continuation-action-v2",
    id: action.id || fallback.id || "deploy",
    title: action.title || fallback.title || "Deploy",
    detail: action.detail || fallback.detail || "",
    cta: action.cta || fallback.cta || "DEPLOY",
    action: action.action || fallback.action || "deploy",
    accent: action.accent || fallback.accent || "#FF6B35",
    reasonCode: action.reasonCode || fallback.reasonCode || action.id || "commanders-order",
    payload: action.payload || fallback.payload || {},
    evidence: action.evidence || fallback.evidence || null,
  };
}

export function buildCommandersOrder({
  aimCheck = null,
  onboarding = null,
  pendingNextRunContract = null,
  journey = null,
  runIntel = null,
  commandBrief = [],
  masteryProjection = null,
} = {}) {
  const inputUnverified = aimCheck && aimCheck.status !== "verified";
  if (inputUnverified) {
    const aimAction = journey?.secondary?.action === "aim_check"
      ? journey.secondary
      : {
          id: "aim_check",
          title: aimCheck.label || "Prove Your Controls",
          detail: aimCheck.detail || "Verify your aim before deployment.",
          cta: "AIM CHECK",
          action: "aim_check",
          accent: "#FFD34D",
          reasonCode: "input-proof-required",
          evidence: { kind: "local-input", basis: aimCheck.status || "unverified" },
        };
    return {
      schemaVersion: "commanders-order-v1",
      kind: "input-proof",
      label: "COMMANDER'S ORDERS · INPUT PROOF",
      title: aimAction.title,
      detail: aimAction.detail,
      supporting: "Verify the local control path before a serious run.",
      reasonCode: aimAction.reasonCode || "input-proof-required",
      evidence: aimAction.evidence || { kind: "local-input", basis: aimCheck.status || "unverified" },
      action: normalizedAction(aimAction),
      steps: [],
      briefLines: [],
      dismissible: false,
    };
  }

  if (onboarding) {
    const active = onboarding.steps?.find((step) => step.active) || onboarding.steps?.[0];
    return {
      schemaVersion: "commanders-order-v1",
      kind: "first-runs",
      label: `FIRST 3 RUNS · RUN ${onboarding.activeRun}`,
      title: active?.title || "Learn the battlefield",
      detail: active?.text || "Deploy once and bring back one mistake worth fixing.",
      supporting: "One run, one lesson. Progress is recorded locally.",
      reasonCode: `first-runs-${onboarding.activeRun}`,
      evidence: { kind: "career", basis: `totalRuns=${onboarding.completedRuns}` },
      action: normalizedAction(journey?.primary, {
        id: "deploy",
        title: "Deploy",
        cta: "DEPLOY",
        action: "deploy",
        reasonCode: "first-runs-deploy",
      }),
      steps: onboarding.steps || [],
      briefLines: [],
      dismissible: false,
    };
  }

  const contract = sanitizeNextRunContract(pendingNextRunContract?.contract || pendingNextRunContract);
  if (contract) {
    return {
      schemaVersion: "commanders-order-v1",
      kind: "next-run-contract",
      label: "COMMANDER'S ORDERS · LAST RUN",
      title: contract.focus,
      detail: contract.target,
      supporting: contract.proof,
      reasonCode: `next-run-contract:${contract.id}`,
      evidence: { kind: "observed-post-run", basis: contract.id, schemaVersion: contract.schemaVersion },
      action: normalizedAction(journey?.primary, {
        id: "deploy",
        title: "Deploy with this order",
        cta: "DEPLOY WITH THIS ORDER",
        action: "deploy",
        reasonCode: `next-run-contract:${contract.id}`,
        payload: { contractId: contract.id },
      }),
      steps: [],
      briefLines: [],
      masteryProjection,
      dismissible: true,
    };
  }

  if (journey?.secondary) {
    return {
      schemaVersion: "commanders-order-v1",
      kind: "journey",
      label: `COMMANDER'S ORDERS · ${String(journey.label || "NEXT RUN").toUpperCase()}`,
      title: journey.secondary.title,
      detail: journey.detail,
      supporting: journey.secondary.detail,
      reasonCode: journey.secondary.reasonCode || journey.secondary.id || "ranked-journey",
      evidence: journey.secondary.evidence || { kind: "local-state", basis: journey.secondary.id || "journey" },
      action: normalizedAction(journey.secondary),
      steps: [],
      briefLines: Array.isArray(commandBrief) ? commandBrief.slice(0, 3) : [],
      masteryProjection,
      dismissible: false,
    };
  }

  return {
    schemaVersion: "commanders-order-v1",
    kind: "run-intelligence",
    label: "COMMANDER'S ORDERS · RUN INTELLIGENCE",
    title: String(runIntel?.focus || "play_now").replace(/_/g, " ").toUpperCase(),
    detail: runIntel?.directive || "Deploy with one clear intention.",
    supporting: runIntel?.recommendation || "",
    reasonCode: `run-intelligence:${runIntel?.focus || "fallback"}`,
    evidence: { kind: "local-run-history", basis: runIntel?.focus || "fallback" },
    action: normalizedAction(journey?.primary, { id: "deploy", cta: "DEPLOY", action: "deploy" }),
    steps: [],
    briefLines: Array.isArray(commandBrief) ? commandBrief.slice(0, 3) : [],
    masteryProjection,
    dismissible: false,
  };
}
