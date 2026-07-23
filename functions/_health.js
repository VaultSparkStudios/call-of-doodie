const CONTRACT = "edge-health-v1";

function deployReceipt(env = {}) {
  const candidate = String(env.CF_PAGES_COMMIT_SHA || "").trim().toLowerCase();
  return /^[a-f0-9]{40}$/.test(candidate) ? candidate.slice(0, 12) : "unknown";
}

export function buildEdgeHealthReceipt(env = {}, now = new Date()) {
  return {
    contract: CONTRACT,
    status: "edge-ready",
    service: "call-of-doodie",
    scope: "cloudflare-pages-edge-only",
    deploy: deployReceipt(env),
    checkedAt: now.toISOString(),
  };
}

export function onRequestGet(context) {
  return Response.json(buildEdgeHealthReceipt(context?.env), {
    status: 200,
    headers: {
      "Cache-Control": "no-store, max-age=0",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

export function onRequest(context = {}) {
  if (String(context.request?.method || "").toUpperCase() === "GET") return onRequestGet(context);
  return Response.json({
    contract: CONTRACT,
    status: "method-not-allowed",
  }, {
    status: 405,
    headers: {
      Allow: "GET",
      "Cache-Control": "no-store, max-age=0",
    },
  });
}
