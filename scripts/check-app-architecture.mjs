#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { analyzeAppArchitecture } from "./lib/app-architecture.mjs";

const root = resolve(import.meta.dirname, "..");
const source = readFileSync(resolve(root, "src/App.jsx"), "utf8");
const budget = JSON.parse(readFileSync(resolve(root, "scripts/contracts/app-architecture-budget.json"), "utf8"));
const result = analyzeAppArchitecture(source, budget);
console.log(JSON.stringify(result, null, 2));
process.exit(result.ok ? 0 : 1);
