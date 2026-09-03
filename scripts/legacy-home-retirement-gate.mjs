#!/usr/bin/env node
// Legacy home retirement gate — S163 final form.
//
// Until S163 this gate asserted that the MenuScreen (v1) and HomeV3 (v3)
// alternates stayed lazy-loaded behind a ?home= switch pending evidence. The
// founder's single-brand decision (DECISIONS 2026-09-03) retired both. The gate
// now proves the retirement is complete and cannot silently regress.
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const JSON_MODE = process.argv.includes("--json");
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), "utf8");
const exists = (rel) => fs.existsSync(path.join(ROOT, rel));

const app = read("src/App.jsx");
const home = read("src/components/HomeV2.jsx");
const decisions = read("context/DECISIONS.md");

const checks = [
  { id: "alternates-deleted", ok: !exists("src/components/HomeV3.jsx") && !exists("src/components/MenuScreen.jsx") && !exists("src/utils/homeVersion.js"), detail: "HomeV3, MenuScreen, and the homeVersion switch are deleted" },
  { id: "no-home-query-switch", ok: !/home=v[13]|resolveHomeVersion/.test(app), detail: "App.jsx no longer selects a front door from ?home=" },
  { id: "homev2-single-front-door", ok: app.includes("const Home = HomeV2;") && app.includes('lazy(() => import("./components/HomeV2.jsx"))'), detail: "HomeV2 is the only, lazy-loaded front door" },
  { id: "homev2-shared-footer", ok: home.includes("<SiteFooter"), detail: "HomeV2 renders the shared SiteFooter" },
  { id: "decision-recorded", ok: decisions.includes("Arcade CRT is the single brand"), detail: "the single-brand decision is recorded in DECISIONS.md" },
];
const ok = checks.every((c) => c.ok);
if (JSON_MODE) console.log(JSON.stringify({ status: ok ? "ok" : "fail", checks }, null, 2));
else {
  console.log("Legacy Home Retirement Gate (S163 — retired)");
  for (const c of checks) console.log(`- ${c.ok ? "OK" : "FAIL"} ${c.id} — ${c.detail}`);
}
process.exit(ok ? 0 : 1);
