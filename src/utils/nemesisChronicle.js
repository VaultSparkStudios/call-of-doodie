function safeNumber(value) { return Number.isFinite(Number(value)) ? Number(value) : 0; }

export function buildNemesisChronicle({ career = {}, rivalryHistory = [], enemyTypes = [] } = {}) {
  const deaths = Array.isArray(career.recentDeathsByEnemy) ? career.recentDeathsByEnemy.slice(0, 12) : [];
  const counts = new Map();
  deaths.forEach((death) => counts.set(String(death?.t ?? "unknown"), (counts.get(String(death?.t ?? "unknown")) || 0) + 1));
  const [type = "unknown", losses = 0] = [...counts.entries()].sort((a, b) => b[1] - a[1])[0] || [];
  const enemy = enemyTypes[Number(type)] || null;
  const unpaidRival = rivalryHistory.find((entry) => entry?.won === false && entry.seed);
  const threat = losses >= 3 ? "ARCH-NEMESIS" : losses >= 2 ? "REPEAT OFFENDER" : losses ? "PERSON OF INTEREST" : "NO CASE FILE";
  const chapter = Math.min(3, Math.max(1, losses));
  return {
    schemaVersion: "nemesis-chronicle-v1",
    threat,
    chapter,
    title: enemy?.name || (unpaidRival ? `Rival @${unpaidRival.vsName || "unknown"}` : "No nemesis identified"),
    losses,
    detail: losses
      ? `${losses} of the last ${deaths.length} recorded defeats trace to this threat. Chapter ${chapter}/3 is active.`
      : "Complete a run to begin a local three-chapter rivalry dossier.",
    counterMove: enemy?.tip || (unpaidRival ? `Return to seed #${unpaidRival.seed} and close the ${Math.abs(safeNumber(unpaidRival.delta)).toLocaleString()}-point gap.` : "Survive, inspect the verdict, then replay the evidence."),
    cosmeticSignal: losses >= 3 ? "Nemesis dossier border earned" : `${Math.max(0, 3 - losses)} encounter${3 - losses === 1 ? "" : "s"} until dossier border`,
    agentProjection: { type, losses, chapter, unresolvedRivalrySeed: unpaidRival?.seed || null },
  };
}
