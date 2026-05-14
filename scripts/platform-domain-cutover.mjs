#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const OPS_SECRETS = path.resolve(ROOT, "..", "vaultspark-studio-ops", "secrets");
const CF_API = "https://api.cloudflare.com/client/v4";
const NAMECHEAP_API = "https://api.namecheap.com/xml.response";

const PROJECT_NAME = "call-of-doodie";
const ACCOUNT_ID_FALLBACK = "2d737158a4dde61a7a476a9fda51af2f";
const DOMAINS = ["callofdoodie.wtf", "playcallofdoodie.com"];
const CANONICAL_DOMAIN = "callofdoodie.wtf";
const BACKUP_DOMAIN = "playcallofdoodie.com";

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
  if (!fs.existsSync(filePath) || process.env.CLOUDFLARE_ZONE_CREATE_TOKEN) return;
  const token = fs
    .readFileSync(filePath, "utf8")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find((line) => /^[A-Za-z0-9_-]{40,}$/.test(line));
  if (token) process.env.CLOUDFLARE_ZONE_CREATE_TOKEN = token;
}

loadDotEnv(path.join(ROOT, ".env.local"));
loadDotEnv(path.join(OPS_SECRETS, "cloudflare.env"));
loadDotEnv(path.join(OPS_SECRETS, "namecheap.env"));
loadCloudflareStudioAccess(path.join(OPS_SECRETS, "cloudflare-studio-access.txt"));

const cloudflareToken = process.env.CLOUDFLARE_API_TOKEN || process.env.CLOUDFLARE_DNS_TOKEN;
const cloudflareZoneCreateToken = process.env.CLOUDFLARE_ZONE_CREATE_TOKEN || cloudflareToken;
const cloudflareDnsToken = process.env.CLOUDFLARE_DNS_EDIT_TOKEN || cloudflareZoneCreateToken || cloudflareToken || process.env.CLOUDFLARE_DNS_TOKEN;
const cloudflareAccountId = process.env.CLOUDFLARE_ACCOUNT_ID || ACCOUNT_ID_FALLBACK;
const PAGES_TARGET = `${PROJECT_NAME}.pages.dev`;

