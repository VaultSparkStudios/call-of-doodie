#!/usr/bin/env node
// Usage: node scripts/render-state-vector.mjs [control-plane arguments]
// Proxies canonical closeout state-vector rendering for this project.
import { runStudioScript } from "./lib/studio-ops-proxy.mjs";
if (process.argv.includes("--help")) {
  console.log("Usage: node scripts/render-state-vector.mjs [control-plane arguments]");
  process.exit(0);
}
process.exit(runStudioScript({ script: "render-state-vector.mjs", args: process.argv.slice(2) }));
