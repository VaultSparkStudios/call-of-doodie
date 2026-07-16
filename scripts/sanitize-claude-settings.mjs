#!/usr/bin/env node
import { runStudioScript } from "./lib/studio-ops-proxy.mjs";
process.exit(runStudioScript({ script: "sanitize-claude-settings.mjs", args: process.argv.slice(2), projectBound: false, settingsBound: true }));
