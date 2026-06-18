const PROJECT = "Call of Doodie";
const RECEIPT_VERSION = "cod-obelisk-receipt-v1";

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

async function readToken(request) {
  try {
    const body = await request.json();
    return typeof body?.token === "string" ? body.token.trim() : "";
  } catch {
    return "";
  }
}

export async function verifyObeliskRequest({ request, env = {}, fetchImpl = fetch, now = () => Date.now() }) {
  if (request.method !== "POST") {
    return json({ ok: false, reason: "method-not-allowed" }, { status: 405, headers: { allow: "POST" } });
  }

  const token = await readToken(request);
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
  try {
    upstreamResponse = await fetchImpl(verifyUrl, {
      method: "POST",
      headers,
      body: JSON.stringify({ token, project: PROJECT }),
    });
  } catch {
    return json({ ok: false, reason: "verify-unreachable" }, { status: 502 });
  }

  let upstream = null;
  try {
    upstream = await upstreamResponse.json();
  } catch {
    return json({ ok: false, reason: "verify-invalid-response" }, { status: 502 });
  }

  if (!upstreamResponse.ok || !isVerified(upstream)) {
    return json({ ok: false, reason: upstream?.reason || "verify-failed" }, { status: 401 });
  }

  const identity = pickIdentity(upstream);
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
