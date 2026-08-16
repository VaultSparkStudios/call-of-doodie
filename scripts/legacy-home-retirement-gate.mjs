#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { HOME_VERSION, resolveHomeVersion } from "../src/utils/homeVersion.js";

const ROOT = process.cwd();
const JSON_MODE = process.argv.includes("--json");

function read(relPath) {
  return fs.readFileSync(path.join(ROOT, relPath), "utf8");
}

function exists(relPath) {
  return fs.existsSync(path.join(ROOT, relPath));
}

const app = read("src/App.jsx");
const home = read("src/components/HomeV2.jsx");
const legacy = read("src/components/MenuScreen.jsx");
const panels = read("src/components/MenuPanels.jsx");
const launchTest = read("src/App.launch.test.jsx");
const decisions = read("context/DECISIONS.md");

const checks = [
  {
    id: "homev2-default",
    ok: resolveHomeVersion("") === HOME_VERSION.CURRENT
      && resolveHomeVersion("?home=v1") === HOME_VERSION.LEGACY
      && resolveHomeVersion("?home=v3") === HOME_VERSION.EXPERIMENTAL
      && resolveHomeVersion("?home=unknown") === HOME_VERSION.CURRENT,
    detail: "executable route contract proves HomeV2 default, ?home=v1 legacy, and ?home=v3 comparison",
  },
  {
    id: "legacy-lazy-loaded",
    ok: app.includes('lazy(() => import("./components/MenuScreen.jsx"))'),
    detail: "legacy MenuScreen remains lazy-loaded outside the default bundle",
  },
  {
    id: "homev2-launch-critical-tabs",
    // S155: tab labels renamed since this gate was written (CODEX → FIELD
    // MANUAL; SETTINGS is now the ⚙ affordance backed by showSettings state).
    ok: ["CAREER", "FIELD MANUAL", "showSettings", "SUPPORT"].every((label) => home.includes(label)),
    detail: "HomeV2 exposes launch-critical player panels",
  },
  {
    id: "shared-panel-source",
    ok: [
      "RulesPanel",
      "ControlsPanel",
      "MostWantedPanel",
      "RunHistoryPanel",
      "LoadoutBuilderPanel",
      "CareerStatsPanel",
      "MissionsPanel",
      "UpgradesPanel",
      "NewFeaturesPanel",
    ].every((name) => panels.includes(`export function ${name}`)),
    detail: "shared MenuPanels exports cover the restored deep systems",
  },
  {
    id: "legacy-still-contains-duplicate-surface",
    ok: legacy.includes("WHAT'S NEW") && legacy.includes("COMMAND CENTER"),
    detail: "legacy still duplicates HomeV2 systems, so removal needs evidence before deletion",
  },
  {
    id: "launch-smoke-covers-homev2",
    ok: launchTest.includes('vi.mock("./components/HomeV2.jsx"') && launchTest.includes("CallOfDoodie launch smoke"),
    detail: "launch smoke test covers the default menu path",
  },
  {
    id: "retirement-doc-present",
    ok: exists("docs/LEGACY_HOME_RETIREMENT.md"),
    detail: "retirement criteria are documented",
  },
  {
    id: "decision-gate-recorded",
    ok: decisions.includes("Legacy MenuScreen remains lazy fallback until data gate"),
    detail: "decision log requires a data gate before removing legacy home",
  },
];

const ok = checks.every((check) => check.ok);

if (JSON_MODE) {
  console.log(JSON.stringify({ status: ok ? "ok" : "fail", checks }, null, 2));
} else {
  console.log("Legacy Home Retirement Gate");
  console.log("===========================");
  for (const check of checks) {
    console.log(`- ${check.ok ? "OK" : "FAIL"} ${check.id} — ${check.detail}`);
  }
  console.log("");
  console.log(ok
    ? "Decision: keep legacy home as fallback-only until the documented retirement evidence is collected."
    : "Decision: legacy fallback cannot be retired yet; fix failed checks first.");
}

process.exit(ok ? 0 : 1);
