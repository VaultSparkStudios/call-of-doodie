import { ENEMY_TYPES, WEAPONS } from "../constants.js";
import { buildProgressionRunway, describeProgressionRunway } from "./progressionCurve.js";

function addInsight(list, insight) {
  if (insight?.title && insight?.detail) list.push(insight);
}

function topCount(entries) {
  let best = null;
  for (const [key, count] of entries) {
    if (!best || count > best.count) best = { key, count };
  }
  return best;
}

export function buildLocalBalanceLab({ runHistory = [], studioEvents = [], career = {}, meta = {} } = {}) {
  const insights = [];
  const runs = Array.isArray(runHistory) ? runHistory : [];
  const events = Array.isArray(studioEvents) ? studioEvents : [];

  const waveDeaths = new Map();
  for (const run of runs) {
    const wave = Number(run?.wave || run?.finalWave || 0);
    if (wave > 0) waveDeaths.set(wave, (waveDeaths.get(wave) || 0) + 1);
  }
  const topWave = topCount(waveDeaths.entries());
  if (topWave && topWave.count >= 2) {
    addInsight(insights, {
      id: "repeat_wave_deaths",
      severity: topWave.count >= 4 ? "high" : "medium",
      title: `Wave ${topWave.key} is repeating`,
      detail: `${topWave.count} recent runs ended around wave ${topWave.key}. Treat that wave as the next tuning or coaching checkpoint.`,
    });
  }

  const pressureRuns = runs.filter((run) => run?.pressureReceipt?.schemaVersion === "pressure-arc-v1");
  const overrunFinishes = pressureRuns.filter((run) => run.pressureReceipt.collapseBand === "overrun").length;
  if (pressureRuns.length >= 2 && overrunFinishes >= 2) {
    addInsight(insights, {
      id: "pressure_arc",
      severity: overrunFinishes >= 4 ? "high" : "medium",
      title: "Repeated overrun finish",
      detail: `${overrunFinishes} of ${pressureRuns.length} pressure-instrumented runs ended with an observed overrun band. Review those run receipts before changing enemy counts; the band does not prove the cause of death.`,
    });
  }

  const recentDeaths = Array.isArray(career?.recentDeathsByEnemy) ? career.recentDeathsByEnemy : [];
  const killerCounts = new Map();
  for (const death of recentDeaths) {
    const type = Number(death?.t);
    if (Number.isFinite(type)) killerCounts.set(type, (killerCounts.get(type) || 0) + 1);
  }
  const topKiller = topCount(killerCounts.entries());
  if (topKiller && topKiller.count >= 2) {
    const enemy = ENEMY_TYPES[topKiller.key];
    addInsight(insights, {
      id: "repeat_killer",
      severity: topKiller.count >= 4 ? "high" : "medium",
      title: `${enemy?.name || `Enemy #${topKiller.key}`} pressure`,
      detail: `${topKiller.count} recent deaths point at the same threat. Prioritize telegraph clarity or a Most Wanted drill before adding new enemy content.`,
    });
  }

  const abandonCounts = new Map();
  for (const event of events) {
    const type = event?.type || event?.eventType || event?.name;
    if (type !== "mode_abandon") continue;
    const mode = event?.payload?.mode || event?.mode || "unknown";
    abandonCounts.set(mode, (abandonCounts.get(mode) || 0) + 1);
  }
  const topAbandon = topCount(abandonCounts.entries());
  if (topAbandon) {
    addInsight(insights, {
      id: "mode_abandon",
      severity: topAbandon.count >= 3 ? "high" : "low",
      title: `${String(topAbandon.key).replace(/_/g, " ")} abandon signal`,
      detail: `${topAbandon.count} local abandon event${topAbandon.count === 1 ? "" : "s"} found. Check whether briefing, difficulty, or first-wave pressure is mismatched.`,
    });
  }

  const weaponKills = Array.isArray(career?.weaponKills) ? career.weaponKills : [];
  const totalWeaponKills = weaponKills.reduce((sum, value) => sum + (value || 0), 0);
  if (totalWeaponKills >= 50) {
    const unused = weaponKills
      .map((kills, index) => ({ kills: kills || 0, weapon: WEAPONS[index] }))
      .filter((entry) => entry.weapon && entry.kills / totalWeaponKills < 0.02)
      .slice(0, 3);
    if (unused.length > 0) {
      addInsight(insights, {
        id: "underused_weapons",
        severity: "low",
        title: "Underused arsenal",
        detail: `${unused.map((entry) => entry.weapon.name).join(", ")} barely appear in local career kills. Consider better shop prompts before adding new weapons.`,
      });
    }
  }

  if (Number(career?.totalKills || 0) > 0 || Number(meta?.careerPoints || 0) > 0) {
    const runway = buildProgressionRunway({
      totalKills: career?.totalKills,
      careerPoints: meta?.careerPoints,
      upgradeTiers: meta?.upgradeTiers,
    });
    addInsight(insights, {
      id: "progression_runway",
      severity: "low",
      title: `Level ${runway.current.accountLevel} runway`,
      detail: describeProgressionRunway(runway),
      receipt: runway,
    });
  }

  return {
    status: insights.length > 0 ? "signals-found" : "quiet",
    inspected: {
      runs: runs.length,
      events: events.length,
      recentDeaths: recentDeaths.length,
      progression: Number(career?.totalKills || 0) > 0 || Number(meta?.careerPoints || 0) > 0,
      pressureRuns: pressureRuns.length,
    },
    insights,
    topInsight: insights[0] || {
      id: "quiet",
      severity: "low",
      title: "No strong local balance signal",
      detail: "Recent local runs do not show a repeated death wave, killer, abandoned mode, or underused-weapon pattern yet.",
    },
  };
}
