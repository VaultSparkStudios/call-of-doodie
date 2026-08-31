// Act classification + turning-point detection for the death screen RUN ARC card.

function classifyAct(wave) {
  if (wave >= 35) return { act: "THE LEGEND", desc: "You pushed into territory most players never see." };
  if (wave >= 25) return { act: "THE PUSH", desc: "Past the mid-game wall — the run had real legs." };
  if (wave >= 10) return { act: "THE GRIND", desc: "The build came online but the pressure kept rising." };
  return { act: "THE OPENER", desc: "The run ended before the build found its identity." };
}

export function getRunAct(wave) {
  return classifyAct(wave).act;
}

export function buildRunNarrative({
  wave = 1,
  score: _score = 0,
  kills: _kills = 0,
  bestStreak = 0,
  nearDeathEvents = [],
  precisionPeakStreak = 0,
  bossKillCount = 0,
  flowStateFired = 0,
  timeSurvived: _timeSurvived = 0,
  noHitWaves = 0,
  grenadeKills = 0,
  topWeapon = null,
} = {}) {
  const { act, desc: actDesc } = classifyAct(wave);
  const moments = [];
  const safeNearDeathEvents = Array.isArray(nearDeathEvents) ? nearDeathEvents : [];

  // 1. Near-death survival — highest narrative weight
  if (safeNearDeathEvents.length >= 1) {
    const first = safeNearDeathEvents[0];
    moments.push({
      label: "LAST STAND",
      desc: `Dropped to ${first.hpLeft} HP on wave ${first.wave}${safeNearDeathEvents.length > 1 ? ` (${safeNearDeathEvents.length}× total near-deaths)` : ""}.`,
    });
  }

  // 2. Precision / aim mastery
  if (precisionPeakStreak >= 5) {
    const flowNote = flowStateFired > 0 ? ` — triggered FLOW STATE ${flowStateFired}×` : "";
    moments.push({
      label: "AIM LOCKED",
      desc: `Peak ${precisionPeakStreak}× precision streak${flowNote}.`,
    });
  }

  // 3. Boss kills — shows run depth
  if (bossKillCount >= 1) {
    moments.push({
      label: bossKillCount >= 3 ? "BOSS HUNTER" : "BOSS SLAYER",
      desc: `${bossKillCount} boss${bossKillCount === 1 ? "" : "es"} defeated including phase-two pressure.`,
    });
  }

  // 4. Perfect waves — no damage taken on at least 2 waves
  if (moments.length < 3 && noHitWaves >= 2) {
    moments.push({
      label: "FLAWLESS",
      desc: `${noHitWaves} wave${noHitWaves === 1 ? "" : "s"} survived without taking damage.`,
    });
  }

  // 5. Weapon dominance — one weapon accounts for ≥60% of kills with meaningful sample
  if (moments.length < 3 && topWeapon && topWeapon.kills >= 5 && topWeapon.share >= 0.6) {
    moments.push({
      label: "WEAPON SPECIALIST",
      desc: `${String(topWeapon.name).toUpperCase()} responsible for ${topWeapon.kills} kills (${Math.round(topWeapon.share * 100)}% of run).`,
    });
  }

  // 6. Grenade mastery — high grenade kill contribution
  if (moments.length < 3 && grenadeKills >= 4) {
    moments.push({
      label: "DEMOLITION",
      desc: `${grenadeKills} kills via grenades — explosive output paid off.`,
    });
  }

  // 7. Streak fallback — fills the card when higher-priority moments leave room
  if (moments.length < 3 && bestStreak >= 20) {
    moments.push({
      label: "CHAIN REACTION",
      desc: `${bestStreak}-kill streak at peak momentum.`,
    });
  }

  return { act, actDesc, moments: moments.slice(0, 3) };
}
