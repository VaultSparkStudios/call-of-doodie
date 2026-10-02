const KEY = "cod-auth-return-v1";
const ALLOWED_PAGES = new Set(["/", "/board/", "/modes/", "/field-manual/"]);
const ALLOWED_HOME_HASH = /^#(?:profile(?:\/(?:overview|runs|collection|save))?|build(?:\/(?:earned|setup))?|deploy)$/;

export function sanitizeAuthReturn(value, origin = globalThis.location?.origin) {
  if (typeof value !== "string" || !value || !origin) return "/";
  try {
    const target = new URL(value, origin);
    if (target.origin !== origin || target.username || target.password || target.search || !ALLOWED_PAGES.has(target.pathname)) return "/";
    if (target.hash && (target.pathname !== "/" || !ALLOWED_HOME_HASH.test(target.hash))) return "/";
    return `${target.pathname}${target.hash}`;
  } catch { return "/"; }
}

export function saveAuthReturn(value, storage = globalThis.sessionStorage, origin = globalThis.location?.origin) {
  const target = sanitizeAuthReturn(value, origin);
  try { storage?.setItem(KEY, target); } catch {}
  return target;
}

export function takeAuthReturn(queryValue, storage = globalThis.sessionStorage, origin = globalThis.location?.origin) {
  let stored = null;
  try { stored = storage?.getItem(KEY); storage?.removeItem(KEY); } catch {}
  return sanitizeAuthReturn(queryValue || stored || "/", origin);
}
