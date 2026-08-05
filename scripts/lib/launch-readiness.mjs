const EVIDENCE_GATES = Object.freeze([
  {
    id: "mobile-pwa-install-pass",
    label: "Real mobile Progressive Web App install pass",
    owner: "physical-device",
    evidence: "Device, browser, install/open result, complete run lifecycle, and date in docs/LAUNCH_EXECUTION.md.",
    nextCommand: "npm run launch:surfaces",
  },
  {
    id: "gamepad-browser-pass",
    label: "Real gamepad/browser pass",
    owner: "physical-device",
    evidence: "Controller model, browser, movement, aim, actions, menus, death, and restart in docs/LAUNCH_EXECUTION.md.",
    nextCommand: "npm run launch:smoke",
  },
  {
    id: "verified-reply-email",
    label: "Verified on-domain delivery and reply-as identity",
    owner: "provider-dashboard",
    evidence: "Inbound delivery and reply-as hello@callofdoodie.wtf proof recorded in docs/LAUNCH_EXECUTION.md.",
    nextCommand: "node ../vaultspark-studio-ops/scripts/check-secrets.mjs --for zoho.mail",
  },
  {
    id: "itchio-publication",
    label: "Public Itch.io listing",
    owner: "publication",
    evidence: "Public listing URL with canonical play link and launch media in docs/LAUNCH_EXECUTION.md.",
    nextCommand: "node scripts/launch-readiness.mjs --json",
  },
  {
    id: "consented-playtest-evidence",
    label: "Consented participant evidence",
    owner: "participant-data",
    evidence: "A consented Playtest Pulse export or equivalent outcome note, without inferred retention claims.",
    nextCommand: "npm run launch:readiness -- --json",
  },
  {
    id: "direct-pixel-review",
    label: "Direct desktop/mobile theme pixel review",
    owner: "visual-evidence",
    evidence: "Hash-bound desktop and mobile captures directly inspected in every touched theme/state.",
    nextCommand: "npm run visual:audit",
  },
]);

function providerGate(id, label, status) {
  return {
    id,
    label,
    owner: "provider-capability",
    rung: "sparked",
    required: true,
    status,
    ready: status === "ready",
    reason: status === "ready"
      ? "project-scoped provider capability declared ready"
      : status === "missing"
        ? "canonical secrets discovery reports the provider capability missing"
        : "provider status unknown; pass a redacted readiness flag after secrets-gateway discovery",
  };
}

export function buildLaunchReadinessReceipt({
  assets = {},
  providers = {},
  completedEvidence = [],
  founderApproved = false,
} = {}) {
  const completed = new Set(completedEvidence);
  const pngCount = Number(assets.pngCount || 0);
  const svgCount = Number(assets.svgCount || 0);
  const assetReady = svgCount > 0 && pngCount >= svgCount;
  const engineeringGates = [{
    id: "launch-media-assets",
    label: "Generated launch media assets",
    owner: "repository",
    rung: "engineering",
    required: true,
    ready: assetReady,
    status: assetReady ? "ready" : "missing",
    reason: `${pngCount}/${svgCount} PNG exports present`,
    nextCommand: "npm run launch:assets",
  }];
  const providerGates = [
    providerGate("posthog-project-capability", "Project-scoped PostHog capability", providers.posthog || "unknown"),
    providerGate("sentry-project-capability", "Project-scoped Sentry capability", providers.sentry || "unknown"),
  ];
  const evidenceGates = EVIDENCE_GATES.map((gate) => ({
    ...gate,
    rung: "sparked",
    required: true,
    ready: completed.has(gate.id),
    status: completed.has(gate.id) ? "ready" : "missing",
    reason: completed.has(gate.id) ? "evidence declared present" : "required external evidence not declared",
  }));
  const founderGate = {
    id: "founder-approval",
    label: "Founder SPARKED approval",
    owner: "founder",
    rung: "sparked",
    required: true,
    ready: Boolean(founderApproved),
    status: founderApproved ? "ready" : "missing",
    reason: founderApproved ? "explicit approval declared" : "explicit approval not declared",
  };
  const engineeringReady = engineeringGates.every((gate) => gate.ready);
  const sparkedGates = [...engineeringGates, ...providerGates, ...evidenceGates, founderGate];
  const sparkedReady = sparkedGates.every((gate) => !gate.required || gate.ready);
  return {
    schemaVersion: "launch-readiness-v2",
    status: !engineeringReady
      ? "engineering_blocked"
      : sparkedReady
        ? "sparked_ready"
        : "engineering_ready_sparked_blocked",
    engineeringReady,
    sparkedReady,
    engineeringGates,
    sparkedGates,
    summary: {
      engineeringReadyCount: engineeringGates.filter((gate) => gate.ready).length,
      engineeringGateCount: engineeringGates.length,
      sparkedReadyCount: sparkedGates.filter((gate) => gate.ready).length,
      sparkedGateCount: sparkedGates.length,
      blockedSparkedGateIds: sparkedGates.filter((gate) => gate.required && !gate.ready).map((gate) => gate.id),
    },
    contract: "engineering readiness authorizes repository and isolated-staging work only; SPARKED readiness requires every required external/provider/founder receipt",
  };
}

export function renderLaunchReadiness(receipt) {
  const lines = [
    "Launch Readiness",
    "===============",
    `Engineering: ${receipt.engineeringReady ? "READY" : "BLOCKED"}`,
    `SPARKED: ${receipt.sparkedReady ? "READY" : "NO-GO"}`,
    "",
    "Engineering gates:",
    ...receipt.engineeringGates.map((gate) => `- ${gate.ready ? "✓" : "□"} ${gate.label} — ${gate.reason}`),
    "",
    "SPARKED gates:",
    ...receipt.sparkedGates
      .filter((gate) => gate.rung === "sparked")
      .map((gate) => `- ${gate.ready ? "✓" : "□"} [${gate.owner}] ${gate.label} — ${gate.reason}${gate.nextCommand ? ` · Next: ${gate.nextCommand}` : ""}`),
    "",
    `Verdict: ${receipt.status}. Missing provider capabilities and external evidence do not block local engineering, but they do block a SPARKED claim.`,
  ];
  return lines.join("\n");
}
