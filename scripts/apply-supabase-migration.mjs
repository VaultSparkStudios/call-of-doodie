#!/usr/bin/env node
/** Apply one reviewed repo migration through the official Supabase Management API. */

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { getSecret, redact } from "./lib/secrets.mjs";

const args = process.argv.slice(2);
const apply = args.includes("--apply");
const fileIndex = args.indexOf("--file");
const relativeFile = fileIndex >= 0 ? args[fileIndex + 1] : null;
if (!relativeFile) {
  console.error("Usage: node scripts/apply-supabase-migration.mjs --file supabase/migrations/<file>.sql [--apply]");
  process.exit(2);
}

const root = process.cwd();
const migrationsRoot = path.resolve(root, "supabase", "migrations");
const file = path.resolve(root, relativeFile);
if (!file.startsWith(`${migrationsRoot}${path.sep}`) || !file.endsWith(".sql") || !fs.existsSync(file)) {
  console.error("Migration must be an existing .sql file inside supabase/migrations.");
  process.exit(2);
}

const query = fs.readFileSync(file, "utf8");
const sha256 = crypto.createHash("sha256").update(query).digest("hex");
if (!apply) {
  console.log(JSON.stringify({ apply: false, file: path.relative(root, file).replaceAll("\\", "/"), bytes: Buffer.byteLength(query), sha256 }, null, 2));
  process.exit(0);
}

const accessToken = getSecret("SUPABASE_ACCESS_TOKEN", "supabase.management");
const supabaseUrl = getSecret("SUPABASE_URL", "supabase.admin");
if (!accessToken || !supabaseUrl) {
  console.error("Supabase management/admin capability is unavailable through the secrets gateway.");
  process.exit(1);
}

// S163: the gateway SUPABASE_URL is the studio project; the game's production
// project is passed explicitly so a migration can never land on the wrong one.
const refIndex = args.indexOf("--project-ref");
const overrideRef = refIndex >= 0 ? String(args[refIndex + 1] || "") : "";
if (overrideRef && !/^[a-z]{20}$/.test(overrideRef)) { console.error("--project-ref must be a 20-letter Supabase project ref."); process.exit(2); }
const projectRef = overrideRef || new URL(supabaseUrl).hostname.split(".")[0];
console.error(`Target project ref: ${projectRef}`);
const response = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
  method: "POST",
  headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
  body: JSON.stringify({ query, read_only: false }),
});
const responseText = await response.text();
if (!response.ok) {
  console.error(redact(`Supabase migration failed (${response.status}): ${responseText}`));
  process.exit(1);
}

const receipt = {
  schemaVersion: "supabase-migration-v1",
  appliedAt: new Date().toISOString(),
  file: path.relative(root, file).replaceAll("\\", "/"),
  sha256,
  projectRefHash: crypto.createHash("sha256").update(projectRef).digest("hex").slice(0, 16),
  status: "applied",
};
fs.mkdirSync(path.join(root, ".cache"), { recursive: true });
fs.writeFileSync(path.join(root, ".cache", "supabase-migration-receipt.json"), `${JSON.stringify(receipt, null, 2)}\n`);
console.log(JSON.stringify(receipt, null, 2));
