#!/usr/bin/env node
// Usage: node scripts/validate-coverage-contract.mjs [--summary <path>] [--json]
import path from "node:path";
import { coreLogicCoverageContract, inspectCoverageEvidenceFreshness, readCoverageSummary, validateCoverageSummary } from "./lib/coverage-contract.mjs";

const args = process.argv.slice(2);
if (args.includes("--help") || args.includes("-h")) {
  console.log("Usage: node scripts/validate-coverage-contract.mjs [--summary <path>] [--json]");
  console.log("Validates the explicit core-logic scope, exact source coverage, and metric ratchets without claiming UI/canvas coverage.");
  process.exit(0);
}

const summaryIndex = args.indexOf("--summary");
const summaryPath = summaryIndex >= 0 && args[summaryIndex + 1]
  ? path.resolve(args[summaryIndex + 1])
  : path.resolve("coverage/coverage-summary.json");

let receipt;
try {
  receipt = validateCoverageSummary(readCoverageSummary(summaryPath), {
    evidenceFreshness: inspectCoverageEvidenceFreshness(summaryPath),
  });
} catch (error) {
  receipt = {
    schemaVersion: coreLogicCoverageContract.schemaVersion,
    label: coreLogicCoverageContract.label,
    ok: false,
    error: error instanceof Error ? error.message : String(error),
    summaryPath,
  };
}

if (args.includes("--json")) {
  console.log(JSON.stringify(receipt, null, 2));
} else if (receipt.ok) {
  console.log(`${receipt.label}: PASS · ${receipt.measuredFiles}/${receipt.expectedFiles} source files · ${Object.entries(receipt.metrics).map(([key, value]) => `${key} ${value}%`).join(" · ")}`);
  console.log(`Explicit exclusions: ${receipt.exclusions.map((entry) => entry.surface).join(" · ")}`);
} else {
  console.error(`${receipt.label}: FAIL`);
  if (receipt.error) console.error(receipt.error);
  for (const check of receipt.checks || []) {
    if (!check.ok) console.error(`- ${check.id}: actual ${check.actual}; expected ${check.expected}${check.missingFiles?.length ? `; missing ${check.missingFiles.join(", ")}` : ""}${check.staleInputs?.length ? `; stale after ${check.staleInputs.join(", ")}` : ""}`);
  }
}

process.exitCode = receipt.ok ? 0 : 1;
