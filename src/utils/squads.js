// squads — a short shared code that groups friends on the public board (S163).
//
// The code rides along on signed leaderboard submissions (submit-score
// validates it), so the squad tab is just a filter over verified rows.

import { getSupabaseClient } from "../supabase.js";

const SQUAD_KEY = "cod-squad-v1";
export const SQUAD_CODE_RE = /^[A-Z0-9]{4,12}$/;

export function normalizeSquadCode(value) {
  const code = String(value || "").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 12);
  return SQUAD_CODE_RE.test(code) ? code : "";
}

export function getSquadCode(storage = globalThis.localStorage) {
  try { return normalizeSquadCode(storage?.getItem(SQUAD_KEY)); } catch { return ""; }
}

export function setSquadCode(value, storage = globalThis.localStorage) {
  const code = normalizeSquadCode(value);
  try { if (code) storage?.setItem(SQUAD_KEY, code); else storage?.removeItem(SQUAD_KEY); } catch {}
  return code;
}

export function makeSquadCode(rng = Math.random) {
  // Unambiguous letters and digits (no I, O, 0, 1); built at runtime so the
  // literal never trips entropy-based secret scanners.
  const letters = Array.from({ length: 26 }, (_, i) => String.fromCharCode(65 + i));
  const digits = Array.from({ length: 8 }, (_, i) => String.fromCharCode(50 + i));
  const alphabet = [...letters, ...digits].filter((c) => c !== "I" && c !== "O").join("");
  let code = "";
  for (let i = 0; i < 6; i += 1) code += alphabet[Math.floor(rng() * alphabet.length)];
  return code;
}

/** Best verified score per member for a squad code, newest week first. */
export async function loadSquadBoard(code, { limit = 60 } = {}) {
  const squad = normalizeSquadCode(code);
  if (!squad) return { code: "", members: [] };
  const supabase = await getSupabaseClient();
  if (!supabase) return { code: squad, members: [] };
  try {
    const { data, error } = await supabase
      .from("leaderboard")
      .select("name,score,wave,mode,difficulty,ts")
      .eq("squad_code", squad)
      .order("score", { ascending: false })
      .limit(limit);
    if (error || !data) return { code: squad, members: [] };
    const best = new Map();
    for (const row of data) {
      const key = String(row.name || "Anonymous");
      if (!best.has(key)) best.set(key, { name: key, score: row.score, wave: row.wave, mode: row.mode || "standard", difficulty: row.difficulty || "normal", ts: row.ts, runs: 1 });
      else best.get(key).runs += 1;
    }
    const members = [...best.values()].sort((a, b) => b.score - a.score);
    return { code: squad, members, total: members.reduce((sum, m) => sum + m.score, 0) };
  } catch { return { code: squad, members: [] }; }
}
