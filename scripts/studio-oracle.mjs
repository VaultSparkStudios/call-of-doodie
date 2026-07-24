#!/usr/bin/env node

import { bindProjectOracleArgs, runStudioScript } from "./lib/studio-ops-proxy.mjs";

process.exit(runStudioScript({
  script: "studio-oracle.mjs",
  args: bindProjectOracleArgs(process.argv.slice(2)),
  projectBound: false,
}));
