#!/usr/bin/env node
// Usage: node scripts/sanitize-claude-settings.mjs [control-plane arguments]
// Proxies canonical local-settings sanitization without exposing configuration.
import { runStudioScript } from "./lib/studio-ops-proxy.mjs";
if (process.argv.includes("--help")) {
  console.log("Usage: node scripts/sanitize-claude-settings.mjs [control-plane arguments]");
  process.exit(0);
}
process.exit(runStudioScript({ script: "sanitize-claude-settings.mjs", args: process.argv.slice(2), projectBound: false, settingsBound: true }));
