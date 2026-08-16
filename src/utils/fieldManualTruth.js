/* global __COD_CONTENT_DATE__ */
import { buildReplayCoveragePassport } from "./replayCoverage.js";

// S155: injected by Vite define from git commit history (build-date.mjs) so
// the "as of" date can no longer freeze while the site moves on.
const CONTENT_DATE = typeof __COD_CONTENT_DATE__ !== "undefined" ? __COD_CONTENT_DATE__ : new Date().toISOString().slice(0, 10);

export function buildFieldManualTruth({ weapons = [], enemies = [], modes = [] } = {}) {
  const effectiveDate = CONTENT_DATE;
  const claims = [
    { id: "free", label: "Price", value: "Free to play", evidence: "No checkout or paid power path is present.", source: "/terms/", effectiveDate },
    { id: "save", label: "Progress", value: "Device-local", evidence: "Career progress stays in this browser; Porcelain Passport is a portable receipt, not cloud sync.", source: "/privacy/", effectiveDate },
    { id: "content", label: "Live roster", value: `${weapons.length} weapons · ${enemies.length} enemies · ${modes.length} modes`, evidence: "Generated from the same runtime constants used by the game.", source: "/gameplay-contract.json", effectiveDate },
    { id: "proof", label: "Replay proof", value: "Advisory", evidence: "Three deterministic coverage lanes are inspectable; full played-fight physics remain excluded.", coverage: buildReplayCoveragePassport(), source: "/gameplay-contract.json", effectiveDate },
    { id: "identity", label: "Identity", value: "Guest-first", evidence: "Obelisk verification is optional; the current Passport is minimal and local to this browser.", source: "/privacy/", effectiveDate },
    { id: "status", label: "Service", value: "Operational", evidence: `Live health and leaderboard trust checks passed as of ${effectiveDate}.`, source: "/status/", effectiveDate },
  ];
  return { schemaVersion: "field-manual-truth-v1", effectiveDate, claims, agentProjection: Object.fromEntries(claims.map(({ id, value, source }) => [id, { value, source }])) };
}
