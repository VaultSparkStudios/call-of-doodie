const BASE_HEADERS = {
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Cross-Origin-Opener-Policy": "same-origin",
  "Cross-Origin-Resource-Policy": "same-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
};

const BASE_CSP = {
  "default-src": ["'self'"],
  "base-uri": ["'self'"],
  "object-src": ["'none'"],
  "frame-ancestors": ["'none'"],
  "form-action": ["'self'"],
  "manifest-src": ["'self'"],
  "script-src": ["'self'", "https://static.cloudflareinsights.com"],
  "style-src": ["'self'", "'unsafe-inline'"],
  "img-src": ["'self'", "data:", "https:"],
  "font-src": ["'self'", "data:", "https:"],
  "connect-src": ["'self'", "https:"],
  "media-src": ["'self'", "data:", "blob:"],
  "worker-src": ["'self'", "blob:"],
};

const CALL_OF_DOODIE_PREFIX = "/call-of-doodie/";
const CALL_OF_DOODIE_CSP = {
  "img-src": ["'self'", "data:", "https:", "blob:"],
  "connect-src": [
    "'self'",
    "https:",
    "https://*.supabase.co",
    "wss://fjnpzjjyhnpmunfoycrp.supabase.co",
    "https://static.cloudflareinsights.com",
  ],
};

function mergePolicy(basePolicy, overrides) {
  const merged = { ...basePolicy };
  for (const [directive, sources] of Object.entries(overrides)) {
    merged[directive] = [...sources];
  }
  return merged;
}

function normalize(value) {
  return String(value).replace(/\s+/g, " ").trim();
}

function serializePolicy(policy) {
  return Object.entries(policy)
    .map(([directive, sources]) => `${directive} ${sources.join(" ")}`)
    .join("; ");
}

function buildHeaders(pathname) {
  const cspPolicy = pathname.startsWith(CALL_OF_DOODIE_PREFIX)
    ? mergePolicy(BASE_CSP, CALL_OF_DOODIE_CSP)
    : BASE_CSP;

  return {
    ...BASE_HEADERS,
    "Content-Security-Policy": normalize(serializePolicy(cspPolicy)),
  };
}

export default {
  async fetch(request) {
    const response = await fetch(request);
    const url = new URL(request.url);
    const headers = new Headers(response.headers);

    for (const [name, value] of Object.entries(buildHeaders(url.pathname))) {
      headers.set(name, value);
    }

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  },
};
