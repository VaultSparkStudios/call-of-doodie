import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const VALID_MODES = new Set(["score_attack", "daily_challenge", "boss_rush", "cursed", "speedrun", "gauntlet", "normal"]);
const VALID_DIFFICULTIES = new Set(["easy", "normal", "hard", "insane"]);

function clampInt(value: unknown, min: number, max: number, fallback = min) {
  const num = Number.parseInt(String(value ?? ""), 10);
  if (!Number.isFinite(num)) return fallback;
  return Math.min(max, Math.max(min, num));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    if (!supabaseUrl || !anonKey || !serviceRoleKey) {
      return new Response(JSON.stringify({ error: "Missing Supabase env configuration." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const authHeader = req.headers.get("Authorization") ?? "";
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const serviceClient = createClient(supabaseUrl, serviceRoleKey);

    // Try Supabase user auth first; fall back to client-provided stable UUID.
    // This supports projects with CAPTCHA protection enabled where anonymous
    // sign-in is unavailable from the browser.
    const { data: { user } } = await userClient.auth.getUser().catch(() => ({ data: { user: null } }));

    const body = await req.json().catch(() => ({}));

    const uid: string = user?.id
      ?? (typeof body.clientUid === "string" && /^[0-9a-f-]{36}$/i.test(body.clientUid) ? body.clientUid : null)
      ?? crypto.randomUUID();

    const mode = VALID_MODES.has(String(body.mode ?? "")) ? String(body.mode) : null;
    const difficulty = VALID_DIFFICULTIES.has(String(body.difficulty ?? "")) ? String(body.difficulty) : "normal";
    const seed = body.seed == null ? null : clampInt(body.seed, 0, 999999999, 0);
    const token = crypto.randomUUID();
    const createdAt = new Date();
    const expiresAt = new Date(createdAt.getTime() + 6 * 60 * 60 * 1000);

    const { error: insertError } = await serviceClient.from("run_tokens").insert([{
      token,
      uid,
      mode,
      difficulty,
      seed,
      expires_at: expiresAt.toISOString(),
    }]);
    if (insertError) throw insertError;

    return new Response(JSON.stringify({
      ok: true,
      token,
      expiresAt: expiresAt.toISOString(),
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown issue-run-token failure";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
