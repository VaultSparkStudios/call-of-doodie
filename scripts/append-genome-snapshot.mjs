#!/usr/bin/env node
import { runStudioScript } from "./lib/studio-ops-proxy.mjs";
process.exit(runStudioScript({ script: "append-genome-snapshot.mjs", args: process.argv.slice(2) }));
