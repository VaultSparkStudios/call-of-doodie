#!/usr/bin/env node
// Usage: node scripts/compute-entropy.mjs [control-plane arguments]
// Proxies the canonical read/compute/write entropy closeout step.
import { runStudioScript } from "./lib/studio-ops-proxy.mjs";
if (process.argv.includes("--help")) {
  console.log("Usage: node scripts/compute-entropy.mjs [control-plane arguments]");
  process.exit(0);
}
process.exit(runStudioScript({ script: "compute-entropy.mjs", args: process.argv.slice(2) }));
