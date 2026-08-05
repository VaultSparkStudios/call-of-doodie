#!/usr/bin/env node
// Usage: node scripts/launch-readiness.mjs [--json] [--posthog=ready|missing|unknown] [--sentry=...] [--evidence=<gate-id>] [--founder-approved]
import fs from "node:fs";
import path from "node:path";
import { buildLaunchReadinessReceipt, renderLaunchReadiness } from "./lib/launch-readiness.mjs";

const root = process.cwd();
const args = process.argv.slice(2);
const assetsDir = path.join(root, "public", "launch-assets");
const svgCount = fs.existsSync(assetsDir)
  ? fs.readdirSync(assetsDir).filter((name) => name.endsWith(".svg")).length
  : 0;
const pngCount = fs.existsSync(assetsDir)
  ? fs.readdirSync(assetsDir).filter((name) => name.endsWith(".png")).length
  : 0;

function statusArg(name) {
  const value = args.find((arg) => arg.startsWith(`--${name}=`))?.split("=")[1];
  return ["ready", "missing", "unknown"].includes(value) ? value : "unknown";
}

const receipt = buildLaunchReadinessReceipt({
  assets: { pngCount, svgCount },
  providers: {
    posthog: statusArg("posthog"),
    sentry: statusArg("sentry"),
  },
  completedEvidence: args
    .filter((arg) => arg.startsWith("--evidence="))
    .map((arg) => arg.split("=")[1])
    .filter(Boolean),
  founderApproved: args.includes("--founder-approved"),
});

if (args.includes("--json")) console.log(JSON.stringify(receipt, null, 2));
else console.log(renderLaunchReadiness(receipt));
