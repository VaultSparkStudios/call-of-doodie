#!/usr/bin/env node

// Usage: node scripts/check-boot-storage-boundary.mjs [--json]
// Fails when boot-critical surfaces bypass the fail-open storage adapters.

import { scanBootStorageBoundary } from "./lib/boot-storage-boundary.mjs";

if (process.argv.includes("--help")) {
  console.log("Usage: node scripts/check-boot-storage-boundary.mjs [--json]");
  process.exit(0);
}

const receipt = scanBootStorageBoundary();
if (process.argv.includes("--json")) console.log(JSON.stringify(receipt, null, 2));
else if (receipt.ok) console.log(`boot-storage-boundary-v1 PASS · ${receipt.surfaces.length} surfaces · 0 direct accesses · ${receipt.sourceDigest.slice(0, 12)}`);
else {
  console.error(`boot-storage-boundary-v1 FAIL · ${receipt.directAccessCount} direct access(es)`);
  for (const item of receipt.violations) console.error(`- ${item.file}:${item.line} ${item.storage}`);
}
process.exit(receipt.ok ? 0 : 1);
