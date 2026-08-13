import { createClient } from "@supabase/supabase-js";
import { resolveProjectSupabasePublicConfig } from "./lib/project-supabase-config.mjs";

async function getClient() {
  const { supabaseUrl, anonKey } = await resolveProjectSupabasePublicConfig();
  return createClient(supabaseUrl, anonKey, { realtime: { enabled: false } });
}

async function main() {
  const supabase = await getClient();

  const { data, error } = await supabase
    .from("leaderboard")
    .select("game_id,name,score,mode,created_at")
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) throw error;

  const rows = data || [];
  if (rows.length === 0) {
    console.log("Shared leaderboard check: no readable rows returned.");
    return;
  }

  const counts = new Map();
  for (const row of rows) {
    const gameId = row.game_id || "cod";
    counts.set(gameId, (counts.get(gameId) || 0) + 1);
  }

  console.log("Shared leaderboard check: latest readable rows by game_id");
  for (const [gameId, count] of [...counts.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`- ${gameId}: ${count}`);
  }

  const otherGameIds = [...counts.keys()].filter((gameId) => gameId !== "cod");
  if (otherGameIds.length === 0) {
    console.log("PASS no non-cod rows found in the latest 200 readable entries; no shared-table collision observed.");
    return;
  }

  for (const gameId of otherGameIds) {
    const { data: sampleRows, error: sampleError } = await supabase
      .from("leaderboard")
      .select("game_id,name,score,mode,created_at")
      .eq("game_id", gameId)
      .order("created_at", { ascending: false })
      .limit(3);

    if (sampleError) throw sampleError;
    if (!sampleRows?.length) {
      throw new Error(`Expected readable sample rows for game_id "${gameId}" but none were returned.`);
    }

    console.log(`PASS readable sample for ${gameId}:`);
    for (const row of sampleRows) {
      console.log(`  ${row.created_at} | ${row.name} | ${row.score} | ${row.mode ?? "normal"}`);
    }
  }

  console.log("Shared leaderboard check complete: read compatibility confirmed for visible non-cod rows.");
  console.log("Note: this is a read-side audit. Cross-project write-path verification still requires each app's own submission flow.");
}

main().catch((error) => {
  console.error(`Shared leaderboard check failed: ${error.message}`);
  process.exitCode = 1;
});
