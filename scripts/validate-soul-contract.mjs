#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { validateSoulContract } from "./lib/soul-contract.mjs";

const target = resolve(process.cwd(), process.argv.find((arg) => arg.endsWith(".md")) || "context/SOUL.md");
let source = "";
try {
  source = readFileSync(target, "utf8");
} catch (error) {
  console.error(JSON.stringify({ ok: false, schemaVersion: "soul-contract-v1", error: error.message }));
  process.exit(1);
}
const result = validateSoulContract(source);
console.log(JSON.stringify({ ...result, file: target }, null, 2));
process.exit(result.ok ? 0 : 1);
