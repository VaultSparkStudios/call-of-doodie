const VERSION = "v1";
export const PROFILE_CAPABILITY_LIFETIME_MS = 15 * 60 * 1000;
const encoder = new TextEncoder();

function bytesToHex(bytes) { return [...new Uint8Array(bytes)].map((value) => value.toString(16).padStart(2, "0")).join(""); }
function bytesToBase64Url(bytes) {
  let binary = "";
  for (const value of new Uint8Array(bytes)) binary += String.fromCharCode(value);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
}
function base64UrlToBytes(value) {
  if (!/^[A-Za-z0-9_-]+$/.test(value) || value.length > 2048) return null;
  try {
    const binary = atob(value.replaceAll("-", "+").replaceAll("_", "/"));
    return Uint8Array.from(binary, (char) => char.charCodeAt(0));
  } catch { return null; }
}
async function hmacKey(secret) {
  return crypto.subtle.importKey("raw", encoder.encode(`cod-profile-capability-v1:${secret}`), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);
}
async function tokenHash(token) { return bytesToHex(await crypto.subtle.digest("SHA-256", encoder.encode(token))); }

export async function issueProfileCapability(secret, subject, token, now = Date.now()) {
  if (!secret || !subject || !token || subject.length > 200 || token.length > 4096) return null;
  const expiresAt = now + PROFILE_CAPABILITY_LIFETIME_MS;
  const payload = bytesToBase64Url(encoder.encode(JSON.stringify({ subject, tokenHash: await tokenHash(token), issuedAt: now, expiresAt })));
  const unsigned = `${VERSION}.${payload}`;
  const signature = bytesToBase64Url(await crypto.subtle.sign("HMAC", await hmacKey(secret), encoder.encode(unsigned)));
  return { capability: `${unsigned}.${signature}`, expiresAt };
}

export async function verifyProfileCapability(secret, capability, subject, token, now = Date.now()) {
  if (!secret || typeof capability !== "string" || capability.length > 3000 || !subject || !token) return false;
  const [version, payload, signature, extra] = capability.split(".");
  if (version !== VERSION || extra !== undefined) return false;
  const payloadBytes = base64UrlToBytes(payload || "");
  const signatureBytes = base64UrlToBytes(signature || "");
  if (!payloadBytes || !signatureBytes || signatureBytes.length !== 32) return false;
  const validSignature = await crypto.subtle.verify("HMAC", await hmacKey(secret), signatureBytes, encoder.encode(`${version}.${payload}`));
  if (!validSignature) return false;
  try {
    const claims = JSON.parse(new TextDecoder().decode(payloadBytes));
    return claims.subject === subject && claims.tokenHash === await tokenHash(token) &&
      Number.isSafeInteger(claims.issuedAt) && Number.isSafeInteger(claims.expiresAt) &&
      claims.issuedAt <= now + 30_000 && claims.expiresAt > now &&
      claims.expiresAt - claims.issuedAt === PROFILE_CAPABILITY_LIFETIME_MS;
  } catch { return false; }
}
