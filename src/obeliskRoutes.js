export function getObeliskRoute(pathname = "/") {
  const cleanPath = String(pathname || "/").replace(/\/+$/, "") || "/";
  if (cleanPath === "/login") return "login";
  if (cleanPath === "/auth/callback") return "callback";
  return "game";
}
