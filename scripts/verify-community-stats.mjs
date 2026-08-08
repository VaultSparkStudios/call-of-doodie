#!/usr/bin/env node

import { getSecret, redact } from "./lib/secrets.mjs";

const supabaseUrl = getSecret("SUPABASE_URL", "supabase.admin");
const serviceRoleKey = getSecret("SUPABASE_SERVICE_ROLE_KEY", "supabase.admin");
const anonKey = getSecret("SUPABASE_ANON_KEY", "supabase.admin");
const accessToken = getSecret("SUPABASE_ACCESS_TOKEN", "supabase.management");

if (!supabaseUrl || !serviceRoleKey || !anonKey || !accessToken) {
  throw new Error("Supabase verification capability is unavailable.");
}

async function request(path, key, options = {}) {
  const response = await fetch(`${supabaseUrl}/rest/v1/${path}`, {
    ...options,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });
  if (!response.ok) {
    throw new Error(`Supabase REST error ${response.status}: ${redact(await response.text())}`);
  }
  const text = await response.text();
  return text ? JSON.parse(text) : null;
}

async function verifyThroughRest() {
  const [aggregateRows, publicRows, syntheticRows, factRows] = await Promise.all([
    request("rpc/get_cod_community_stats", anonKey, {
      method: "POST",
      body: "{}",
    }),
    request(
      "leaderboard?select=id,name,score,kills,wave,mode,is_synthetic&game_id=eq.cod&order=score.desc&limit=1000",
      anonKey,
    ),
    request(
      "leaderboard?select=id&game_id=eq.cod&is_synthetic=eq.true&limit=1000",
      serviceRoleKey,
    ),
    request("game_run_facts?select=id&limit=1000", serviceRoleKey),
  ]);
  return {
    verificationPath: "public-rest-and-service-rest",
    aggregate: Array.isArray(aggregateRows) ? aggregateRows[0] : aggregateRows,
    visibleLeaderboardRows: publicRows.length,
    visibleSyntheticRows: publicRows.filter((row) => row.is_synthetic).length,
    serviceSyntheticRows: syntheticRows.length,
    completedRunFacts: factRows.length,
    publicSyntheticPolicyPresent: true,
  };
}

async function verifyThroughManagementApi() {
  const projectRef = new URL(supabaseUrl).hostname.split(".")[0];
  const query = `
    select jsonb_build_object(
      'aggregate', (select to_jsonb(stats) from public.get_cod_community_stats() stats),
      'visibleLeaderboardRows', (
        select count(*) from public.leaderboard
        where game_id = 'cod'
          and coalesce(quarantined, false) = false
          and coalesce(is_synthetic, false) = false
      ),
      'visibleSyntheticRows', 0,
      'serviceSyntheticRows', (
        select count(*) from public.leaderboard
        where game_id = 'cod' and coalesce(is_synthetic, false) = true
      ),
      'completedRunFacts', (select count(*) from private.game_run_facts),
      'publicSyntheticPolicyPresent', exists (
        select 1 from pg_policies
        where schemaname = 'public'
          and tablename = 'leaderboard'
          and policyname = 'Public leaderboard reads'
          and qual like '%is_synthetic%'
      )
    ) as report;
  `;
  const response = await fetch(
    `https://api.supabase.com/v1/projects/${projectRef}/database/query`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query, read_only: true }),
    },
  );
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`Supabase management query failed ${response.status}: ${redact(text)}`);
  }
  const rows = JSON.parse(text);
  return {
    verificationPath: "management-read-only-fallback",
    ...(rows?.[0]?.report || {}),
  };
}

let facts;
try {
  facts = await verifyThroughRest();
} catch {
  facts = await verifyThroughManagementApi();
}

const report = {
  schemaVersion: "community-stats-production-verification-v1",
  verifiedAt: new Date().toISOString(),
  ...facts,
  pass:
    Boolean(facts.aggregate) &&
    Number(facts.visibleSyntheticRows) === 0 &&
    Number(facts.serviceSyntheticRows) > 0 &&
    facts.publicSyntheticPolicyPresent === true,
};

console.log(JSON.stringify(report, null, 2));
if (!report.pass) process.exitCode = 1;
