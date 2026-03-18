import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

// If env vars aren't set (e.g. local dev without .env.local), export null
// and the storage functions fall back to localStorage gracefully.
export const supabase = (url && key) ? createClient(url, key) : null;

// Initialize (or resume) an anonymous Supabase auth session.
// Requires "Anonymous sign-ins" enabled in Supabase Auth settings.
// Returns the user UID or null if unavailable.
export async function initAnonAuth() {
  if (!supabase) return null;
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user?.id) return session.user.id;
    const { data, error } = await supabase.auth.signInAnonymously();
    if (error) throw error;
    return data.user?.id || null;
  } catch (err) {
    console.warn("[auth] Anonymous sign-in unavailable:", err.message);
    return null;
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
