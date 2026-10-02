import { issueProfileCapability } from "../../src/server/profileCapability.js";
import { readBoundedJson } from "../../src/server/httpIngress.js";
import { createLocalRateLimiter } from "../../src/server/localRateLimiter.js";

const PROJECT = "Call of Doodie";
const RECEIPT_VERSION = "cod-obelisk-receipt-v1";

// S145 — browser origin allowlist mirroring the Supabase http-trust pattern.
// Requests without an Origin header (curl, server-to-server) are allowed;
// browser requests from foreign origins are rejected.
const ALLOWED_ORIGINS = new Set([
  "https://callofdoodie.wtf",
  "https://www.callofdoodie.wtf",
  "https://playcallofdoodie.com",
  "https://www.playcallofdoodie.com",
  "http://localhost:5173",
  "http://localhost:4173",
  "http://localhost:4174",
]);

function isAllowedOrigin(origin) {
  if (!origin) return true;
  if (ALLOWED_ORIGINS.has(origin)) return true;
  // Cloudflare Pages preview deployments of this project.
  try {
    const url = new URL(origin);
    return url.protocol === "https:" && (url.hostname.endsWith(".call-of-doodie.pages.dev") || url.hostname === "call-of-doodie.pages.dev");
  } catch { return false; }
}

// Best-effort per-isolate rate bucket (12 requests/min per client IP). This is
// not a distributed quota — it bounds abuse cheaply until a KV/DO budget is
// justified; the upstream verifier keeps its own authoritative limits.
const RATE_LIMIT_PER_MINUTE = 12;
const consumeLocalRate = createLocalRateLimiter(RATE_LIMIT_PER_MINUTE);

function json(body, init = {}) {
  return new Response(JSON.stringify(body), {
    status: init.status || 200,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      ...init.headers,
    },
  });
}

function toHex(bytes) {
  return [...new Uint8Array(bytes)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function sha256(value) {
  const input = new TextEncoder().encode(String(value));
  const digest = await crypto.subtle.digest("SHA-256", input);
  return toHex(digest);
}

function pickIdentity(upstream) {
  const source = upstream?.identity || upstream?.user || upstream?.account || upstream || {};
  const subject = source.subject || source.sub || source.id || source.userId || upstream?.subject || upstream?.sub || upstream?.id;
  if (!subject) return null;
  return {
    subject: String(subject),
    handle: source.handle || source.username || source.name || null,
    tier: source.tier || upstream?.tier || null,
  };
}

function isVerified(upstream) {
  if (!upstream || upstream.ok === false || upstream.verified === false) return false;
  return Boolean(pickIdentity(upstream));
}

export async function verifyObeliskRequest({ request, env = {}, fetchImpl = fetch, now = () => Date.now() }) {
  if (request.method !== "POST") {
    return json({ ok: false, reason: "method-not-allowed" }, { status: 405, headers: { allow: "POST" } });
  }

  if (!isAllowedOrigin(request.headers.get("origin"))) {
    return json({ ok: false, reason: "origin-not-allowed" }, { status: 403 });
  }

  const clientIp = request.headers.get("cf-connecting-ip") || "unknown";
  if (!consumeLocalRate(clientIp, now())) {
    return json({ ok: false, reason: "rate-limited" }, { status: 429, headers: { "retry-after": "60" } });
  }

  const parsed = await readBoundedJson(request, 8192);
  if (parsed.error) return json({ ok: false, reason: parsed.error }, { status: parsed.status, headers: parsed.status === 408 ? { "retry-after": "5" } : {} });
  const token = typeof parsed.body.token === "string" ? parsed.body.token.trim() : "";
  if (!token) return json({ ok: false, reason: "no-token" }, { status: 400 });
  if (token.length > 4096) return json({ ok: false, reason: "token-too-large" }, { status: 400 });

  const verifyUrl = env.OBELISK_VERIFY_URL;
  if (!verifyUrl) {
    return json({
      ok: false,
      reason: "verify-not-configured",
      detail: "Account verification is not enabled on this deployment yet. Guest play is still available.",
    }, { status: 503 });
  }

  const headers = { "content-type": "application/json" };
  if (env.OBELISK_VERIFY_SECRET) headers.authorization = `Bearer ${env.OBELISK_VERIFY_SECRET}`;

  let upstreamResponse;
  const signal = AbortSignal.timeout(5000);
  try {
    upstreamResponse = await fetchImpl(verifyUrl, {
      method: "POST",
      headers,
      body: JSON.stringify({ token, project: PROJECT }),
      signal,
    });
  } catch {
    if (signal.aborted) return json({ ok: false, reason: "verify-timeout" }, { status: 504, headers: { "retry-after": "5" } });
    return json({ ok: false, reason: "verify-unreachable" }, { status: 502 });
  }

  let upstream = null;
  try {
    upstream = await upstreamResponse.json();
  } catch {
    if (signal.aborted) return json({ ok: false, reason: "verify-timeout" }, { status: 504, headers: { "retry-after": "5" } });
    return json({ ok: false, reason: "verify-invalid-response" }, { status: 502 });
  }

  if (!upstreamResponse.ok || !isVerified(upstream)) {
    return json({ ok: false, reason: upstream?.reason || "verify-failed" }, { status: 401 });
  }

  const identity = pickIdentity(upstream);
  const profileAccess = env.OBELISK_VERIFY_SECRET
    ? await issueProfileCapability(env.OBELISK_VERIFY_SECRET, identity.subject, token, now())
    : null;
  return json({
    ok: true,
    provider: "obelisk",
    project: PROJECT,
    verifiedAt: now(),
    identity,
    receipt: {
      version: RECEIPT_VERSION,
      tokenHash: await sha256(token),
      subjectHash: await sha256(identity.subject),
    },
    profileCapability: profileAccess?.capability || null,
    profileCapabilityExpiresAt: profileAccess?.expiresAt || null,
  });
}

export async function onRequestPost(context) {
  return verifyObeliskRequest({
    request: context.request,
    env: context.env,
  });
}

export async function onRequest(context) {
  return verifyObeliskRequest({
    request: context.request,
    env: context.env,
  });
}
