// debugFlags.js — centralized operator-debug detection (S155).
// Previously re-derived inline in HomeV2, MenuPanels, and other surfaces.
// Ops mode = ?debug=ops in the URL or the cod-debug-ops local preference.
export function isOpsDebug() {
  if (typeof window === "undefined") return false;
  try {
    if (new URLSearchParams(window.location.search).get("debug") === "ops") return true;
  } catch { /* ignore */ }
  try {
    return window.localStorage?.getItem("cod-debug-ops") === "1";
  } catch {
    return false;
  }
}
