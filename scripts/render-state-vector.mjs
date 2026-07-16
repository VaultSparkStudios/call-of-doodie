#!/usr/bin/env node
import { runStudioScript } from "./lib/studio-ops-proxy.mjs";
process.exit(runStudioScript({ script: "render-state-vector.mjs", args: process.argv.slice(2) }));
