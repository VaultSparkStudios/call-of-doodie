import { createClient } from "npm:@supabase/supabase-js@2";

// Ko-fi webhook receiver.
//
// Ko-fi posts application/x-www-form-urlencoded with a single `data` field.
// `data` is a JSON string shaped roughly like:
//   {
//     "verification_token": "…",
//     "message_id": "…",
//     "type": "Donation" | "Subscription" | "Shop Order",
//     "from_name": "…",
//     "email": "…",
//     "message": "…",           ← players paste their in-game callsign here
//     "amount": "3.00",
//     "currency": "USD",
//     …
//   }
//
// Flow:
//   1. Verify `verification_token` matches KOFI_VERIFICATION_TOKEN env var.
//   2. Pull the callsign from the `message` body (or fall back to from_name).
//   3. Upsert callsign_claims.supporter = true for that name.
//   4. Log the event to kofi_events for audit.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const CALLSIGN_RE = /[A-Za-z0-9_\- ]{2,24}/;

function extractCallsign(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const match = trimmed.match(CALLSIGN_RE);
  return match ? match[0].trim() : null;
}

async function readKofiPayload(req: Request): Promise<Record<string, unknown> | null> {
  const contentType = req.headers.get("content-type") ?? "";
  let rawData: string | null = null;

  if (contentType.includes("application/x-www-form-urlencoded")) {
    const body = await req.text();
    const params = new URLSearchParams(body);
    rawData = params.get("data");
  } else if (contentType.includes("multipart/form-data")) {
    const form = await req.formData();
    const value = form.get("data");
    rawData = typeof value === "string" ? value : null;
  } else if (contentType.includes("application/json")) {
    // Some Ko-fi test tools post JSON directly.
    return await req.json();
  }

  if (!rawData) return null;
  try {
    return JSON.parse(rawData);
  } catch {
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed." }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const expectedToken = Deno.env.get("KOFI_VERIFICATION_TOKEN") ?? "";
    if (!supabaseUrl || !serviceRoleKey || !expectedToken) {
      return new Response(JSON.stringify({ error: "Missing Ko-fi webhook env configuration." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const payload = await readKofiPayload(req);
    if (!payload) {
      return new Response(JSON.stringify({ error: "Unparseable Ko-fi payload." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = typeof payload.verification_token === "string" ? payload.verification_token : "";
    if (token !== expectedToken) {
      return new Response(JSON.stringify({ error: "Invalid verification token." }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const messageId = typeof payload.message_id === "string" ? payload.message_id : null;
    const email = typeof payload.email === "string" ? payload.email.toLowerCase().trim() : null;
    const amount = typeof payload.amount === "string" || typeof payload.amount === "number"
      ? String(payload.amount)
      : null;
    const currency = typeof payload.currency === "string" ? payload.currency : null;
    const kofiType = typeof payload.type === "string" ? payload.type : "unknown";

    const callsign = extractCallsign(payload.message) ?? extractCallsign(payload.from_name);

    const serviceClient = createClient(supabaseUrl, serviceRoleKey);

    // Idempotent audit log. message_id uniqueness prevents double-processing
    // if Ko-fi retries the webhook.
    if (messageId) {
      const { data: existing } = await serviceClient
        .from("kofi_events")
        .select("message_id")
        .eq("message_id", messageId)
        .maybeSingle();
      if (existing) {
        return new Response(JSON.stringify({ ok: true, deduped: true }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    let supporterUpdated = false;
    if (callsign) {
      const { error: upsertError } = await serviceClient
        .from("callsign_claims")
        .upsert({ name: callsign, supporter: true }, { onConflict: "name" });
      if (upsertError) throw upsertError;
      supporterUpdated = true;
    }

    await serviceClient.from("kofi_events").insert([{
      message_id: messageId,
      kofi_type: kofiType,
      email,
      callsign,
      amount,
      currency,
      supporter_updated: supporterUpdated,
      raw: payload,
    }]);

    return new Response(JSON.stringify({ ok: true, supporterUpdated, callsign }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown kofi-webhook failure";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
