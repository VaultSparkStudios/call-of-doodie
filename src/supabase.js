import { createClient } from "@supabase/supabase-js";

export const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
export const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// If env vars aren't set (e.g. local dev without .env.local), export null
// and the storage functions fall back to localStorage gracefully.
export const supabase = (supabaseUrl && supabaseAnonKey) ? createClient(supabaseUrl, supabaseAnonKey, {
  realtime: { enabled: false },
}) : null;

// Returns a stable client-side UUID that persists across sessions.
// Used as the "user identity" when Supabase anonymous auth is unavailable
// (e.g. CAPTCHA protection enabled on the project).
// Module-level cache ensures consistency when localStorage is unavailable
// (Safari private browsing, strict storage blocking) — prevents issue/submit UID mismatch.
let _fallbackUid = null;
export function getOrCreateClientUid() {
  try {
    const stored = localStorage.getItem("cod-client-uid-v1");
    if (stored) return stored;
    const uid = crypto.randomUUID();
    localStorage.setItem("cod-client-uid-v1", uid);
    return uid;
  } catch {
    if (!_fallbackUid) _fallbackUid = crypto.randomUUID();
    return _fallbackUid;
  }
}

// Returns the current session user UID, or null.
export async function getAuthUid() {
  if (!supabase) return null;
  try {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.user?.id || null;
  } catch { return null; }
}
