export function buildFieldManualTruth({ weapons = [], enemies = [], modes = [] } = {}) {
  const effectiveDate = "2026-08-03";
  const claims = [
    { id: "free", label: "Price", value: "Free to play", evidence: "No checkout or paid power path is present.", source: "/terms/", effectiveDate },
    { id: "save", label: "Progress", value: "Device-local", evidence: "Career progress stays in this browser; Porcelain Passport is a portable receipt, not cloud sync.", source: "/privacy/", effectiveDate },
    { id: "content", label: "Live roster", value: `${weapons.length} weapons · ${enemies.length} enemies · ${modes.length} modes`, evidence: "Generated from the same runtime constants used by the game.", source: "/gameplay-contract.json", effectiveDate },
    { id: "proof", label: "Replay proof", value: "Advisory", evidence: "Decision-stream evidence is inspectable but is not full physics resimulation.", source: "/gameplay-contract.json", effectiveDate },
    { id: "identity", label: "Identity", value: "Guest-first", evidence: "Obelisk verification is optional; the current Passport is minimal and local to this browser.", source: "/privacy/", effectiveDate },
    { id: "status", label: "Service", value: "Operational", evidence: "Live health and leaderboard trust checks passed during the current implementation session.", source: "/status/", effectiveDate },
  ];
  return { schemaVersion: "field-manual-truth-v1", effectiveDate, claims, agentProjection: Object.fromEntries(claims.map(({ id, value, source }) => [id, { value, source }])) };
}
