import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

// If env vars aren't set (e.g. local dev without .env.local), export null
// and the storage functions fall back to localStorage gracefully.
export const supabase = (url && key) ? createClient(url, key) : null;
