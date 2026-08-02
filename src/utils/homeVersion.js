export const HOME_VERSION = Object.freeze({
  LEGACY: "v1",
  CURRENT: "v2",
  EXPERIMENTAL: "v3",
});

export function resolveHomeVersion(search = "") {
  try {
    const requested = new URLSearchParams(typeof search === "string" ? search : "").get("home");
    if (requested === HOME_VERSION.LEGACY) return HOME_VERSION.LEGACY;
    if (requested === HOME_VERSION.EXPERIMENTAL) return HOME_VERSION.EXPERIMENTAL;
    return HOME_VERSION.CURRENT;
  } catch {
    return HOME_VERSION.CURRENT;
  }
}
