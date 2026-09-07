#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { analyzeAppArchitecture } from "./lib/app-architecture.mjs";

const root = resolve(import.meta.dirname, "..");
const source = readFileSync(resolve(root, "src/App.jsx"), "utf8");
const budget = JSON.parse(readFileSync(resolve(root, "scripts/contracts/app-architecture-budget.json"), "utf8"));
// S163 moved twenty loop-only systems behind the lazy combat-runtime chunk, so
// App reaches them through `combatRuntimeRef` rather than importing them. Those
// boundaries still exist and still count (S165).
const facadeSources = ["src/systems/combatRuntime.js", "src/systems/modeDefinition.js"]
  .map((relative) => {
    try { return readFileSync(resolve(root, relative), "utf8"); } catch { return ""; }
  })
  .filter(Boolean);
const result = analyzeAppArchitecture(source, budget, { facadeSources });
console.log(JSON.stringify(result, null, 2));
process.exit(result.ok ? 0 : 1);
