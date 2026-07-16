#!/usr/bin/env node
import { runStudioScript } from "./lib/studio-ops-proxy.mjs";
process.exit(runStudioScript({ script: "compute-entropy.mjs", args: process.argv.slice(2) }));
