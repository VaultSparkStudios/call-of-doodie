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
  // S174 [audit #4]: "not measured yet" is not the same result as "measured and
  // failing", and printing FAIL + a raw ENOENT for a missing input teaches readers
  // to discount the gate. The input is produced by `npm run test:coverage`; when it
  // is simply absent, say so and name that command. Exit stays non-zero so the gate
  // is still safe to chain — an unmeasured contract is not a passing one.
  const notMeasured = error?.code === "ENOENT";
  receipt = {
    schemaVersion: coreLogicCoverageContract.schemaVersion,
    label: coreLogicCoverageContract.label,
    ok: false,
    notMeasured,
    error: notMeasured
      ? `no coverage summary at ${summaryPath} — coverage was never measured. Run \`npm run test:coverage\` (which generates it and then re-runs this contract), or pass --summary <path>.`
      : error instanceof Error ? error.message : String(error),
    summaryPath,
  };
}

if (args.includes("--json")) {
  console.log(JSON.stringify(receipt, null, 2));
} else if (receipt.ok) {
  console.log(`${receipt.label}: PASS · ${receipt.measuredFiles}/${receipt.expectedFiles} source files · ${Object.entries(receipt.metrics).map(([key, value]) => `${key} ${value}%`).join(" · ")}`);
  console.log(`Explicit exclusions: ${receipt.exclusions.map((entry) => entry.surface).join(" · ")}`);
} else {
  console.error(`${receipt.label}: ${receipt.notMeasured ? "NOT MEASURED" : "FAIL"}`);
  if (receipt.error) console.error(receipt.error);
  for (const check of receipt.checks || []) {
    if (!check.ok) console.error(`- ${check.id}: actual ${check.actual}; expected ${check.expected}${check.missingFiles?.length ? `; missing ${check.missingFiles.join(", ")}` : ""}${check.staleInputs?.length ? `; stale after ${check.staleInputs.join(", ")}` : ""}`);
  }
}

process.exitCode = receipt.ok ? 0 : 1;
