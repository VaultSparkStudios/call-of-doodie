// Optional browser persistence must also tolerate a denied Storage getter.
// Resolve lazily per call so recovery and explicit caller storage still work.
export function optionalBrowserStorage(type = "local") {
  try {
    return (type === "session" ? globalThis.sessionStorage : globalThis.localStorage) ?? null;
  } catch {
    return null;
  }
}
