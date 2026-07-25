export const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
export const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export function createSupabaseClientLoader({
  url,
  anonKey,
  loadModule = () => import("@supabase/supabase-js"),
} = {}) {
  let client = null;
  let pending = null;

  return async function loadSupabaseClient() {
    if (!url || !anonKey) return null;
    if (client) return client;
    if (!pending) {
      pending = loadModule()
        .then(({ createClient }) => {
          client = createClient(url, anonKey, { realtime: { enabled: false } });
          return client;
        })
        .catch((error) => {
          pending = null;
          console.warn("[supabase] Optional client failed to load:", error?.message || String(error));
          return null;
        });
    }
    return pending;
  };
}

const loadConfiguredClient = createSupabaseClientLoader({ url: supabaseUrl, anonKey: supabaseAnonKey });

export function getSupabaseClient() {
  return loadConfiguredClient();
}

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

export async function getAuthUid(client = null) {
  const resolvedClient = client || await getSupabaseClient();
  if (!resolvedClient) return null;
  try {
    const { data: { session } } = await resolvedClient.auth.getSession();
    return session?.user?.id || null;
  } catch { return null; }
}
