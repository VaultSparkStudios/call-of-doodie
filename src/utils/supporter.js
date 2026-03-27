// ===== SUPPORTER UTILITIES =====
// Helpers for the cosmetic Supporter Pack system.
// Stored in localStorage (Option A). Future: sync to Supabase supporter column.

const LS_KEY = "cod-supporter-v1";

/** Returns true if this browser has the supporter badge claimed. */
export function isSupporter() {
  try { return localStorage.getItem(LS_KEY) === "1"; } catch { return false; }
}

/** Persists the supporter badge claim to localStorage. */
export function setSupporter() {
  try { localStorage.setItem(LS_KEY, "1"); } catch { /* storage unavailable */ }
}
