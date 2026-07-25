#!/usr/bin/env node

// Usage: node scripts/studio-oracle.mjs <surface> [--preverify] [--json]
// Project-binds Studio Oracle analysis; --help never invokes the control plane.

import { bindProjectOracleArgs, runStudioScript } from "./lib/studio-ops-proxy.mjs";

if (process.argv.includes("--help")) {
  console.log("Usage: node scripts/studio-oracle.mjs <surface> [--preverify] [--json]");
  process.exit(0);
}

process.exit(runStudioScript({
  script: "studio-oracle.mjs",
  args: bindProjectOracleArgs(process.argv.slice(2)),
  projectBound: false,
}));