function requireSecret(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing ${name}.`);
  return value;
}

function isNotFoundError(error) {
  const message = String(error.message);
  return message.includes("not found") || message.includes("8000007") || message.includes("8000021");
}

async function cf(pathname, { method = "GET", body, ok = [200], token = cloudflareToken } = {}) {
  const response = await fetch(`${CF_API}${pathname}`, {
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

async function publicIp() {
  const response = await fetch("https://api.ipify.org");
  if (!response.ok) throw new Error(`Could not read public IP: ${response.status}`);
  return (await response.text()).trim();
}

function splitDomain(domain) {
  const parts = domain.split(".");
  return {
    sld: parts.slice(0, -1).join("."),
    tld: parts.at(-1),
  };
}

async function namecheap(command, params = {}) {
  const apiUser = requireSecret("NAMECHEAP_API_USER");
  const apiKey = requireSecret("NAMECHEAP_API_KEY");
  const userName = process.env.NAMECHEAP_USERNAME || apiUser;
  const clientIp = params.ClientIp || await publicIp();
  const url = new URL(NAMECHEAP_API);
  url.searchParams.set("ApiUser", apiUser);
  url.searchParams.set("ApiKey", apiKey);
  url.searchParams.set("UserName", userName);
  url.searchParams.set("ClientIp", clientIp);
  url.searchParams.set("Command", command);
  for (const [key, value] of Object.entries(params)) {
    if (value != null) url.searchParams.set(key, String(value));
  }
  const response = await fetch(url);
  const text = await response.text();
  if (!response.ok || /Status="ERROR"/i.test(text)) {
    const match = text.match(/<Error[^>]*>([\s\S]*?)<\/Error>/i);
    throw new Error(`${command} failed: ${match?.[1]?.trim() || response.statusText}`);
  }
  return text;
}

async function ensureZone(domain) {
  const existing = await cf(`/zones?name=${encodeURIComponent(domain)}&account.id=${cloudflareAccountId}`);
  if (existing[0]?.id) {
    console.log(`OK Cloudflare zone exists: ${domain}`);
    return existing[0];
  }

  console.log(`${apply ? "CREATE" : "WOULD CREATE"} Cloudflare zone: ${domain}`);
  if (!apply) return { name: domain, name_servers: [] };
  const zone = await cf("/zones", {
    method: "POST",
    token: cloudflareZoneCreateToken,
    ok: [200, 201],
    body: {
      name: domain,
      account: { id: cloudflareAccountId },
      type: "full",
    },
  });
  return zone;
}

async function setNamecheapNameservers(domain, nameservers) {
  if (!nameservers?.length) {
    console.log(`SKIP Namecheap nameservers for ${domain}: no Cloudflare nameservers available yet`);
    return;
  }
  const currentIp = await publicIp();
  const { sld, tld } = splitDomain(domain);
  console.log(`${apply ? "SET" : "WOULD SET"} Namecheap nameservers for ${domain}: ${nameservers.join(", ")}`);
  if (!apply) return;
  await namecheap("namecheap.domains.dns.setCustom", {
    SLD: sld,
    TLD: tld,
    NameServers: nameservers.join(","),
    ClientIp: currentIp,
  });
}

async function ensurePagesProject() {
  try {
    await cf(`/accounts/${cloudflareAccountId}/pages/projects/${PROJECT_NAME}`);
    console.log(`OK Pages project exists: ${PROJECT_NAME}`);
    return;
  } catch (error) {
    if (!isNotFoundError(error)) throw error;
  }

  console.log(`${apply ? "CREATE" : "WOULD CREATE"} Pages project: ${PROJECT_NAME}`);
  if (!apply) return;
  await cf(`/accounts/${cloudflareAccountId}/pages/projects`, {
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
    await cf(`/accounts/${cloudflareAccountId}/pages/projects/${PROJECT_NAME}/domains/${domain}`);
    console.log(`OK Pages domain exists: ${domain}`);
    return;
  } catch (error) {
    if (!isNotFoundError(error)) throw error;
  }

  console.log(`${apply ? "ATTACH" : "WOULD ATTACH"} Pages domain: ${domain}`);
  if (!apply) return;
  await cf(`/accounts/${cloudflareAccountId}/pages/projects/${PROJECT_NAME}/domains`, {
    method: "POST",
    ok: [200, 201],
    body: { name: domain },
  });
}

async function ensureDnsCname(zone, name) {
  if (!zone?.id) return;
  try {
    const existing = await cf(
      `/zones/${zone.id}/dns_records?name=${encodeURIComponent(name)}`,
      { token: cloudflareDnsToken },
    );
    const webRecords = existing.filter((record) => ["A", "AAAA", "CNAME"].includes(record.type));
    const matching = webRecords.find((record) => record.type === "CNAME" && record.content === PAGES_TARGET);
    if (matching) {
      console.log(`OK DNS CNAME exists: ${name} -> ${PAGES_TARGET}`);
      return;
    }

    const cname = webRecords.find((record) => record.type === "CNAME");
    const action = cname ? "UPDATE" : "CREATE";
    console.log(`${apply ? action : `WOULD ${action}`} DNS CNAME: ${name} -> ${PAGES_TARGET}`);
    if (!apply) return;

    for (const record of webRecords.filter((candidate) => candidate.type !== "CNAME")) {
      console.log(`DELETE conflicting ${record.type} record: ${name} -> ${record.content}`);
      await cf(`/zones/${zone.id}/dns_records/${record.id}`, {
        method: "DELETE",
        token: cloudflareDnsToken,
      });
    }

    if (cname?.id) {
      await cf(`/zones/${zone.id}/dns_records/${cname.id}`, {
        method: "PUT",
        token: cloudflareDnsToken,
        body: {
          type: "CNAME",
          name,
          content: PAGES_TARGET,
          proxied: true,
        },
      });
      return;
    }

    await cf(`/zones/${zone.id}/dns_records`, {
      method: "POST",
      token: cloudflareDnsToken,
      ok: [200, 201],
      body: {
        type: "CNAME",
        name,
        content: PAGES_TARGET,
        proxied: true,
      },
    });
  } catch (error) {
    console.log(`BLOCKED DNS CNAME ${name}: ${error.message}`);
  }
}

async function main() {
  if (!cloudflareToken) throw new Error("Missing CLOUDFLARE_API_TOKEN/CLOUDFLARE_DNS_TOKEN.");
  console.log(apply ? "Platform cutover APPLY" : "Platform cutover PLAN");

  const zones = new Map();
  for (const domain of DOMAINS) {
    try {
      const zone = await ensureZone(domain);
      zones.set(domain, zone);
      await setNamecheapNameservers(domain, zone.name_servers);
    } catch (error) {
      console.log(`BLOCKED Cloudflare zone ${domain}: ${error.message}`);
    }
  }

  await ensurePagesProject();
  const pagesDomains = [
    CANONICAL_DOMAIN,
    `www.${CANONICAL_DOMAIN}`,
    BACKUP_DOMAIN,
    `www.${BACKUP_DOMAIN}`,
  ];
  for (const domain of pagesDomains) {
    const zoneDomain = DOMAINS.find((candidate) => domain === candidate || domain.endsWith(`.${candidate}`));
    if (apply && zoneDomain && !zones.get(zoneDomain)?.id) {
      console.log(`SKIP Pages domain ${domain}: Cloudflare zone ${zoneDomain} is not ready`);
      continue;
    }
    await ensurePagesDomain(domain);
  }

  for (const domain of DOMAINS) {
    const zone = zones.get(domain);
    await ensureDnsCname(zone, domain);
    await ensureDnsCname(zone, `www.${domain}`);
  }

  console.log("Next: deploy with `npx wrangler pages deploy dist --project-name=call-of-doodie --branch=main` once the Pages project exists.");
}

main().catch((error) => {
  console.error(`Platform cutover failed: ${error.message}`);
  process.exitCode = 1;
});
