import fs from "node:fs";
import path from "node:path";
import { getSecret } from "./secrets.mjs";

export const PROJECT_SUPABASE_REF = "fjnpzjjyhnpmunfoycrp";
export const PROJECT_SUPABASE_URL = `https://${PROJECT_SUPABASE_REF}.supabase.co`;
const DEFAULT_SITE_URL = "https://callofdoodie.wtf/";

function decodeJwtPayload(value) {
  if (typeof value !== "string" || !value.startsWith("eyJ")) return null;
  const [, payload] = value.split(".");
  if (!payload) return null;
  try {
    return JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
  } catch {
    return null;
  }
}

export function isProjectAnonKey(value) {
  const payload = decodeJwtPayload(value);
  return payload?.ref === PROJECT_SUPABASE_REF && payload?.role === "anon";
}

export function extractExpectedSupabaseConfig(text) {
  if (typeof text !== "string" || !text.includes(PROJECT_SUPABASE_URL)) return null;
  const tokens = text.match(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g) || [];
  const anonKey = tokens.find(isProjectAnonKey);
  return anonKey ? { supabaseUrl: PROJECT_SUPABASE_URL, anonKey } : null;
}

export function extractProjectAnonKeyFromManagement(payload) {
  const keys = Array.isArray(payload) ? payload : (Array.isArray(payload?.api_keys) ? payload.api_keys : []);
  for (const entry of keys) {
    const value = typeof entry === "string" ? entry : (entry?.api_key || entry?.key || entry?.value);
    if (isProjectAnonKey(value)) return value;
  }
  return null;
}

function gatewayConfig() {
  for (const [urlKey, keyKey] of [
    ["VITE_SUPABASE_URL", "VITE_SUPABASE_ANON_KEY"],
    ["SUPABASE_URL", "SUPABASE_ANON_KEY"],
  ]) {
    const supabaseUrl = getSecret(urlKey, "call-of-doodie.supabase.client");
    const anonKey = getSecret(keyKey, "call-of-doodie.supabase.client");
    if (supabaseUrl?.replace(/\/+$/, "") === PROJECT_SUPABASE_URL && isProjectAnonKey(anonKey)) {
      return { supabaseUrl: PROJECT_SUPABASE_URL, anonKey, source: `gateway:${urlKey}` };
    }
  }
  return null;
}

function localDeployableConfig(repoRoot) {
  const assetsDir = path.join(repoRoot, "dist", "assets");
  if (!fs.existsSync(assetsDir)) return null;
  for (const name of fs.readdirSync(assetsDir).filter((entry) => entry.endsWith(".js"))) {
    const config = extractExpectedSupabaseConfig(fs.readFileSync(path.join(assetsDir, name), "utf8"));
    if (config) return { ...config, source: "local-deployable-artifact" };
  }
  return null;
}

async function managementConfig() {
  const accessToken = getSecret("SUPABASE_ACCESS_TOKEN", "supabase.management");
  if (!accessToken) return null;
  const response = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_SUPABASE_REF}/api-keys`, {
    headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/json" },
  });
  if (!response.ok) return null;
  const anonKey = extractProjectAnonKeyFromManagement(await response.json());
  return anonKey ? { supabaseUrl: PROJECT_SUPABASE_URL, anonKey, source: "supabase-management-api" } : null;
}

async function deployedConfig(siteUrl) {
  const origin = new URL(siteUrl).origin;
  const queue = [new URL(siteUrl).href];
  const visited = new Set();
  while (queue.length && visited.size < 30) {
    const current = queue.shift();
    if (visited.has(current)) continue;
    visited.add(current);
    const response = await fetch(current, { headers: { Accept: "text/html,application/javascript" } });
    if (!response.ok) continue;
    const text = await response.text();
    const config = extractExpectedSupabaseConfig(text);
    if (config) return { ...config, source: `deployed-artifact:${new URL(siteUrl).host}` };
    for (const match of text.matchAll(/["']([^"']+\.js)["']/g)) {
      let next;
      try { next = new URL(match[1], current); } catch { continue; }
      if (next.origin === origin && !visited.has(next.href)) queue.push(next.href);
    }
  }
  return null;
}

export async function resolveProjectSupabasePublicConfig({
  repoRoot = process.cwd(),
  siteUrl = process.env.COD_PUBLIC_CONFIG_URL || DEFAULT_SITE_URL,
} = {}) {
  const fromGateway = gatewayConfig();
  if (fromGateway) return fromGateway;

  try {
    const fromManagement = await managementConfig();
    if (fromManagement) return fromManagement;
  } catch {
    // Public deployed configuration remains an agent-safe fallback.
  }

  try {
    const fromDeploy = await deployedConfig(siteUrl);
    if (fromDeploy) return fromDeploy;
  } catch {
    // A fresh local deployable artifact remains a valid public-config fallback offline.
  }

  const fromArtifact = localDeployableConfig(repoRoot);
  if (fromArtifact) return fromArtifact;
  throw new Error(
    `Call of Doodie Supabase public config unavailable through the gateway, ${siteUrl}, or dist/assets.`,
  );
}
