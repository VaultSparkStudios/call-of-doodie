#!/usr/bin/env node

import fs from "fs";

const target = process.argv[2];
if (!target) {
  console.error("Usage: node scripts/validate-brief-format.mjs <brief-path>");
  process.exit(1);
}

const text = fs.readFileSync(target, "utf8");
const required = ["STARTUP BRIEF", "SCORE", "WHERE WE LEFT OFF", "SIGNALS", "NOW BUCKET"];
const missing = required.filter(token => !text.includes(token));
if (missing.length > 0) {
  console.error(`Brief format invalid. Missing: ${missing.join(", ")}`);
  process.exit(1);
}

console.log("Brief format valid.");
