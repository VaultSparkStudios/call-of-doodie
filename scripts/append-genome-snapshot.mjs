#!/usr/bin/env node

// Usage: node scripts/append-genome-snapshot.mjs [control-plane arguments]
// Proxies the canonical append-only genome writer during closeout.
import { runStudioScript } from "./lib/studio-ops-proxy.mjs";
if (process.argv.includes("--help")) {
  console.log("Usage: node scripts/append-genome-snapshot.mjs [control-plane arguments]");
  process.exit(0);
}
process.exit(runStudioScript({ script: "append-genome-snapshot.mjs", args: process.argv.slice(2) }));
