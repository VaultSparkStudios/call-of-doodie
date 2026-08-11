export function assessLeaderboardRow(row = {}) {
  const flags = [];
  const score = Number(row.score || 0);
  const kills = Number(row.kills || 0);
  const wave = Number(row.wave || 0);
  const totalDamage = Number(row.totalDamage || 0);
  const level = Number(row.level || 0);

  if (wave < 1) flags.push({ code: "wave-zero", severity: "high", detail: "wave=0 at submission" });
  if (kills > 0 && wave > 0 && kills / wave > 120) flags.push({ code: "kills-per-wave", severity: "high", detail: `kills/wave=${(kills / wave).toFixed(0)} > 120` });
  if (kills > 0 && score / kills > 5000) flags.push({ code: "score-per-kill", severity: "high", detail: `score/kill=${(score / kills).toFixed(0)} > 5000` });
  if (kills > 5 && totalDamage < kills * 20) flags.push({ code: "damage-too-low", severity: "high", detail: `damage/kill=${(totalDamage / kills).toFixed(0)} < 20` });
  if (kills > 5 && totalDamage > kills * 20000) flags.push({ code: "damage-too-high", severity: "high", detail: `damage/kill=${(totalDamage / kills).toFixed(0)} > 20000` });
  // Loosened 2026-08-10 (Session 148): wave*3+5 false-positived on a legitimate elite
  // run (score 1,063,334, "level-velocity") — account level isn't tightly coupled to
  // in-run wave count for efficient/meta-progressed players. See
  // supabase/migrations/2026-08-10_leaderboard_unquarantine_review.sql.
  if (wave > 0 && level > wave * 4 + 10) flags.push({ code: "level-velocity", severity: "high", detail: `level ${level} vs wave ${wave} — levelled implausibly fast` });

  return {
    flags,
    severity: flags.some((flag) => flag.severity === "high") ? "high" : flags.length ? "review" : "clear",
    reason: flags.map((flag) => flag.code).join(","),
  };
}

export function buildTrustReceipt({ action, row, assessment, at = new Date().toISOString() }) {
  return {
    schemaVersion: "leaderboard-trust-v1",
    at,
    action,
    rowId: row.id,
    callsign: String(row.name || "?").slice(0, 24),
    score: Number(row.score || 0),
    severity: assessment.severity,
    reasonCodes: assessment.flags.map((flag) => flag.code),
  };
}
