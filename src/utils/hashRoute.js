// hashRoute — addressable in-app panels (S163).
//
// `/#profile`, `/#board`, `/#field-manual`, `/#changelog`, `/#modes` open the
// matching panel on the arcade home without a router. `#deploy` stays a plain
// scroll anchor. Static pages link `../#board` etc. so the SPA/static seam is
// invisible to players and crawlers.

export const HASH_PANELS = Object.freeze(["profile", "board", "field-manual", "changelog", "modes", "achievements", "leaderboard"]);

export function parseHash(hash = "") {
  const raw = String(hash || "").replace(/^#/, "").trim();
  if (!raw) return null;
  const [id, ...rest] = raw.split("/");
  if (!HASH_PANELS.includes(id)) return null;
  return { id, arg: rest.join("/") || null };
}

export function navigateHash(id, arg = null, win = globalThis.window) {
  if (!win || !HASH_PANELS.includes(id)) return false;
  const next = `#${id}${arg ? `/${arg}` : ""}`;
  if (win.location.hash !== next) win.history.pushState(null, "", next);
  win.dispatchEvent(new HashChangeEvent("hashchange"));
  return true;
}

export function clearHash(win = globalThis.window) {
  if (!win || !win.location.hash) return;
  win.history.replaceState(null, "", win.location.pathname + win.location.search);
}

/** Subscribe to hash panels. Returns an unsubscribe function. Fires once for the current hash. */
export function watchHash(onPanel, win = globalThis.window) {
  if (!win) return () => {};
  const handler = () => { const route = parseHash(win.location.hash); if (route) onPanel(route); };
  win.addEventListener("hashchange", handler);
  handler();
  return () => win.removeEventListener("hashchange", handler);
}
