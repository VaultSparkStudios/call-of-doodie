import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const assetsDir = path.join(ROOT, "public", "launch-assets");

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  for (const line of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (match && !(match[1] in process.env)) process.env[match[1]] = match[2];
  }
}

loadEnvFile(path.join(ROOT, ".env.local"));
loadEnvFile(path.join(ROOT, "secrets", "google.env"));

const svgAssets = fs.existsSync(assetsDir)
  ? fs.readdirSync(assetsDir).filter((name) => name.endsWith(".svg")).sort()
  : [];
const pngAssets = fs.existsSync(assetsDir)
  ? fs.readdirSync(assetsDir).filter((name) => name.endsWith(".png")).sort()
  : [];

const checks = [
  {
    label: "Launch PNG assets",
    ok: pngAssets.length >= svgAssets.length && svgAssets.length > 0,
    detail: `${pngAssets.length}/${svgAssets.length} PNG exports present`,
  },
  {
    label: "PostHog key",
    ok: Boolean(process.env.VITE_POSTHOG_KEY),
    detail: process.env.VITE_POSTHOG_KEY ? "configured" : "missing",
  },
  {
    label: "Sentry DSN",
    ok: Boolean(process.env.VITE_SENTRY_DSN),
    detail: process.env.VITE_SENTRY_DSN ? "configured" : "missing",
  },
];

console.log("Launch Readiness");
console.log("===============");
for (const check of checks) {
  console.log(`- ${check.ok ? "✓" : "⚠"} ${check.label} — ${check.detail}`);
}

console.log("");
console.log("Owner-only finish line:");
console.log("- Run one real mobile/browser PWA install pass");
console.log("- Run one real gamepad/browser pass");
console.log("- Publish the Itch.io listing");
console.log("- Observe 48h of HomeV2 funnel data once analytics is configured");
