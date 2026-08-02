#!/usr/bin/env node

// Usage: node scripts/protocol-drift-check.mjs [--json]
// Inventories required protocol helpers and canonical section anchors.

import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "./lib/safe-spawn.mjs";

const ROOT = process.cwd();
const JSON_MODE = process.argv.includes("--json");

if (process.argv.includes("--help")) {
  console.log("Usage: node scripts/protocol-drift-check.mjs [--json]");
  process.exit(0);
}

const helpers = [
  { rel: "scripts/set-active-skill.mjs", level: "required", purpose: "records active Studio OS skill" },
  { rel: "scripts/write-session-lock.mjs", level: "required", purpose: "marks the active session owner" },
  { rel: "scripts/context-meter.mjs", level: "required", purpose: "keeps long sessions inside context budget" },
  { rel: "scripts/render-startup-brief.mjs", level: "required", purpose: "renders the startup brief" },
  { rel: "scripts/validate-brief-format.mjs", level: "required", purpose: "checks startup brief shape" },
  { rel: "scripts/check-secrets.mjs", level: "required", purpose: "checks capability readiness without raw secrets" },
  { rel: "scripts/ops.mjs", level: "required", purpose: "local command router and blocker preflight" },
  { rel: "prompts/initiate.md", level: "required", purpose: "keeps start.md Type A/B initiation routing executable" },
  { rel: "scripts/credential-watch.mjs", level: "optional", purpose: "auto-detects credential transitions" },
  { rel: "scripts/ark.mjs", level: "optional", purpose: "drains and ships Studio Ark cargo" },
  { rel: "scripts/check-brief-staleness.mjs", level: "optional", purpose: "chooses full brief versus delta brief" },
  { rel: "scripts/build-skill-manifest.mjs", level: "optional", purpose: "warns on skill registry drift" },
  { rel: "scripts/skill-trace-emit.mjs", level: "optional", purpose: "emits skill telemetry breadcrumbs" },
  { rel: "scripts/cache-genius-list.mjs", level: "optional", purpose: "keeps startup genius-list command executable" },
  { rel: "scripts/generate-genius-list.mjs", level: "optional", purpose: "renders brief startup recommendations" },
  { rel: "scripts/sample-codebase.mjs", level: "optional", purpose: "supports bounded audit code sampling" },
  { rel: "scripts/studio-oracle.mjs", level: "required", purpose: "keeps audit premise verification executable" },
  { rel: "scripts/render-audit-md.mjs", level: "optional", purpose: "renders audit markdown from JSON sidecar" },
  { rel: "scripts/lib/audit-sidecar.mjs", level: "optional", purpose: "finds and updates audit JSON sidecars" },
  { rel: "scripts/session-floor.mjs", level: "optional", purpose: "gates implement/closeout saturation honestly" },
  { rel: "scripts/render-state-vector.mjs", level: "required", purpose: "renders the canonical closeout state vector" },
  { rel: "scripts/compute-entropy.mjs", level: "required", purpose: "updates protocol entropy during closeout" },
  { rel: "scripts/append-genome-snapshot.mjs", level: "required", purpose: "appends the closeout genome snapshot" },
  { rel: "scripts/sanitize-claude-settings.mjs", level: "required", purpose: "sanitizes local agent settings before push" },
  { rel: "scripts/lib/studio-ops-proxy.mjs", level: "required", purpose: "binds authoritative control-plane scripts to this project" },
  { rel: "scripts/record-skill-cost.mjs", level: "optional", purpose: "records closeout skill-cost snapshots" },
  { rel: "scripts/check-windows-hide.mjs", level: "required", purpose: "prevents visible Windows child-process storms" },
  { rel: "scripts/lib/safe-spawn.mjs", level: "required", purpose: "forces windowsHide:true on child-process calls" },
  { rel: "scripts/lib/windows-hide-shim.cjs", level: "optional", purpose: "runtime safety shim for child-process hiding" },
  { rel: "scripts/codemod-safe-spawn.mjs", level: "optional", purpose: "rewires direct child_process imports to safe-spawn" },
  { rel: "docs/INNOVATION_PACK.md", level: "optional", purpose: "records second-order saturation candidates from ops innovation-pack" },
];

