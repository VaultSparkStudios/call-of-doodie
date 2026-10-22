const DEFAULT_ALLOWED_ORIGINS = [
  "https://callofdoodie.wtf",
  "https://www.callofdoodie.wtf",
  "https://staging.callofdoodie.wtf",
  "http://localhost:4173",
  "http://localhost:5173",
];

function allowedOrigins() {
  const configured = (Deno.env.get("ALLOWED_WEB_ORIGINS") ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  return new Set(configured.length ? configured : DEFAULT_ALLOWED_ORIGINS);
}

function isProjectPagesOrigin(origin: string | null) {
  if (!origin) return false;
  try {
    const url = new URL(origin);
    return url.protocol === "https:"
      && (url.hostname === "call-of-doodie.pages.dev" || url.hostname.endsWith(".call-of-doodie.pages.dev"));
  } catch {
    return false;
  }
}

export function isAllowedOrigin(req: Request) {
  const origin = req.headers.get("origin");
  return !origin || allowedOrigins().has(origin) || isProjectPagesOrigin(origin);
}

export function corsHeadersFor(req: Request) {
  const origin = req.headers.get("origin");
  const headers: Record<string, string> = {
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
  if (origin && (allowedOrigins().has(origin) || isProjectPagesOrigin(origin))) headers["Access-Control-Allow-Origin"] = origin;
  return headers;
}

export function rejectDisallowedOrigin(req: Request, headers = corsHeadersFor(req)) {
  if (isAllowedOrigin(req)) return null;
  return new Response(JSON.stringify({ error: "Origin is not allowed." }), {
    status: 403,
    headers: { ...headers, "Content-Type": "application/json" },
  });
}

export type JsonObjectResult =
  // deno-lint-ignore no-explicit-any -- handlers read loosely typed client fields, as req.json() did
  | { ok: true; body: Record<string, any> }
  | { ok: false; response: Response };

// Read a request body that must be a JSON object. A malformed body is the
// caller's mistake, so it gets a 400 (or 413 over `maxBytes`) with a fixed
// message instead of falling into a handler's catch-all 500 that echoes
// error.message. Pass maxBytes = Infinity to apply the shape guard only.
export async function readJsonObject(
  req: Request,
  headers: Record<string, string>,
  maxBytes = Infinity,
): Promise<JsonObjectResult> {
  const reject = (status: number, error: string): JsonObjectResult => ({
    ok: false,
    response: new Response(JSON.stringify({ error }), {
      status,
      headers: { ...headers, "Content-Type": "application/json" },
    }),
  });
  let text: string;
  try {
    text = await req.text();
  } catch {
    return reject(400, "Invalid request body.");
  }
  if (new TextEncoder().encode(text).length > maxBytes) return reject(413, "Request body is too large.");
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return reject(400, "Invalid JSON body.");
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return reject(400, "Invalid JSON body.");
  // deno-lint-ignore no-explicit-any
  return { ok: true, body: parsed as Record<string, any> };
}

async function sha256(value: string) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function requestBucket(req: Request, secret: string, scope: string) {
  const forwarded = req.headers.get("cf-connecting-ip")
    ?? req.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    ?? req.headers.get("x-real-ip")
    ?? "unknown";
  const agent = req.headers.get("user-agent")?.slice(0, 160) ?? "unknown";
  return `${scope}:${await sha256(`${secret}|${forwarded}|${agent}`)}`;
}

export async function consumeRateLimit(
  serviceClient: {
    rpc: (
      name: string,
      args: Record<string, unknown>,
    ) => PromiseLike<{ data: unknown; error: unknown }>;
  },
  bucket: string,
  limit: number,
  windowSeconds: number,
) {
  const { data, error } = await serviceClient.rpc("consume_api_rate_limit", {
    p_key: bucket,
    p_limit: limit,
    p_window_seconds: windowSeconds,
  });
  if (error) throw new Error("Rate-limit service unavailable.");
  return data === true;
}
