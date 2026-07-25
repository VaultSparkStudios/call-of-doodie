#!/usr/bin/env node

// Usage: node scripts/generate-public-gameplay-contract.mjs [--check]
// Writes the canonical public gameplay contract; --check verifies without writing.

import fs from "node:fs";
import path from "node:path";
import { buildPublicGameplayContract } from "./lib/public-gameplay-contract.mjs";

const target = path.join(process.cwd(), "public", "gameplay-contract.json");
if (process.argv.includes("--help")) {
  console.log("Usage: node scripts/generate-public-gameplay-contract.mjs [--check]");
  process.exit(0);
}
const rendered = `${JSON.stringify(buildPublicGameplayContract(), null, 2)}\n`;
if (process.argv.includes("--check")) {
  const current = fs.existsSync(target) ? fs.readFileSync(target, "utf8") : "";
  if (current !== rendered) {
    console.error(`Public gameplay contract is stale: ${path.relative(process.cwd(), target)}`);
    process.exit(1);
  }
  console.log(`Public gameplay contract is current: ${path.relative(process.cwd(), target)}`);
  process.exit(0);
}
fs.mkdirSync(path.dirname(target), { recursive: true });
fs.writeFileSync(target, rendered);
console.log(`Generated ${path.relative(process.cwd(), target)}`);