function exists(rel) {
  return fs.existsSync(path.join(ROOT, rel));
}

const protocolAnchors = [
  { rel: "docs/SESSION_PROTOCOL.md#§1", contains: "## §1 — `/start` protocol", purpose: "keeps /start canonical steps locally reachable" },
  { rel: "docs/SESSION_PROTOCOL.md#§2B", contains: "## §2B — `/audit` protocol", purpose: "keeps /audit canonical steps locally reachable" },
  { rel: "docs/SESSION_PROTOCOL.md#§2C", contains: "## §2C — `/implement` protocol", purpose: "keeps /implement canonical steps locally reachable" },
  { rel: "docs/SESSION_PROTOCOL.md#§3", contains: "## §3 — /closeout protocol", purpose: "keeps /closeout canonical steps locally reachable" },
];

const checks = helpers.map((helper) => {
  const ok = exists(helper.rel);
  return {
    ...helper,
    ok,
    status: ok ? "present" : helper.level === "required" ? "missing-required" : "missing-warning",
  };
});
const protocolText = fs.existsSync(path.join(ROOT, "docs", "SESSION_PROTOCOL.md"))
  ? fs.readFileSync(path.join(ROOT, "docs", "SESSION_PROTOCOL.md"), "utf8")
  : "";
for (const anchor of protocolAnchors) {
  const ok = protocolText.includes(anchor.contains);
  checks.push({ ...anchor, level: "required", ok, status: ok ? "present" : "missing-required" });
}

const behaviorProbes = [
  {
    rel: "behavior:ops-router-suggest",
    purpose: "canonical /start router path returns structured suggestions",
    run: () => spawnSync(process.execPath, ["scripts/ops.mjs", "router", "suggest", "--top", "1", "--json"], { cwd: ROOT, encoding: "utf8" }),
    validate: (result) => JSON.parse(result.stdout)?.status === "ok",
  },
  {
    rel: "behavior:secrets-audit-map",
    purpose: "local secrets audit resolves a real capability map with provenance",
    run: () => spawnSync(process.execPath, ["scripts/check-secrets.mjs", "--audit", "--json"], { cwd: ROOT, encoding: "utf8" }),
    validate: (result) => {
      const rows = JSON.parse(result.stdout);
      return Array.isArray(rows) && rows.length > 0 && rows.every((row) => typeof row.mapSource === "string" && row.mapSource !== "none");
    },
  },
];

for (const probe of behaviorProbes) {
  let ok = false;
  let detail = "probe did not run";
  try {
    const execution = probe.run();
    ok = execution.status === 0 && probe.validate(execution);
    detail = ok ? "behavior verified" : "exit=" + (execution.status ?? "null");
  } catch (error) {
    detail = error.message;
  }
  checks.push({ rel: probe.rel, purpose: probe.purpose, level: "required", ok, status: ok ? "verified" : "behavior-failed", detail });
}

const missingRequired = checks.filter((check) => check.level === "required" && !check.ok);
const missingOptional = checks.filter((check) => check.level === "optional" && !check.ok);
const status = missingRequired.length ? "blocked" : missingOptional.length ? "warning" : "ok";

const result = {
  schemaVersion: "1.0",
  status,
  summary: {
    total: checks.length,
    present: checks.filter((check) => check.ok).length,
    missingRequired: missingRequired.length,
    missingOptional: missingOptional.length,
  },
  checks,
  nextSteps: missingOptional.map((check) => ({
    helper: check.rel,
    action: "Keep as warning-level drift unless the local protocol starts invoking this helper as required.",
  })),
};

if (JSON_MODE) {
  console.log(JSON.stringify(result, null, 2));
} else {
  console.log("Protocol Drift Check");
  console.log("====================");
  console.log(`Status: ${status}`);
  for (const check of checks) {
    const icon = check.ok ? "OK" : check.level === "required" ? "MISS" : "WARN";
    console.log(`- ${icon} ${check.rel} - ${check.purpose}`);
  }
  if (missingOptional.length) {
    console.log("");
    console.log("Warning-level drift:");
    for (const check of missingOptional) console.log(`- ${check.rel}`);
  }
}

process.exit(missingRequired.length ? 1 : 0);
