import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const assetsDir = path.join(ROOT, "public", "launch-assets");
const JSON_MODE = process.argv.includes("--json");

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

const ownerOnlyGates = [
  {
    id: "mobile-pwa-install-pass",
    label: "Run one real mobile/browser PWA install pass",
    ownerOnly: true,
    evidence: "Screenshot or note in docs/LAUNCH_EXECUTION.md with device, browser, install prompt result, launch result, and date.",
    nextCommand: "npm run launch:surfaces",
    closesWhen: "A real phone installs or opens the Progressive Web App (PWA), starts a run, dies, and returns to menu cleanly.",
  },
  {
    id: "gamepad-browser-pass",
    label: "Run one real gamepad/browser pass",
    ownerOnly: true,
    evidence: "Note in docs/LAUNCH_EXECUTION.md with controller model, browser, movement, aiming, dash, shoot, menu navigation, and date.",
    nextCommand: "npm run launch:smoke",
    closesWhen: "A physical controller can start, play, pause, die, submit or skip score, and restart without keyboard rescue.",
  },
  {
    id: "itchio-publication",
    label: "Publish the Itch.io listing",
    ownerOnly: true,
    evidence: "Public Itch.io listing URL recorded in docs/LAUNCH_EXECUTION.md.",
    nextCommand: "npm run launch:readiness -- --json",
    closesWhen: "The listing is live with the canonical https://callofdoodie.wtf/ play link and launch media attached.",
  },
  {
    id: "homev2-funnel-observation",
    label: "Observe 48h of HomeV2 funnel data once analytics is configured",
    ownerOnly: true,
    optional: true,
    evidence: "Post-launch analytics note with 48h event sample size, deploy-start rate, death-screen rate, and any obvious drop-off.",
    nextCommand: "npm run audit:env:site",
    closesWhen: "Analytics credentials are configured and at least 48h of production funnel data has been reviewed.",
  },
];

const requiredReady = checks.filter((check) => check.label === "Launch PNG assets").every((check) => check.ok);
const optionalReady = checks.filter((check) => check.label !== "Launch PNG assets").every((check) => check.ok);
const status = requiredReady
  ? optionalReady
    ? "ready_with_owner_gates"
    : "ready_missing_optional_analytics"
  : "blocked_missing_assets";

if (JSON_MODE) {
  console.log(JSON.stringify({
    status,
    checks,
    ownerOnlyGates,
    evidenceReceipts: ownerOnlyGates.map((gate) => ({
      id: gate.id,
      evidence: gate.evidence,
      nextCommand: gate.nextCommand,
      closesWhen: gate.closesWhen,
      optional: Boolean(gate.optional),
    })),
    summary: {
      readyChecks: checks.filter((check) => check.ok).length,
      totalChecks: checks.length,
      requiredReady,
      optionalReady,
      ownerGateCount: ownerOnlyGates.length,
      requiredOwnerGateCount: ownerOnlyGates.filter((gate) => !gate.optional).length,
    },
  }, null, 2));
} else {
  console.log("Launch Readiness");
  console.log("===============");
  for (const check of checks) {
    console.log(`- ${check.ok ? "✓" : "⚠"} ${check.label} — ${check.detail}`);
  }

  console.log("");
  console.log("Owner-only finish line:");
  for (const gate of ownerOnlyGates) {
    console.log(`- ${gate.optional ? "◇" : "□"} ${gate.label}`);
    console.log(`  Evidence: ${gate.evidence}`);
    console.log(`  Next: ${gate.nextCommand}`);
    console.log(`  Closes when: ${gate.closesWhen}`);
  }
  console.log("");
  console.log("Note: PostHog/Sentry analytics remain post-launch optional; missing keys do not block asset/device/publication readiness.");
}
