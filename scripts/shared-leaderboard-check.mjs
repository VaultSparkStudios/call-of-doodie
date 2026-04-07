import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

function loadDotEnv(filePath) {
  if (!fs.existsSync(filePath)) return;
  const contents = fs.readFileSync(filePath, "utf8");
  for (const rawLine of contents.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eqIndex = line.indexOf("=");
    if (eqIndex === -1) continue;
    const key = line.slice(0, eqIndex).trim();
    const value = line.slice(eqIndex + 1).trim();
    if (!process.env[key]) process.env[key] = value;
  }
}

function getClient() {
  loadDotEnv(path.join(process.cwd(), ".env.local"));

  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const anonKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !anonKey) {
    throw new Error("Missing VITE_SUPABASE_URL/SUPABASE_URL or VITE_SUPABASE_ANON_KEY/SUPABASE_ANON_KEY.");
  }

  return createClient(supabaseUrl, anonKey, { realtime: { enabled: false } });
}

async function main() {
  const supabase = getClient();

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
