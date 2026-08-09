const CANONICAL_HOST = "callofdoodie.wtf";
const REDIRECT_HOSTS = new Set([
  "www.callofdoodie.wtf",
  "playcallofdoodie.com",
  "www.playcallofdoodie.com",
]);

// S145 — Pages `_headers` rules cover static assets only; Function responses
// (e.g. /api/*) must carry their own security headers. Set here once so every
// function inherits them without repeating the block.
const FUNCTION_SECURITY_HEADERS = {
  "strict-transport-security": "max-age=31536000; includeSubDomains",
  "x-content-type-options": "nosniff",
  "x-frame-options": "DENY",
  "referrer-policy": "strict-origin-when-cross-origin",
  "permissions-policy": "camera=(), microphone=(), geolocation=()",
  "cross-origin-resource-policy": "same-origin",
};

export async function onRequest(context) {
  const url = new URL(context.request.url);

  if (REDIRECT_HOSTS.has(url.hostname)) {
    url.hostname = CANONICAL_HOST;
    return Response.redirect(url.toString(), 301);
  }

  const response = await context.next();
  const hardened = new Response(response.body, response);
  for (const [header, value] of Object.entries(FUNCTION_SECURITY_HEADERS)) {
    if (!hardened.headers.has(header)) hardened.headers.set(header, value);
  }
  return hardened;
}
