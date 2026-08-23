#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const mainSource = fs.readFileSync(path.join(root, "src", "main.jsx"), "utf8");
const boundarySource = fs.readFileSync(path.join(root, "src", "RuntimeBoundary.jsx"), "utf8");
const htmlPath = path.join(root, "dist", "index.html");
const issues = [];
if (/from\s+["']\.\/App\.jsx["']/.test(mainSource)) issues.push("main.jsx statically imports App.jsx");
if (!/import\(["']\.\/App\.jsx["']\)/.test(boundarySource)) issues.push("RuntimeBoundary does not lazy-import App.jsx");
if (!/DEFER_RUNTIME_MS\s*=\s*900/.test(boundarySource)) issues.push("runtime activation does not match the validated 900ms first-frame budget");
if (!fs.existsSync(htmlPath)) issues.push("dist/index.html missing; run npm run build");

let entryBytes = null;
let runtimeBytes = null;
let operationAuthorityBytes = null;
if (fs.existsSync(htmlPath)) {
  const html = fs.readFileSync(htmlPath, "utf8");
  const entryHref = html.match(/<script[^>]+type="module"[^>]+src="([^"]+)"/)?.[1];
  if (!entryHref) issues.push("built entry script missing");
  else {
    const entryFile = path.join(root, "dist", entryHref.replace(/^\//, ""));
    entryBytes = fs.statSync(entryFile).size;
    if (entryBytes > 220_000) issues.push(`entry bundle ${entryBytes} exceeds 220000 bytes`);
  }
  const assets = fs.readdirSync(path.join(root, "dist", "assets")).filter((name) => name.endsWith(".js"));
  const runtime = assets.find((name) => /^App-.*\.js$/.test(name));
  if (!runtime) issues.push("lazy App runtime chunk missing");
  else {
    runtimeBytes = fs.statSync(path.join(root, "dist", "assets", runtime)).size;
    if (runtimeBytes > 560_000) issues.push(`runtime bundle ${runtimeBytes} exceeds 560000 bytes`);
  }
  const operationAuthority = assets.find((name) => /^operation-authority-.*\.js$/.test(name));
  if (!operationAuthority) issues.push("bounded Operation authority chunk missing");
  else {
    operationAuthorityBytes = fs.statSync(path.join(root, "dist", "assets", operationAuthority)).size;
    if (operationAuthorityBytes > 16_000) issues.push(`Operation authority bundle ${operationAuthorityBytes} exceeds 16000 bytes`);
  }
}

const receipt = {
  schemaVersion: "runtime-boundary-v2",
  ok: issues.length === 0,
  entryBytes,
  runtimeBytes,
  operationAuthorityBytes,
  issues,
};
console.log(JSON.stringify(receipt, null, 2));
process.exit(receipt.ok ? 0 : 1);
