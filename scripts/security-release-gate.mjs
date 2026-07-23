#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "./lib/safe-spawn.mjs";
import { runDependencyTreeCheck } from "./lib/dependency-tree.mjs";
import { getObeliskRoute } from "../src/obeliskRoutes.js";

const ROOT = process.cwd();
const JSON_MODE = process.argv.includes("--json");
const RUN_NPM_AUDIT = process.argv.includes("--npm-audit");

function read(relPath) {
  return fs.readFileSync(path.join(ROOT, relPath), "utf8");
}

function parseHeadersFile(text) {
  const headers = {};
  for (const line of text.split(/\r?\n/)) {
    const match = line.match(/^\s{2}([^:]+):\s*(.+)$/);
    if (match) headers[match[1].trim()] = match[2].trim();
  }
  return headers;
}

function parseCsp(csp) {
  const directives = {};
  for (const part of String(csp || "").split(";")) {
    const tokens = part.trim().split(/\s+/).filter(Boolean);
    if (tokens.length > 0) directives[tokens[0]] = tokens.slice(1);
  }
  return directives;
}

function includesAll(list, expected) {
  return expected.every((value) => list.includes(value));
}

function runNpmAudit() {
  const cmd = process.platform === "win32" ? "cmd" : "npm";
  const args = process.platform === "win32" ? ["/c", "npm", "audit", "--json"] : ["audit", "--json"];
  const result = spawnSync(cmd, args, {
    cwd: ROOT,
    encoding: "utf8",
    shell: false,
  });
  const text = result.stdout || result.stderr || "";
  try {
    const parsed = JSON.parse(text);
    const total = parsed.metadata?.vulnerabilities?.total;
    return {
      ok: result.status === 0 && total === 0,
      detail: total === 0 ? "0 vulnerabilities" : `${total ?? "unknown"} vulnerabilities`,
    };
  } catch {
    return {
      ok: false,
      detail: `npm audit did not return parseable JSON (exit ${result.status})`,
    };
  }
}

const headers = parseHeadersFile(read("public/_headers"));
const csp = parseCsp(headers["Content-Security-Policy"]);
const sw = read("public/sw.js");
const cfHeaders = read("cloudflare/vaultspark-security-headers.js");
const packageLockExists = fs.existsSync(path.join(ROOT, "package-lock.json"));
const obeliskVerifyExists = fs.existsSync(path.join(ROOT, "functions", "api", "obelisk-verify.js"));
const edgeHealthExists = fs.existsSync(path.join(ROOT, "functions", "_health.js"));
const dependencyTree = runDependencyTreeCheck(ROOT);

const requiredHeaders = [
  "Strict-Transport-Security",
  "Referrer-Policy",
  "X-Content-Type-Options",
  "X-Frame-Options",
  "Cross-Origin-Opener-Policy",
  "Cross-Origin-Resource-Policy",
  "Permissions-Policy",
  "Content-Security-Policy",
];

const requiredCsp = {
  "default-src": ["'self'"],
  "base-uri": ["'self'"],
  "object-src": ["'none'"],
  "frame-ancestors": ["'none'"],
  "form-action": ["'self'"],
  "manifest-src": ["'self'"],
  "script-src": ["'self'", "https://static.cloudflareinsights.com", "https://obeliskgate.com"],
  "connect-src": ["'self'", "https:", "https://*.supabase.co", "https://obeliskgate.com"],
  "worker-src": ["'self'", "blob:"],
};

const checks = [
  {
    id: "headers-present",
    ok: requiredHeaders.every((name) => Boolean(headers[name])),
    detail: `${requiredHeaders.filter((name) => Boolean(headers[name])).length}/${requiredHeaders.length} required headers present`,
  },
  {
    id: "hsts-policy",
    ok: /^max-age=(?:31536000|[3-9]\d{7,});\s*includeSubDomains$/i.test(headers["Strict-Transport-Security"] || ""),
    detail: "HSTS carries a one-year minimum and includes subdomains without claiming preload registration",
  },
  {
    id: "csp-directives",
    ok: Object.entries(requiredCsp).every(([directive, expected]) => includesAll(csp[directive] || [], expected)),
    detail: "required Content Security Policy directives and sources are present",
  },
  {
    id: "cloudflare-csp-obelisk-origin",
    ok: cfHeaders.includes("https://obeliskgate.com"),
    detail: "Cloudflare security-header worker allows the Obelisk script/connect origin",
  },
  {
    id: "obelisk-routes-explicit",
    ok: getObeliskRoute("/login") === "login"
      && getObeliskRoute("/auth/callback") === "callback"
      && getObeliskRoute("/") === "game"
      && getObeliskRoute("/daily") === "game"
      && getObeliskRoute("/anything-else") === "game",
    detail: "only /login and /auth/callback are account surfaces; guest play remains default",
  },
  {
    id: "obelisk-verify-endpoint-present",
    ok: obeliskVerifyExists,
    detail: obeliskVerifyExists
      ? "functions/api/obelisk-verify.js exists"
      : "missing functions/api/obelisk-verify.js",
  },
  {
    id: "edge-health-endpoint-present",
    ok: edgeHealthExists,
    detail: edgeHealthExists
      ? "functions/_health.js provides a typed edge-health contract"
      : "missing functions/_health.js; an SPA fallback must never count as health",
  },
  {
    id: "service-worker-cache-version",
    ok: /const CACHE_NAME = "cod-v\d+";/.test(sw),
    detail: "service worker cache name uses explicit cod-vN versioning",
  },
  {
    id: "package-lock-present",
    ok: packageLockExists,
    detail: packageLockExists ? "package-lock.json present" : "package-lock.json missing",
  },
  {
    id: "dependency-tree-coherent",
    ok: dependencyTree.ok,
    detail: dependencyTree.ok
      ? dependencyTree.detail
      : `${dependencyTree.detail}: ${dependencyTree.problems.slice(0, 3).join("; ")}`,
  },
];

if (RUN_NPM_AUDIT) {
  checks.push({
    id: "npm-audit",
    ...runNpmAudit(),
  });
}

const ok = checks.every((check) => check.ok);

if (JSON_MODE) {
  console.log(JSON.stringify({ status: ok ? "ok" : "fail", checks }, null, 2));
} else {
  console.log("Security Release Gate");
  console.log("=====================");
  for (const check of checks) {
    console.log(`- ${check.ok ? "OK" : "FAIL"} ${check.id} — ${check.detail}`);
  }
  if (!RUN_NPM_AUDIT) {
    console.log("");
    console.log("Note: pass --npm-audit to include live npm advisory verification.");
  }
}

process.exit(ok ? 0 : 1);
