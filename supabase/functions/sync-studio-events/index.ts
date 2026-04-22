import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function cleanText(value: unknown, maxLen: number, fallback = "") {
  const text = String(value ?? "").replace(/[\u0000-\u001f\u007f]/g, "").trim();
  return text ? text.slice(0, maxLen) : fallback;
}

function cleanUuid(value: unknown) {
  const text = typeof value === "string" ? value.trim() : "";
  return /^[0-9a-f-]{36}$/i.test(text) ? text : null;
}

function cleanIsoDate(value: unknown, fallback = new Date().toISOString()) {
  const text = typeof value === "string" ? value.trim() : "";
  if (!text) return fallback;
  const timestamp = Date.parse(text);
  return Number.isFinite(timestamp) ? new Date(timestamp).toISOString() : fallback;
}

function cleanPayload(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function normalizeEvent(raw: Record<string, unknown>, uid: string | null, clientUid: string | null) {
  return {
    client_event_id: cleanText(raw.clientEventId, 80),
    uid,
    client_uid: clientUid,
    game_id: cleanText(raw.game, 32, "cod"),
    schema_name: cleanText(raw.schema, 80, "vaultspark.game-event.v1"),
    contract_version: Number.isFinite(Number(raw.contractVersion)) ? Number(raw.contractVersion) : 1,
    type: cleanText(raw.type, 40, "unknown"),
    category: cleanText(raw.category, 24, "system"),
    surface: cleanText(raw.surface, 40, "gameplay"),
    summary: cleanText(raw.summary, 140, ""),
    payload: cleanPayload(raw.payload),
    event_created_at: cleanIsoDate(raw.createdAt),
  };
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
    const { data: { user } } = await userClient.auth.getUser().catch(() => ({ data: { user: null } }));

    const body = await req.json();
    const clientUid = cleanUuid(body?.clientUid);
    const uid = cleanUuid(user?.id);
    if (!uid && !clientUid) {
      return new Response(JSON.stringify({ error: "Missing caller identity." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const rawEvents = Array.isArray(body?.events) ? body.events : [];
    if (rawEvents.length === 0) {
      return new Response(JSON.stringify({ error: "No events supplied." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (rawEvents.length > 50) {
      return new Response(JSON.stringify({ error: "Too many events in one sync batch." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const normalized = rawEvents
      .filter((event): event is Record<string, unknown> => !!event && typeof event === "object" && !Array.isArray(event))
      .map((event) => normalizeEvent(event, uid, clientUid))
      .filter((event) => event.client_event_id);

    if (normalized.length === 0) {
      return new Response(JSON.stringify({ error: "No valid events supplied." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data, error } = await serviceClient
      .from("studio_game_events")
      .upsert(normalized, { onConflict: "client_event_id", ignoreDuplicates: true })
      .select("client_event_id");
    if (error) throw error;

    const inserted = Array.isArray(data) ? data.length : normalized.length;
    const deduped = Math.max(0, normalized.length - inserted);
    return new Response(JSON.stringify({ ok: true, inserted, deduped }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown sync-studio-events failure";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
