#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const OPS_SECRETS = path.resolve(ROOT, "..", "vaultspark-studio-ops", "secrets");
const API = "https://api.cloudflare.com/client/v4";
const PROJECT_NAME = "call-of-doodie";
const ACCOUNT_ID_FALLBACK = "2d737158a4dde61a7a476a9fda51af2f";
const CANONICAL_DOMAIN = "callofdoodie.wtf";
const BACKUP_DOMAIN = "playcallofdoodie.com";
const CUSTOM_DOMAINS = [
  CANONICAL_DOMAIN,
  `www.${CANONICAL_DOMAIN}`,
  BACKUP_DOMAIN,
  `www.${BACKUP_DOMAIN}`,
];

const apply = process.argv.includes("--apply");

function loadDotEnv(filePath) {
  if (!fs.existsSync(filePath)) return;
  const contents = fs.readFileSync(filePath, "utf8");
  for (const rawLine of contents.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eqIndex = line.indexOf("=");
    if (eqIndex === -1) continue;
    const key = line.slice(0, eqIndex).trim();
    const value = line.slice(eqIndex + 1).trim().replace(/^['"]|['"]$/g, "");
    if (!process.env[key]) process.env[key] = value;
  }
}

function loadCloudflareStudioAccess(filePath) {
  if (!fs.existsSync(filePath) || process.env.CLOUDFLARE_RULESETS_TOKEN) return;
  const token = fs
    .readFileSync(filePath, "utf8")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find((line) => /^[A-Za-z0-9_-]{40,}$/.test(line));
  if (token) process.env.CLOUDFLARE_RULESETS_TOKEN = token;
}

loadDotEnv(path.join(ROOT, ".env.local"));
loadDotEnv(path.join(OPS_SECRETS, "cloudflare.env"));
loadCloudflareStudioAccess(path.join(OPS_SECRETS, "cloudflare-studio-access.txt"));

const token = process.env.CLOUDFLARE_RULESETS_TOKEN
  || process.env.CLOUDFLARE_ZONE_CREATE_TOKEN
  || process.env.CLOUDFLARE_DNS_EDIT_TOKEN
  || process.env.CLOUDFLARE_API_TOKEN
  || process.env.CLOUDFLARE_DNS_TOKEN;
const accountId = process.env.CLOUDFLARE_ACCOUNT_ID || ACCOUNT_ID_FALLBACK;

function requireConfig() {
  const missing = [];
  if (!token) missing.push("CLOUDFLARE_API_TOKEN");
  if (!accountId) missing.push("CLOUDFLARE_ACCOUNT_ID");
  if (missing.length) throw new Error(`Missing ${missing.join(", ")}.`);
}

async function cf(pathname, { method = "GET", body, ok = [200] } = {}) {
  const response = await fetch(`${API}${pathname}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await response.json().catch(() => ({}));
  if (!ok.includes(response.status) || json.success === false) {
    const detail = json.errors?.map((e) => `${e.code}: ${e.message}`).join("; ") || response.statusText;
    throw new Error(`${method} ${pathname} failed: ${detail}`);
  }
  return json.result ?? json;
}

async function getZoneId(name) {
  const result = await cf(`/zones?name=${encodeURIComponent(name)}&account.id=${accountId}`);
  const zone = Array.isArray(result) ? result[0] : result.result?.[0];
  if (!zone?.id) throw new Error(`Cloudflare zone not found for ${name}. Add it in the dashboard and update Namecheap nameservers first.`);
  return zone.id;
}

async function ensurePagesProject() {
  try {
    await cf(`/accounts/${accountId}/pages/projects/${PROJECT_NAME}`);
    console.log(`OK Pages project exists: ${PROJECT_NAME}`);
    return;
  } catch (error) {
    if (!String(error.message).includes("8000007") && !String(error.message).includes("not found")) throw error;
  }

  console.log(`CREATE Pages project: ${PROJECT_NAME}`);
  if (!apply) return;
  await cf(`/accounts/${accountId}/pages/projects`, {
    method: "POST",
    ok: [200, 201],
    body: {
      name: PROJECT_NAME,
      production_branch: "main",
      build_config: {
        build_command: "npm run build",
        destination_dir: "dist",
      },
    },
  });
}

async function ensurePagesDomain(domain) {
  try {
    await cf(`/accounts/${accountId}/pages/projects/${PROJECT_NAME}/domains/${domain}`);
    console.log(`OK Pages custom domain exists: ${domain}`);
    return;
  } catch (error) {
    if (!String(error.message).includes("8000007") && !String(error.message).includes("not found")) throw error;
  }

  console.log(`ADD Pages custom domain: ${domain}`);
  if (!apply) return;
  await cf(`/accounts/${accountId}/pages/projects/${PROJECT_NAME}/domains`, {
    method: "POST",
    ok: [200, 201],
    body: { name: domain },
  });
}

async function getRedirectRuleset(zoneId) {
  const rulesets = await cf(`/zones/${zoneId}/rulesets`);
  return rulesets.find((ruleset) => ruleset.phase === "http_request_dynamic_redirect");
}

async function ensureRedirectRule(zoneId, rule) {
  const ruleset = await getRedirectRuleset(zoneId);
  if (!ruleset) {
    console.log(`CREATE redirect ruleset with rule: ${rule.ref}`);
    if (!apply) return;
    await cf(`/zones/${zoneId}/rulesets`, {
      method: "POST",
      ok: [200, 201],
      body: {
        name: "Call of Doodie canonical redirects",
        kind: "zone",
        phase: "http_request_dynamic_redirect",
        rules: [rule],
      },
    });
    return;
  }

  const fullRuleset = await cf(`/zones/${zoneId}/rulesets/${ruleset.id}`);
  const existing = fullRuleset.rules?.find((candidate) => candidate.ref === rule.ref);
  if (existing) {
    console.log(`OK redirect rule exists: ${rule.ref}`);
    return;
  }

  console.log(`ADD redirect rule: ${rule.ref}`);
  if (!apply) return;
  await cf(`/zones/${zoneId}/rulesets/${ruleset.id}/rules`, {
    method: "POST",
    ok: [200, 201],
    body: rule,
  });
}

function redirectRule({ ref, expression, description }) {
  return {
    ref,
    expression,
    description,
    action: "redirect",
    action_parameters: {
      from_value: {
        target_url: {
          expression: `concat("https://${CANONICAL_DOMAIN}", http.request.uri.path)`,
        },
        status_code: 301,
        preserve_query_string: true,
      },
    },
  };
}

async function main() {
  requireConfig();
  console.log(apply ? "Cloudflare cutover apply mode" : "Cloudflare cutover dry run");

  const canonicalZoneId = await getZoneId(CANONICAL_DOMAIN);
  const backupZoneId = await getZoneId(BACKUP_DOMAIN);

  await ensurePagesProject();
  for (const domain of CUSTOM_DOMAINS) await ensurePagesDomain(domain);

  await ensureRedirectRule(canonicalZoneId, redirectRule({
    ref: "www_callofdoodie_wtf_to_apex",
    expression: `http.host eq "www.${CANONICAL_DOMAIN}"`,
    description: `Redirect www.${CANONICAL_DOMAIN} to ${CANONICAL_DOMAIN}`,
  }));

  await ensureRedirectRule(backupZoneId, redirectRule({
    ref: "playcallofdoodie_to_callofdoodie_wtf",
    expression: `http.host in {"${BACKUP_DOMAIN}" "www.${BACKUP_DOMAIN}"}`,
    description: `Redirect ${BACKUP_DOMAIN} and www.${BACKUP_DOMAIN} to ${CANONICAL_DOMAIN}`,
  }));

  console.log(apply ? "Cloudflare cutover applied." : "Dry run complete. Re-run with --apply after DNS zones are active.");
}

main().catch((error) => {
  console.error(`Cloudflare cutover failed: ${error.message}`);
  process.exitCode = 1;
});
