#!/usr/bin/env node

import { runStudioScript } from "./lib/studio-ops-proxy.mjs";

process.exit(runStudioScript({
  script: "studio-oracle.mjs",
  args: process.argv.slice(2),
  projectBound: false,
}));
