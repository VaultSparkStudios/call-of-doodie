#!/usr/bin/env node
// Configures the /api/profile cloud-backup secret on the Pages project without
// printing values (S163). SUPABASE_SERVICE_ROLE_KEY comes from the audited
// secrets gateway; OBELISK_VERIFY_SECRET already lives on the project for
// /api/obelisk-verify and is only checked for presence here.
//
// Usage: node scripts/configure-profile-pages-env.mjs [--apply]

import { cfAccountId, cfDeploy } from "../../vaultspark-studio-ops/scripts/lib/cf-deploy.mjs";
import { getSecret } from "./lib/secrets.mjs";

const apply = process.argv.includes("--apply");
const accountId = await cfAccountId();
const projectPath = `/accounts/${accountId}/pages/projects/call-of-doodie`;

const current = await cfDeploy("read-pages-project", projectPath, { method: "GET" });
const configs = (current?.body?.result || current?.result)?.deployment_configs || {};
const names = (env) => Object.keys(configs[env]?.env_vars || {}).sort();
console.log(JSON.stringify({ apply, production: names("production"), preview: names("preview") }, null, 2));

const required = ["SUPABASE_URL", "SUPABASE_ANON_KEY", "OBELISK_VERIFY_URL", "OBELISK_VERIFY_SECRET", "SUPABASE_SERVICE_ROLE_KEY"];
const missing = required.filter((name) => !names("production").includes(name));
console.log(JSON.stringify({ missingOnProduction: missing }));

if (!apply) process.exit(0);
// The gateway's supabase.admin is the studio project; the game runs on the
// production project. Read that project's service-role key through the
// Management API so the value never leaves this process.
const PRODUCTION_REF = "fjnpzjjyhnpmunfoycrp";
const accessToken = getSecret("SUPABASE_ACCESS_TOKEN", "supabase.management");
const keysRes = await fetch(`https://api.supabase.com/v1/projects/${PRODUCTION_REF}/api-keys?reveal=true`, { headers: { Authorization: `Bearer ${accessToken}` } });
if (!keysRes.ok) { console.error(`api-keys lookup failed (${keysRes.status})`); process.exit(1); }
const keys = await keysRes.json();
const serviceRole = (Array.isArray(keys) ? keys : []).find((k) => k.name === "service_role")?.api_key;
if (!serviceRole) { console.error("service_role key not found on the production project"); process.exit(1); }
const envVars = { SUPABASE_SERVICE_ROLE_KEY: { type: "secret_text", value: serviceRole } };
const result = await cfDeploy("configure-profile-pages-env", projectPath, {
  method: "PATCH",
  body: JSON.stringify({ deployment_configs: { production: { env_vars: envVars }, preview: { env_vars: envVars } } }),
});
const after = (result?.body?.result || result?.result)?.deployment_configs || {};
console.log(JSON.stringify({ ok: Boolean(result?.ok ?? result?.body?.success), production: Object.keys(after.production?.env_vars || {}).sort() }, null, 2));
